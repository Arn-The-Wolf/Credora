package com.credora.service;

import com.credora.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.Map;

@Service
public class SmsService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${credora.sms.mode:sandbox}")
    private String smsMode;

    @Value("${credora.sms.africastalking-api-key:}")
    private String apiKey;

    @Value("${credora.sms.africastalking-username:}")
    private String username;

    @Value("${credora.sms.sender-id:CREDORA}")
    private String senderId;

    public void sendOtp(String phone, String code) {
        String message = "Your Credora verification code is " + code + ". Valid for 10 minutes. Do not share.";
        if ("africastalking".equals(smsMode)) {
            sendViaAfricaTalking(phone, message);
        } else {
            org.slf4j.LoggerFactory.getLogger(SmsService.class)
                    .info("[SMS Sandbox] OTP {} to {}", code, phone);
        }
    }

    public void sendNotification(String phone, String message) {
        if ("africastalking".equals(smsMode)) {
            sendViaAfricaTalking(phone, message);
        }
    }

    private void sendViaAfricaTalking(String phone, String message) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("apiKey", apiKey);
        headers.set("Accept", "application/json");

        String body = "username=" + username + "&to=" + phone + "&message=" + message
                + "&from=" + senderId;

        restTemplate.exchange(
                "https://api.africastalking.com/version1/messaging",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                String.class);
    }
}
