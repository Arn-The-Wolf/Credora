package com.credora.controller;

import com.credora.dto.ApplicationDtos;
import com.credora.dto.AuthDtos;
import com.credora.dto.DashboardDtos;
import com.credora.dto.ReportDtos;
import com.credora.model.Loan;
import com.credora.repository.UserRepository;
import com.credora.service.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
public class ApplicationController {

    private final ApplicationService applicationService;
    private final LoanPaymentService loanPaymentService;
    private final ReminderSchedulerService reminderSchedulerService;
    private final NotificationService notificationService;
    private final MpesaService mpesaService;
    private final UserRepository userRepository;

    public ApplicationController(ApplicationService applicationService,
                                 LoanPaymentService loanPaymentService,
                                 ReminderSchedulerService reminderSchedulerService,
                                 NotificationService notificationService,
                                 MpesaService mpesaService,
                                 UserRepository userRepository) {
        this.applicationService = applicationService;
        this.loanPaymentService = loanPaymentService;
        this.reminderSchedulerService = reminderSchedulerService;
        this.notificationService = notificationService;
        this.mpesaService = mpesaService;
        this.userRepository = userRepository;
    }

    private Long getUserId(Authentication auth) {
        return (Long) auth.getDetails();
    }

    @PostMapping("/applications")
    public ResponseEntity<ApplicationDtos.ApplicationResponse> create(
            Authentication auth,
            @Valid @RequestBody ApplicationDtos.CreateApplicationRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.createApplication(getUserId(auth), req));
    }

    @GetMapping("/applications")
    public List<ApplicationDtos.ApplicationResponse> list(Authentication auth) {
        return applicationService.getUserApplications(getUserId(auth));
    }

    @GetMapping("/applications/{id}")
    public ApplicationDtos.ApplicationResponse get(Authentication auth, @PathVariable Long id) {
        return applicationService.getApplication(getUserId(auth), id);
    }

    @GetMapping("/dashboard/summary")
    public DashboardDtos.DashboardSummary dashboard(Authentication auth) {
        return applicationService.getApplicantDashboard(getUserId(auth));
    }

    @GetMapping("/loans")
    public List<DashboardDtos.LoanResponse> loans(
            Authentication auth,
            @RequestParam(defaultValue = "all") String status) {
        return applicationService.getUserLoans(getUserId(auth), status);
    }

    @PostMapping("/loans/{id}/payments")
    public ReportDtos.PaymentResponse makePayment(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody ReportDtos.PaymentRequest req) {
        return loanPaymentService.makePayment(getUserId(auth), id, req);
    }

    @PostMapping("/loans/{id}/payments/mpesa")
    public Map<String, Object> mpesaPayment(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody ReportDtos.StkPushRequest req) {
        BigDecimal amount = req.getAmount() != null ? new BigDecimal(req.getAmount().replace(",", "")) : null;
        return mpesaService.initiateStkPush(getUserId(auth), id, req.getPhoneNumber(), amount);
    }

    @PostMapping("/loans/{id}/payments/mpesa/simulate")
    public Map<String, String> simulateMpesa(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        mpesaService.simulateSandboxPayment(body.get("checkoutRequestId"));
        return Map.of("status", "COMPLETED");
    }

    @GetMapping("/loans/{id}/payments")
    public List<ReportDtos.PaymentResponse> getPayments(Authentication auth, @PathVariable Long id) {
        return loanPaymentService.getPayments(getUserId(auth), id);
    }

    @GetMapping("/loans/{id}/schedule")
    public List<ReportDtos.ScheduleEntry> getSchedule(Authentication auth, @PathVariable Long id) {
        return loanPaymentService.getSchedule(getUserId(auth), id);
    }

    @PatchMapping("/loans/{id}/autopay")
    public DashboardDtos.LoanResponse setAutoPay(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody ReportDtos.AutoPayRequest req) {
        return loanPaymentService.setAutoPay(getUserId(auth), id, req.isEnabled());
    }

    @GetMapping("/notifications")
    public List<ReportDtos.NotificationResponse> notifications(Authentication auth) {
        Long userId = getUserId(auth);
        var user = userRepository.findById(userId).orElseThrow();
        List<ReportDtos.NotificationResponse> all = new ArrayList<>();
        notificationService.listForUser(user).forEach(n -> {
            ReportDtos.NotificationResponse r = new ReportDtos.NotificationResponse();
            r.setId(n.getId());
            r.setTitle(n.getTitle());
            r.setMessage(n.getMessage());
            r.setCategory(n.getCategory());
            r.setRead(n.isRead());
            r.setCreatedAt(n.getCreatedAt());
            all.add(r);
        });
        all.addAll(reminderSchedulerService.getUserNotifications(userId));
        return all;
    }

    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markRead(Authentication auth, @PathVariable Long id) {
        notificationService.markRead(getUserId(auth), id);
        return ResponseEntity.noContent().build();
    }
}
