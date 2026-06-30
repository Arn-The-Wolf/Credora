package com.credora.controller;

import com.credora.dto.AuthDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final com.credora.service.AuthService authService;

    public AuthController(com.credora.service.AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthDtos.MessageResponse> signupApplicant(@Valid @RequestBody AuthDtos.ApplicantSignupRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signupApplicant(req));
    }

    @PostMapping("/signup-institution")
    public ResponseEntity<AuthDtos.AuthResponse> signupInstitution(@Valid @RequestBody AuthDtos.InstitutionSignupRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signupInstitution(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.AuthResponse> loginApplicant(@Valid @RequestBody AuthDtos.LoginRequest req) {
        return ResponseEntity.ok(authService.loginApplicant(req));
    }

    @PostMapping("/login-institution")
    public ResponseEntity<AuthDtos.AuthResponse> loginInstitution(@Valid @RequestBody AuthDtos.LoginRequest req) {
        return ResponseEntity.ok(authService.loginInstitution(req));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthDtos.AuthResponse> googleAuth(@Valid @RequestBody AuthDtos.GoogleAuthRequest req) {
        return ResponseEntity.ok(authService.googleAuth(req));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<AuthDtos.MessageResponse> verifyEmail(@Valid @RequestBody AuthDtos.VerifyEmailRequest req) {
        return ResponseEntity.ok(authService.verifyEmail(req));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<AuthDtos.MessageResponse> forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest req) {
        return ResponseEntity.ok(authService.forgotPassword(req));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthDtos.MessageResponse> resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest req) {
        return ResponseEntity.ok(authService.resetPassword(req));
    }

    @PatchMapping("/profile")
    public ResponseEntity<AuthDtos.UserResponse> updateProfile(
            org.springframework.security.core.Authentication auth,
            @RequestBody AuthDtos.ProfileUpdateRequest req) {
        Long userId = (Long) auth.getDetails();
        return ResponseEntity.ok(authService.updateProfile(userId, req));
    }

    @DeleteMapping("/account")
    public ResponseEntity<AuthDtos.MessageResponse> deleteAccount(org.springframework.security.core.Authentication auth) {
        Long userId = (Long) auth.getDetails();
        return ResponseEntity.ok(authService.deleteAccount(userId));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(org.springframework.security.core.Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long entityId = (Long) auth.getDetails();
        boolean isInstitution = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_INSTITUTION"));
        if (isInstitution) {
            return ResponseEntity.ok(authService.getInstitution(entityId));
        }
        return ResponseEntity.ok(authService.getUser(entityId));
    }
}
