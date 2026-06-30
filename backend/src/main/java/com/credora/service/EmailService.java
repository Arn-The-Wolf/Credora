package com.credora.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${credora.email.mode:console}")
    private String emailMode;

    @Value("${credora.email.from:noreply@credora.test}")
    private String fromAddress;

    @Value("${credora.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void send(String to, String subject, String body) {
        if ("console".equals(emailMode)) {
            log.info("[EMAIL] To: {} | Subject: {} | Body: {}", to, subject, body);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromAddress);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    public void sendVerificationEmail(String to, String token) {
        String link = frontendUrl + "/auth/verify-email?token=" + token;
        send(to, "Verify your Credora account",
                "Welcome to Credora!\n\nVerify your email:\n" + link + "\n\nLink expires in 24 hours.");
    }

    public void sendPasswordResetEmail(String to, String token) {
        String link = frontendUrl + "/auth/reset-password?token=" + token;
        send(to, "Reset your Credora password",
                "Reset your password:\n" + link + "\n\nLink expires in 1 hour. If you did not request this, ignore this email.");
    }

    public void sendApplicationStatusEmail(String to, String ref, String status, String message) {
        send(to, "Loan application " + ref + " — " + status,
                "Your application " + ref + " status: " + status + "\n\n" + message);
    }

    public void sendPaymentReminderEmail(String to, String loanRef, String amount, String dueDate) {
        send(to, "Payment reminder — " + loanRef,
                "Your payment of KES " + amount + " for loan " + loanRef + " is due on " + dueDate + ".");
    }
}
