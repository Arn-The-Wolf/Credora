package com.credora.service;

import com.credora.dto.AuthDtos;
import com.credora.model.Institution;
import com.credora.model.InstitutionRole;
import com.credora.model.User;
import com.credora.repository.InstitutionRepository;
import com.credora.repository.UserRepository;
import com.credora.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern STRONG_PASSWORD = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{10,}$");

    private final UserRepository userRepository;
    private final InstitutionRepository institutionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final TokenService tokenService;
    private final ConsentService consentService;
    private final AuditService auditService;

    @Value("${credora.auth.require-email-verification:true}")
    private boolean requireEmailVerification;

    @Value("${credora.auth.max-login-attempts:5}")
    private int maxLoginAttempts;

    public AuthService(UserRepository userRepository, InstitutionRepository institutionRepository,
                       PasswordEncoder passwordEncoder, JwtUtil jwtUtil, EmailService emailService,
                       TokenService tokenService, ConsentService consentService, AuditService auditService) {
        this.userRepository = userRepository;
        this.institutionRepository = institutionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
        this.tokenService = tokenService;
        this.consentService = consentService;
        this.auditService = auditService;
    }

    @Transactional
    public AuthDtos.MessageResponse signupApplicant(AuthDtos.ApplicantSignupRequest req) {
        validatePassword(req.getPassword());
        if (!Boolean.TRUE.equals(req.getAcceptTerms()) || !Boolean.TRUE.equals(req.getAcceptPrivacy())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Terms and privacy consent required");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = new User();
        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail().toLowerCase().trim());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setPhoneNumber(req.getPhoneNumber());
        user.setAddress(req.getAddress());
        user.setEmploymentStatus(req.getEmploymentStatus());
        user.setMonthlyIncome(parseDecimal(req.getMonthlyIncome()));
        user.setIdPassportNumber(req.getIdPassportNumber());
        user.setEmailVerified(false);
        user.setTermsAcceptedAt(Instant.now());
        user.setPrivacyAcceptedAt(Instant.now());
        user = userRepository.save(user);

        consentService.recordConsent(user, "TERMS", "1.0", null);
        consentService.recordConsent(user, "PRIVACY", "1.0", null);

        String verifyToken = tokenService.createToken(user, "EMAIL_VERIFY", 86400);
        emailService.sendVerificationEmail(user.getEmail(), verifyToken);

        auditService.log("APPLICANT", user.getId(), user.getEmail(), "SIGNUP", "USER", user.getId(), null);
        return new AuthDtos.MessageResponse("Account created. Check your email to verify before signing in.");
    }

    @Transactional
    public AuthDtos.AuthResponse signupInstitution(AuthDtos.InstitutionSignupRequest req) {
        validatePassword(req.getPassword());
        if (institutionRepository.existsByInstitutionEmail(req.getInstitutionEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Institution email already registered");
        }
        Institution inst = new Institution();
        inst.setInstitutionName(req.getInstitutionName());
        inst.setRegistrationLicenseNumber(req.getRegistrationLicenseNumber());
        inst.setContactPersonName(req.getContactPersonName());
        inst.setBusinessAddress(req.getBusinessAddress());
        inst.setInstitutionWebsite(req.getInstitutionWebsite());
        inst.setInstitutionEmail(req.getInstitutionEmail().toLowerCase().trim());
        inst.setPassword(passwordEncoder.encode(req.getPassword()));
        inst.setPhoneNumber(req.getPhoneNumber());
        inst.setRole(institutionRepository.count() == 0 ? InstitutionRole.SUPER_ADMIN : InstitutionRole.LOAN_OFFICER);
        inst = institutionRepository.save(inst);
        auditService.log("INSTITUTION", inst.getId(), inst.getInstitutionEmail(), "SIGNUP", "INSTITUTION", inst.getId(), null);
        return buildInstitutionAuthResponse(inst);
    }

    @Transactional
    public AuthDtos.AuthResponse loginApplicant(AuthDtos.LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        assertNotLocked(user);
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            registerFailedLogin(user);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (requireEmailVerification && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Email not verified. Check your inbox.");
        }
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        auditService.log("APPLICANT", user.getId(), user.getEmail(), "LOGIN", "USER", user.getId(), null);
        return buildApplicantAuthResponse(user);
    }

    @Transactional
    public AuthDtos.AuthResponse loginInstitution(AuthDtos.LoginRequest req) {
        Institution inst = institutionRepository.findByInstitutionEmail(req.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!passwordEncoder.matches(req.getPassword(), inst.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        auditService.log("INSTITUTION", inst.getId(), inst.getInstitutionEmail(), "LOGIN", "INSTITUTION", inst.getId(), null);
        return buildInstitutionAuthResponse(inst);
    }

    @Transactional
    public AuthDtos.AuthResponse googleAuth(AuthDtos.GoogleAuthRequest req) {
        User user = userRepository.findByEmail(req.getEmail().toLowerCase().trim()).orElseGet(() -> {
            User u = new User();
            u.setEmail(req.getEmail().toLowerCase().trim());
            u.setFullName(req.getFullName());
            u.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            u.setEmailVerified(true);
            u.setTermsAcceptedAt(Instant.now());
            u.setPrivacyAcceptedAt(Instant.now());
            return userRepository.save(u);
        });
        if (req.getFullName() != null && !req.getFullName().isBlank()) {
            user.setFullName(req.getFullName());
            user = userRepository.save(user);
        }
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            user.setEmailVerified(true);
            user = userRepository.save(user);
        }
        return buildApplicantAuthResponse(user);
    }

    @Transactional
    public AuthDtos.MessageResponse verifyEmail(AuthDtos.VerifyEmailRequest req) {
        User user = tokenService.consumeToken(req.getToken(), "EMAIL_VERIFY");
        user.setEmailVerified(true);
        userRepository.save(user);
        auditService.log("APPLICANT", user.getId(), user.getEmail(), "EMAIL_VERIFIED", "USER", user.getId(), null);
        return new AuthDtos.MessageResponse("Email verified. You can now sign in.");
    }

    @Transactional
    public AuthDtos.MessageResponse forgotPassword(AuthDtos.ForgotPasswordRequest req) {
        userRepository.findByEmail(req.getEmail().toLowerCase().trim()).ifPresent(user -> {
            String token = tokenService.createToken(user, "PASSWORD_RESET", 3600);
            emailService.sendPasswordResetEmail(user.getEmail(), token);
        });
        return new AuthDtos.MessageResponse("If that email exists, a reset link has been sent.");
    }

    @Transactional
    public AuthDtos.MessageResponse resetPassword(AuthDtos.ResetPasswordRequest req) {
        validatePassword(req.getNewPassword());
        User user = tokenService.consumeToken(req.getToken(), "PASSWORD_RESET");
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        auditService.log("APPLICANT", user.getId(), user.getEmail(), "PASSWORD_RESET", "USER", user.getId(), null);
        return new AuthDtos.MessageResponse("Password updated successfully.");
    }

    public AuthDtos.UserResponse updateProfile(Long userId, AuthDtos.ProfileUpdateRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getPhoneNumber() != null) user.setPhoneNumber(req.getPhoneNumber());
        if (req.getAddress() != null) user.setAddress(req.getAddress());
        if (req.getCity() != null) user.setCity(req.getCity());
        if (req.getState() != null) user.setState(req.getState());
        if (req.getZipCode() != null) user.setZipCode(req.getZipCode());
        if (req.getEmploymentStatus() != null) user.setEmploymentStatus(req.getEmploymentStatus());
        if (req.getMonthlyIncome() != null) user.setMonthlyIncome(parseDecimal(req.getMonthlyIncome()));
        if (req.getIdPassportNumber() != null) user.setIdPassportNumber(req.getIdPassportNumber());
        if (req.getEmployerName() != null) user.setEmployerName(req.getEmployerName());
        if (req.getBankName() != null) user.setBankName(req.getBankName());
        if (req.getBankAccountNumber() != null) {
            user.setBankAccountNumber(maskAccount(req.getBankAccountNumber()));
        }
        return toUserResponse(userRepository.save(user));
    }

    @Transactional
    public AuthDtos.MessageResponse deleteAccount(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setDeletedAt(Instant.now());
        user.setEmail("deleted_" + user.getId() + "@credora.invalid");
        userRepository.save(user);
        auditService.log("APPLICANT", userId, user.getEmail(), "ACCOUNT_DELETED", "USER", userId, null);
        return new AuthDtos.MessageResponse("Account scheduled for deletion.");
    }

    private void validatePassword(String password) {
        if (password == null || !STRONG_PASSWORD.matcher(password).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must be 10+ chars with upper, lower, digit, and special character");
        }
    }

    private void assertNotLocked(User user) {
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Account temporarily locked. Try again later.");
        }
    }

    private void registerFailedLogin(User user) {
        int attempts = (user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= maxLoginAttempts) {
            user.setLockedUntil(Instant.now().plusSeconds(900));
        }
        userRepository.save(user);
    }

    private String maskAccount(String account) {
        if (account.length() <= 4) return account;
        return "****" + account.substring(account.length() - 4);
    }

    public AuthDtos.UserResponse getUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toUserResponse(user);
    }

    public AuthDtos.InstitutionResponse getInstitution(Long institutionId) {
        Institution inst = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Institution not found"));
        return toInstitutionResponse(inst);
    }

    private AuthDtos.AuthResponse buildApplicantAuthResponse(User user) {
        String token = jwtUtil.generateToken(user.getEmail(), "APPLICANT", user.getId());
        AuthDtos.AuthResponse resp = new AuthDtos.AuthResponse();
        resp.setToken(token);
        resp.setUser(toUserResponse(user));
        return resp;
    }

    private AuthDtos.AuthResponse buildInstitutionAuthResponse(Institution inst) {
        String token = jwtUtil.generateToken(inst.getInstitutionEmail(), "INSTITUTION", inst.getId(),
                inst.getRole() != null ? inst.getRole().name() : InstitutionRole.LOAN_OFFICER.name());
        AuthDtos.AuthResponse resp = new AuthDtos.AuthResponse();
        resp.setToken(token);
        resp.setInstitution(toInstitutionResponse(inst));
        return resp;
    }

    public AuthDtos.UserResponse toUserResponse(User user) {
        AuthDtos.UserResponse r = new AuthDtos.UserResponse();
        r.setId(user.getId());
        r.setFullName(user.getFullName());
        r.setEmail(user.getEmail());
        r.setPhoneNumber(user.getPhoneNumber());
        r.setAddress(user.getAddress());
        r.setEmploymentStatus(user.getEmploymentStatus());
        r.setMonthlyIncome(user.getMonthlyIncome());
        r.setIdPassportNumber(user.getIdPassportNumber());
        r.setCity(user.getCity());
        r.setState(user.getState());
        r.setZipCode(user.getZipCode());
        r.setEmployerName(user.getEmployerName());
        r.setBankName(user.getBankName());
        r.setBankAccountNumber(user.getBankAccountNumber());
        r.setEmailVerified(user.getEmailVerified());
        return r;
    }

    public AuthDtos.InstitutionResponse toInstitutionResponse(Institution inst) {
        AuthDtos.InstitutionResponse r = new AuthDtos.InstitutionResponse();
        r.setId(inst.getId());
        r.setInstitutionName(inst.getInstitutionName());
        r.setRegistrationLicenseNumber(inst.getRegistrationLicenseNumber());
        r.setContactPersonName(inst.getContactPersonName());
        r.setBusinessAddress(inst.getBusinessAddress());
        r.setInstitutionWebsite(inst.getInstitutionWebsite());
        r.setInstitutionEmail(inst.getInstitutionEmail());
        r.setPhoneNumber(inst.getPhoneNumber());
        return r;
    }

    private BigDecimal parseDecimal(String value) {
        if (value == null || value.isBlank()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(value.replace(",", ""));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}
