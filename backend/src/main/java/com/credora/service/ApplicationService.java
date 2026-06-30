package com.credora.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.credora.dto.ApplicationDtos;
import com.credora.dto.AuthDtos;
import com.credora.dto.DashboardDtos;
import com.credora.dto.ReportDtos;
import com.credora.model.*;
import com.credora.repository.LoanApplicationRepository;
import com.credora.repository.LoanRepository;
import com.credora.repository.UserRepository;
import com.credora.repository.ApplicationDocumentRepository;
import com.credora.repository.ApplicationNoteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ApplicationService {

    private final LoanApplicationRepository applicationRepository;
    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final AiScoringService aiScoringService;
    private final LoanTypeValidator loanTypeValidator;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ApplicationDocumentRepository documentRepository;
    private final CreditBureauService creditBureauService;
    private final DocumentService documentService;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditService auditService;
    private final ConsentService consentService;
    private final ApplicationNoteRepository noteRepository;

    public ApplicationService(LoanApplicationRepository applicationRepository, LoanRepository loanRepository,
                              UserRepository userRepository, AiScoringService aiScoringService,
                              LoanTypeValidator loanTypeValidator,
                              ApplicationDocumentRepository documentRepository,
                              CreditBureauService creditBureauService,
                              DocumentService documentService,
                              NotificationService notificationService,
                              EmailService emailService,
                              AuditService auditService,
                              ConsentService consentService,
                              ApplicationNoteRepository noteRepository) {
        this.applicationRepository = applicationRepository;
        this.loanRepository = loanRepository;
        this.userRepository = userRepository;
        this.aiScoringService = aiScoringService;
        this.loanTypeValidator = loanTypeValidator;
        this.documentRepository = documentRepository;
        this.creditBureauService = creditBureauService;
        this.documentService = documentService;
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.auditService = auditService;
        this.consentService = consentService;
        this.noteRepository = noteRepository;
    }

    @Transactional
    public ApplicationDtos.ApplicationResponse createApplication(Long userId, ApplicationDtos.CreateApplicationRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        BigDecimal amount = parseDecimal(req.getAmount());
        int term = parseInt(req.getTerm(), 12);
        Map<String, String> sectorDetails = req.getSectorDetails() != null
                ? new HashMap<>(req.getSectorDetails()) : new HashMap<>();
        sectorDetails.put("loanAmount", amount.toPlainString());

        loanTypeValidator.validate(req.getLoanType(), amount, term, sectorDetails);

        updateUserProfileFromApplication(user, req);
        user = userRepository.save(user);

        BigDecimal income = parseDecimal(req.getIncome());
        if (income.compareTo(BigDecimal.ZERO) == 0 && user.getMonthlyIncome() != null) {
            income = user.getMonthlyIncome();
        }
        Integer creditScore = parseCreditScore(req.getCreditScore());
        if (req.getIdPassportNumber() != null && !req.getIdPassportNumber().isBlank()) {
            consentService.recordConsent(user, "CREDIT_BUREAU", "1.0", null);
            ReportDtos.CreditCheckRequest cr = new ReportDtos.CreditCheckRequest();
            cr.setUserId(userId);
            cr.setFullName(user.getFullName());
            cr.setIdNumber(req.getIdPassportNumber());
            cr.setPhoneNumber(req.getPhone());
            ReportDtos.CreditCheckResponse bureau = creditBureauService.check(cr);
            creditScore = bureau.getCreditScore();
        }
        BigDecimal mobileMoney = parseDecimal(req.getMobileMoneyAvg());
        int utilityScore = parseInt(req.getUtilityPaymentScore(), 70);
        BigDecimal existingDebt = parseDecimal(req.getExistingDebt());
        if (existingDebt.compareTo(BigDecimal.ZERO) == 0 && sectorDetails.containsKey("existingDebt")) {
            existingDebt = parseDecimal(sectorDetails.get("existingDebt"));
        }

        ApplicationDtos.ScoringInsights scoring = aiScoringService.score(
                req.getLoanType(),
                income,
                req.getEmployment() != null ? req.getEmployment() : user.getEmploymentStatus(),
                amount,
                term,
                creditScore,
                mobileMoney,
                utilityScore,
                sectorDetails);

        LoanApplication app = new LoanApplication();
        app.setReferenceId("LOAN-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        app.setUser(user);
        app.setLoanType(req.getLoanType());
        app.setPurpose(req.getPurpose());
        app.setLoanAmount(amount);
        app.setTermMonths(term);
        app.setMonthlyIncome(income);
        app.setEmploymentStatus(req.getEmployment());
        app.setExistingCreditScore(creditScore);
        app.setMobileMoneyAvg(mobileMoney);
        app.setUtilityPaymentScore(utilityScore);
        app.setExistingDebt(existingDebt);
        try {
            app.setSectorDetails(objectMapper.writeValueAsString(sectorDetails));
        } catch (JsonProcessingException e) {
            app.setSectorDetails("{}");
        }
        app.setAiCreditScore(scoring.getCreditScore());
        app.setApprovalProbability(scoring.getApprovalProbability());
        app.setRecommendedAmount(scoring.getRecommendedAmount());
        app.setEstimatedApr(scoring.getEstimatedApr());
        app.setAiSummary(scoring.getSummary());
        app.setAiRecommendation(scoring.getRecommendation());
        app.setStatus(mapRecommendationToStatus(scoring.getRecommendation(), scoring.getApprovalProbability()));

        if (app.getStatus() == ApplicationStatus.REJECTED) {
            app.setRejectionReason("AI risk assessment: approval probability below threshold.");
        }

        app = applicationRepository.save(app);

        if (req.getDocuments() != null) {
            for (ReportDtos.DocumentUploadRequest doc : req.getDocuments()) {
                documentService.saveDocument(app, doc);
            }
        }

        notificationService.notify(user, "Application submitted",
                "Your application " + app.getReferenceId() + " is under review.", "APPLICATION");
        emailService.sendApplicationStatusEmail(user.getEmail(), app.getReferenceId(), "Submitted",
                "We received your application and our team will review it shortly.");

        ApplicationDtos.ApplicationResponse response = toResponse(app);
        response.setScoring(scoring);
        return response;
    }

    public List<ApplicationDtos.ApplicationResponse> getUserApplications(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return applicationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ApplicationDtos.ApplicationResponse getApplication(Long userId, Long appId) {
        LoanApplication app = applicationRepository.findById(appId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        if (!app.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return toResponse(app);
    }

    public List<ApplicationDtos.ApplicationResponse> getAllApplications(String statusFilter) {
        List<LoanApplication> apps;
        if (statusFilter == null || statusFilter.equalsIgnoreCase("all")) {
            apps = applicationRepository.findAllByOrderByCreatedAtDesc();
        } else {
            apps = applicationRepository.findByStatusOrderByCreatedAtDesc(
                    ApplicationStatus.valueOf(statusFilter.toUpperCase()));
        }
        return apps.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public ApplicationDtos.ApplicationResponse updateStatus(Long appId, ApplicationDtos.StatusUpdateRequest req,
                                                            Long officerId, String officerEmail) {
        LoanApplication app = applicationRepository.findById(appId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));

        ApplicationStatus newStatus = ApplicationStatus.valueOf(req.getStatus().toUpperCase());
        app.setStatus(newStatus);
        if (req.getOfficerOverrideReason() != null) {
            app.setOfficerOverrideReason(req.getOfficerOverrideReason());
        }
        if (newStatus == ApplicationStatus.APPROVED) {
            app.setApprovalDate(LocalDate.now());
            createLoanFromApplication(app);
            notificationService.notify(app.getUser(), "Application approved",
                    "Your loan " + app.getReferenceId() + " was approved. Funds will be disbursed after final review.",
                    "APPLICATION");
            emailService.sendApplicationStatusEmail(app.getUser().getEmail(), app.getReferenceId(), "Approved",
                    "Congratulations! Your application was approved.");
        } else if (newStatus == ApplicationStatus.REJECTED) {
            app.setRejectionReason(req.getRejectionReason() != null ? req.getRejectionReason()
                    : "Application rejected by institution reviewer.");
            notificationService.notify(app.getUser(), "Application update",
                    "Your application " + app.getReferenceId() + " was not approved.", "APPLICATION");
            emailService.sendApplicationStatusEmail(app.getUser().getEmail(), app.getReferenceId(), "Rejected",
                    app.getRejectionReason());
        } else if (newStatus == ApplicationStatus.MORE_INFO_REQUIRED) {
            notificationService.notify(app.getUser(), "More information needed",
                    "Please upload additional documents for " + app.getReferenceId(), "APPLICATION");
            emailService.sendApplicationStatusEmail(app.getUser().getEmail(), app.getReferenceId(), "More info needed",
                    "Our team needs additional documents to continue reviewing your application.");
        }
        app = applicationRepository.save(app);
        auditService.log("INSTITUTION", officerId, officerEmail, "APPLICATION_" + newStatus.name(),
                "APPLICATION", appId, req.getOfficerOverrideReason());
        return toResponse(app);
    }

    @Transactional
    public ApplicationDtos.ApplicationResponse assignOfficer(Long appId, Long officerId, String officerEmail) {
        LoanApplication app = applicationRepository.findById(appId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        app.setAssignedOfficerId(officerId);
        app = applicationRepository.save(app);
        auditService.log("INSTITUTION", officerId, officerEmail, "ASSIGN_APPLICATION", "APPLICATION", appId, null);
        return toResponse(app);
    }

    @Transactional
    public ReportDtos.ApplicationNoteResponse addNote(Long appId, Long officerId, String officerEmail,
                                                      ReportDtos.ApplicationNoteRequest req) {
        LoanApplication app = applicationRepository.findById(appId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
        ApplicationNote note = new ApplicationNote();
        note.setApplication(app);
        note.setOfficerId(officerId);
        note.setOfficerEmail(officerEmail);
        note.setNoteType(req.getNoteType() != null ? req.getNoteType() : "NOTE");
        note.setContent(req.getContent());
        note = noteRepository.save(note);
        auditService.log("INSTITUTION", officerId, officerEmail, "APPLICATION_NOTE", "APPLICATION", appId, req.getContent());
        ReportDtos.ApplicationNoteResponse r = new ReportDtos.ApplicationNoteResponse();
        r.setId(note.getId());
        r.setOfficerEmail(note.getOfficerEmail());
        r.setNoteType(note.getNoteType());
        r.setContent(note.getContent());
        r.setCreatedAt(note.getCreatedAt().toString());
        return r;
    }

    public DashboardDtos.DashboardSummary getApplicantDashboard(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        List<LoanApplication> apps = applicationRepository.findByUserOrderByCreatedAtDesc(user);
        List<Loan> loans = loanRepository.findByUserOrderByCreatedAtDesc(user);

        BigDecimal totalBorrowed = loans.stream()
                .map(Loan::getPrincipal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remaining = loans.stream()
                .map(l -> l.getRemainingBalance() != null ? l.getRemainingBalance() : l.getPrincipal())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paid = totalBorrowed.subtract(remaining);

        int latestScore = apps.stream()
                .filter(a -> a.getAiCreditScore() != null)
                .mapToInt(LoanApplication::getAiCreditScore)
                .findFirst()
                .orElse(650);

        long approved = apps.stream().filter(a -> a.getStatus() == ApplicationStatus.APPROVED).count();
        long pending = apps.stream().filter(a -> a.getStatus() == ApplicationStatus.PENDING
                || a.getStatus() == ApplicationStatus.PROCESSING).count();

        double approvalRate = apps.isEmpty() ? 0 : (approved * 100.0 / apps.size());

        DashboardDtos.DashboardSummary summary = new DashboardDtos.DashboardSummary();
        summary.setUserName(user.getFullName());
        summary.setUserEmail(user.getEmail());
        summary.setCreditScore(latestScore);
        summary.setApprovalRate(approvalRate);
        summary.setTotalBorrowed(totalBorrowed);
        summary.setTotalPaid(paid.max(BigDecimal.ZERO));
        summary.setRemainingBalance(remaining);
        summary.setActiveLoans((int) loans.stream().filter(l -> "ACTIVE".equals(l.getStatus())).count());
        summary.setPendingApplications((int) pending);
        summary.setApprovedApplications((int) approved);
        summary.setRecentApplications(apps.stream().limit(5).map(this::toResponse).collect(Collectors.toList()));
        summary.setActiveLoanList(loans.stream()
                .filter(l -> "ACTIVE".equals(l.getStatus()))
                .map(this::toLoanResponse)
                .collect(Collectors.toList()));
        return summary;
    }

    public DashboardDtos.AdminDashboardSummary getAdminDashboard() {
        List<LoanApplication> all = applicationRepository.findAllByOrderByCreatedAtDesc();
        long customers = userRepository.count();
        DashboardDtos.AdminDashboardSummary summary = new DashboardDtos.AdminDashboardSummary();
        summary.setTotalApplications(all.size());
        summary.setPendingApplications(applicationRepository.countByStatus(ApplicationStatus.PENDING)
                + applicationRepository.countByStatus(ApplicationStatus.PROCESSING));
        summary.setApprovedApplications(applicationRepository.countByStatus(ApplicationStatus.APPROVED));
        summary.setRejectedApplications(applicationRepository.countByStatus(ApplicationStatus.REJECTED));
        summary.setTotalCustomers(customers);
        summary.setRecentApplications(all.stream().limit(10).map(this::toResponse).collect(Collectors.toList()));
        return summary;
    }

    public List<DashboardDtos.LoanResponse> getUserLoans(Long userId, String status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        List<Loan> loans = status != null && !status.equals("all")
                ? loanRepository.findByUserAndStatusOrderByCreatedAtDesc(user, status.toUpperCase())
                : loanRepository.findByUserOrderByCreatedAtDesc(user);
        return loans.stream().map(this::toLoanResponse).collect(Collectors.toList());
    }

    public List<AuthDtos.UserResponse> getAllCustomers() {
        return userRepository.findAll().stream()
                .map(u -> {
                    AuthDtos.UserResponse r = new AuthDtos.UserResponse();
                    r.setId(u.getId());
                    r.setFullName(u.getFullName());
                    r.setEmail(u.getEmail());
                    r.setPhoneNumber(u.getPhoneNumber());
                    r.setEmploymentStatus(u.getEmploymentStatus());
                    r.setMonthlyIncome(u.getMonthlyIncome());
                    return r;
                })
                .collect(Collectors.toList());
    }

    private void createLoanFromApplication(LoanApplication app) {
        if (loanRepository.findAll().stream().anyMatch(l -> l.getApplication().getId().equals(app.getId()))) {
            return;
        }
        double rate = app.getEstimatedApr() != null ? app.getEstimatedApr() : 12.0;
        BigDecimal monthlyRate = BigDecimal.valueOf(rate / 100 / 12);
        BigDecimal payment = calculatePayment(app.getLoanAmount(), monthlyRate, app.getTermMonths());

        Loan loan = new Loan();
        loan.setReferenceId("LN-" + app.getReferenceId());
        loan.setApplication(app);
        loan.setUser(app.getUser());
        loan.setPrincipal(app.getLoanAmount());
        loan.setInterestRate(BigDecimal.valueOf(rate));
        loan.setTermMonths(app.getTermMonths());
        loan.setMonthsPaid(0);
        loan.setStatus("PENDING_DISBURSEMENT");
        loan.setDisbursementStatus("PENDING");
        loan.setMonthlyPayment(payment);
        loan.setRemainingBalance(app.getLoanAmount());
        loan.setStartDate(LocalDate.now());
        loan.setNextPaymentDate(LocalDate.now().plusMonths(1));
        loanRepository.save(loan);
    }

    private BigDecimal calculatePayment(BigDecimal principal, BigDecimal monthlyRate, int months) {
        if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);
        }
        double p = principal.doubleValue();
        double r = monthlyRate.doubleValue();
        double payment = p * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
        return BigDecimal.valueOf(payment).setScale(2, RoundingMode.HALF_UP);
    }

    private void updateUserProfileFromApplication(User user, ApplicationDtos.CreateApplicationRequest req) {
        if (req.getFirstName() != null || req.getLastName() != null) {
            String first = req.getFirstName() != null ? req.getFirstName() : "";
            String last = req.getLastName() != null ? req.getLastName() : "";
            String combined = (first + " " + last).trim();
            if (!combined.isBlank()) user.setFullName(combined);
        }
        if (req.getPhone() != null && !req.getPhone().isBlank()) user.setPhoneNumber(req.getPhone());
        if (req.getAddress() != null && !req.getAddress().isBlank()) user.setAddress(req.getAddress());
        if (req.getCity() != null && !req.getCity().isBlank()) user.setCity(req.getCity());
        if (req.getState() != null && !req.getState().isBlank()) user.setState(req.getState());
        if (req.getZipCode() != null && !req.getZipCode().isBlank()) user.setZipCode(req.getZipCode());
        if (req.getIdPassportNumber() != null && !req.getIdPassportNumber().isBlank()) {
            user.setIdPassportNumber(req.getIdPassportNumber());
        }
        if (req.getEmployerName() != null && !req.getEmployerName().isBlank()) {
            user.setEmployerName(req.getEmployerName());
        }
        if (req.getBankName() != null && !req.getBankName().isBlank()) user.setBankName(req.getBankName());
        if (req.getBankAccountNumber() != null && !req.getBankAccountNumber().isBlank()) {
            user.setBankAccountNumber(maskAccount(req.getBankAccountNumber()));
        }
        if (req.getEmployment() != null && !req.getEmployment().isBlank()) {
            user.setEmploymentStatus(req.getEmployment());
        }
        BigDecimal income = parseDecimal(req.getIncome());
        if (income.compareTo(BigDecimal.ZERO) > 0) user.setMonthlyIncome(income);
    }

    private String maskAccount(String account) {
        if (account.length() <= 4) return account;
        return "****" + account.substring(account.length() - 4);
    }

    private ApplicationStatus mapRecommendationToStatus(String recommendation, Double probability) {
        if ("REJECT".equalsIgnoreCase(recommendation) || (probability != null && probability < 0.4)) {
            return ApplicationStatus.REJECTED;
        }
        return ApplicationStatus.PROCESSING;
    }

    public ApplicationDtos.ApplicationResponse toResponse(LoanApplication app) {
        ApplicationDtos.ApplicationResponse r = new ApplicationDtos.ApplicationResponse();
        r.setId(app.getId());
        r.setReferenceId(app.getReferenceId());
        r.setLoanType(app.getLoanType());
        r.setPurpose(app.getPurpose());
        r.setAmount(app.getLoanAmount());
        r.setTermMonths(app.getTermMonths());
        r.setStatus(app.getStatus().name().toLowerCase());
        r.setAiCreditScore(app.getAiCreditScore());
        r.setApprovalProbability(app.getApprovalProbability());
        r.setRecommendedAmount(app.getRecommendedAmount());
        r.setEstimatedApr(app.getEstimatedApr());
        r.setAiSummary(app.getAiSummary());
        r.setRejectionReason(app.getRejectionReason());
        r.setSubmittedDate(app.getSubmittedDate());
        r.setApprovalDate(app.getApprovalDate());
        if (app.getUser() != null) {
            r.setCustomerName(app.getUser().getFullName());
            r.setCustomerEmail(app.getUser().getEmail());
        }
        r.setMonthlyIncome(app.getMonthlyIncome());
        r.setExistingCreditScore(app.getExistingCreditScore());
        if (app.getMonthlyIncome() != null && app.getLoanAmount() != null
                && app.getMonthlyIncome().compareTo(BigDecimal.ZERO) > 0) {
            double annualIncome = app.getMonthlyIncome().doubleValue() * 12;
            double debt = app.getExistingDebt() != null ? app.getExistingDebt().doubleValue() * 12 : 0;
            r.setDebtToIncome((app.getLoanAmount().doubleValue() + debt) / annualIncome);
        }
        if (app.getSectorDetails() != null && !app.getSectorDetails().isBlank()) {
            try {
                r.setSectorDetails(objectMapper.readValue(app.getSectorDetails(),
                        new TypeReference<Map<String, String>>() {}));
            } catch (JsonProcessingException ignored) { }
        }
        r.setAiRecommendation(app.getAiRecommendation());
        loanRepository.findByApplication_Id(app.getId()).ifPresent(loan -> r.setLoanId(loan.getId()));
        return r;
    }

    public List<ApplicationDtos.AdminLoanResponse> getAdminLoans(String status) {
        List<Loan> loans;
        if (status == null || status.isBlank() || "all".equalsIgnoreCase(status)) {
            loans = loanRepository.findAll();
        } else if ("pending_disbursement".equalsIgnoreCase(status)) {
            loans = loanRepository.findByDisbursementStatusOrderByCreatedAtDesc("PENDING");
        } else {
            loans = loanRepository.findByStatusOrderByCreatedAtDesc(status.toUpperCase());
        }
        return loans.stream().map(this::toAdminLoanResponse).collect(Collectors.toList());
    }

    private ApplicationDtos.AdminLoanResponse toAdminLoanResponse(Loan loan) {
        ApplicationDtos.AdminLoanResponse r = new ApplicationDtos.AdminLoanResponse();
        r.setId(loan.getId());
        r.setReferenceId(loan.getReferenceId());
        r.setPrincipal(loan.getPrincipal());
        r.setStatus(loan.getStatus());
        r.setDisbursementStatus(loan.getDisbursementStatus());
        r.setMonthlyPayment(loan.getMonthlyPayment());
        r.setCreatedAt(loan.getCreatedAt());
        if (loan.getApplication() != null) {
            r.setApplicationId(loan.getApplication().getId());
            r.setApplicationRef(loan.getApplication().getReferenceId());
        }
        if (loan.getUser() != null) {
            r.setCustomerName(loan.getUser().getFullName());
            r.setCustomerEmail(loan.getUser().getEmail());
            r.setCustomerPhone(loan.getUser().getPhoneNumber());
        }
        return r;
    }

    private DashboardDtos.LoanResponse toLoanResponse(Loan loan) {
        DashboardDtos.LoanResponse r = new DashboardDtos.LoanResponse();
        r.setId(loan.getId());
        r.setReferenceId(loan.getReferenceId());
        r.setPrincipal(loan.getPrincipal());
        r.setInterestRate(loan.getInterestRate());
        r.setTermMonths(loan.getTermMonths());
        r.setMonthsPaid(loan.getMonthsPaid());
        r.setStatus(loan.getStatus());
        r.setMonthlyPayment(loan.getMonthlyPayment());
        r.setRemainingBalance(loan.getRemainingBalance());
        r.setPurpose(loan.getApplication() != null ? loan.getApplication().getPurpose() : null);
        r.setAutoPayEnabled(loan.getAutoPayEnabled());
        return r;
    }

    private BigDecimal parseDecimal(String value) {
        if (value == null || value.isBlank()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(value.replace(",", "").replace("$", ""));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private int parseInt(String value, int defaultVal) {
        if (value == null || value.isBlank()) return defaultVal;
        try {
            return Integer.parseInt(value.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return defaultVal;
        }
    }

    private Integer parseCreditScore(String value) {
        if (value == null || value.isBlank()) return null;
        return switch (value.toLowerCase()) {
            case "excellent" -> 760;
            case "good" -> 700;
            case "fair" -> 660;
            case "poor" -> 600;
            case "bad" -> 520;
            default -> parseIntOrNull(value);
        };
    }

    private Integer parseIntOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Integer.parseInt(value.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
