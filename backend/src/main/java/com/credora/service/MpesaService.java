package com.credora.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.credora.model.Loan;
import com.credora.model.PaymentTransaction;
import com.credora.model.User;
import com.credora.repository.LoanRepository;
import com.credora.repository.PaymentTransactionRepository;
import com.credora.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class MpesaService {

    private static final Logger log = LoggerFactory.getLogger(MpesaService.class);
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PaymentTransactionRepository txRepository;
    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final LoanPaymentService loanPaymentService;
    private final NotificationService notificationService;

    @Value("${credora.mpesa.mode:sandbox}")
    private String mpesaMode;

    @Value("${credora.mpesa.consumer-key:}")
    private String consumerKey;

    @Value("${credora.mpesa.consumer-secret:}")
    private String consumerSecret;

    @Value("${credora.mpesa.shortcode:174379}")
    private String shortcode;

    @Value("${credora.mpesa.passkey:}")
    private String passkey;

    @Value("${credora.mpesa.callback-url:http://localhost:8080/webhooks/mpesa}")
    private String callbackUrl;

    @Value("${credora.mpesa.base-url:https://sandbox.safaricom.co.ke}")
    private String baseUrl;

    public MpesaService(PaymentTransactionRepository txRepository, LoanRepository loanRepository,
                        UserRepository userRepository, LoanPaymentService loanPaymentService,
                        NotificationService notificationService) {
        this.txRepository = txRepository;
        this.loanRepository = loanRepository;
        this.userRepository = userRepository;
        this.loanPaymentService = loanPaymentService;
        this.notificationService = notificationService;
    }

    @Transactional
    public Map<String, Object> initiateStkPush(Long userId, Long loanId, String phone, BigDecimal amount) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Loan not found"));
        if (!loan.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        if (!"ACTIVE".equals(loan.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loan is not active");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            amount = loan.getMonthlyPayment();
        }

        String normalizedPhone = normalizeKenyaPhone(phone != null ? phone : user.getPhoneNumber());
        PaymentTransaction tx = new PaymentTransaction();
        tx.setLoan(loan);
        tx.setUser(user);
        tx.setAmount(amount);
        tx.setProvider("MPESA");
        tx.setTransactionType("REPAYMENT");
        tx.setPhoneNumber(normalizedPhone);
        tx.setStatus("PENDING");

        if ("sandbox".equals(mpesaMode)) {
            String checkoutId = "ws_CO_" + UUID.randomUUID().toString().substring(0, 12);
            tx.setCheckoutRequestId(checkoutId);
            tx.setMerchantRequestId("mr_" + UUID.randomUUID().toString().substring(0, 8));
            txRepository.save(tx);
            log.info("[M-Pesa Sandbox] STK push simulated checkout={} phone={} amount={}", checkoutId, normalizedPhone, amount);
            return Map.of(
                    "checkoutRequestId", checkoutId,
                    "merchantRequestId", tx.getMerchantRequestId(),
                    "message", "STK push initiated (sandbox). Payment will auto-complete in demo mode.",
                    "sandboxSimulate", true
            );
        }

        String token = getAccessToken();
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        String password = Base64.getEncoder().encodeToString((shortcode + passkey + timestamp).getBytes(StandardCharsets.UTF_8));

        Map<String, Object> body = new HashMap<>();
        body.put("BusinessShortCode", shortcode);
        body.put("Password", password);
        body.put("Timestamp", timestamp);
        body.put("TransactionType", "CustomerPayBillOnline");
        body.put("Amount", amount.intValue());
        body.put("PartyA", normalizedPhone);
        body.put("PartyB", shortcode);
        body.put("PhoneNumber", normalizedPhone);
        body.put("CallBackURL", callbackUrl);
        body.put("AccountReference", loan.getReferenceId());
        body.put("TransactionDesc", "Credora loan payment");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> resp = restTemplate.exchange(
                baseUrl + "/mpesa/stkpush/v1/processrequest",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class);

        try {
            JsonNode json = objectMapper.readTree(resp.getBody());
            tx.setCheckoutRequestId(json.path("CheckoutRequestID").asText());
            tx.setMerchantRequestId(json.path("MerchantRequestID").asText());
            txRepository.save(tx);
            return Map.of(
                    "checkoutRequestId", tx.getCheckoutRequestId(),
                    "merchantRequestId", tx.getMerchantRequestId(),
                    "message", json.path("ResponseDescription").asText("STK push initiated")
            );
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "M-Pesa STK push failed");
        }
    }

    @Transactional
    public void handleCallback(String rawBody) {
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            JsonNode stk = root.path("Body").path("stkCallback");
            String checkoutId = stk.path("CheckoutRequestID").asText();
            int resultCode = stk.path("ResultCode").asInt(1);

            PaymentTransaction tx = txRepository.findByCheckoutRequestId(checkoutId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
            tx.setRawCallback(rawBody);

            if (resultCode == 0) {
                tx.setStatus("COMPLETED");
                tx.setCompletedAt(Instant.now());
                stk.path("CallbackMetadata").path("Item").forEach(item -> {
                    if ("MpesaReceiptNumber".equals(item.path("Name").asText())) {
                        tx.setExternalId(item.path("Value").asText());
                    }
                });
                txRepository.save(tx);
                if (tx.getLoan() != null && tx.getUser() != null) {
                    loanPaymentService.applyExternalPayment(tx.getUser().getId(), tx.getLoan().getId(),
                            tx.getAmount(), tx.getExternalId(), "MPESA");
                    notificationService.notify(tx.getUser(), "Payment received",
                            "Your M-Pesa payment of KES " + tx.getAmount() + " was received.", "PAYMENT");
                }
            } else {
                tx.setStatus("FAILED");
                txRepository.save(tx);
            }
        } catch (Exception e) {
            log.error("M-Pesa callback error: {}", e.getMessage());
        }
    }

    /** Sandbox: simulate successful STK callback */
    @Transactional
    public void simulateSandboxPayment(String checkoutRequestId) {
        PaymentTransaction tx = txRepository.findByCheckoutRequestId(checkoutRequestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        tx.setStatus("COMPLETED");
        tx.setExternalId("SANDBOX" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        tx.setCompletedAt(Instant.now());
        txRepository.save(tx);
        if (tx.getLoan() != null && tx.getUser() != null) {
            loanPaymentService.applyExternalPayment(tx.getUser().getId(), tx.getLoan().getId(),
                    tx.getAmount(), tx.getExternalId(), "MPESA");
            notificationService.notify(tx.getUser(), "Payment received",
                    "Your M-Pesa payment of KES " + tx.getAmount() + " was received.", "PAYMENT");
        }
    }

    private String getAccessToken() {
        String creds = Base64.getEncoder().encodeToString((consumerKey + ":" + consumerSecret).getBytes(StandardCharsets.UTF_8));
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + creds);
        ResponseEntity<String> resp = restTemplate.exchange(
                baseUrl + "/oauth/v1/generate?grant_type=client_credentials",
                HttpMethod.GET, new HttpEntity<>(headers), String.class);
        try {
            return objectMapper.readTree(resp.getBody()).path("access_token").asText();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "M-Pesa auth failed");
        }
    }

    private String normalizeKenyaPhone(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("0")) digits = "254" + digits.substring(1);
        if (!digits.startsWith("254")) digits = "254" + digits;
        return digits;
    }
}
