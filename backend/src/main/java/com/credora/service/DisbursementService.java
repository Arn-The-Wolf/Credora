package com.credora.service;

import com.credora.model.Loan;
import com.credora.model.LoanApplication;
import com.credora.model.User;
import com.credora.repository.LoanRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;

@Service
public class DisbursementService {

    private final LoanRepository loanRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public DisbursementService(LoanRepository loanRepository, NotificationService notificationService,
                               AuditService auditService) {
        this.loanRepository = loanRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    @Transactional
    public Loan disburse(Long loanId, Long officerId, String officerEmail, String phone) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Loan not found"));
        if (!"PENDING".equals(loan.getDisbursementStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loan already disbursed or not pending");
        }

        // In production: trigger B2C disbursement via M-Pesa. Sandbox marks complete immediately.
        loan.setDisbursementStatus("DISBURSED");
        loan.setDisbursedAt(Instant.now());
        loan.setStatus("ACTIVE");
        loan.setStartDate(LocalDate.now());
        loan.setNextPaymentDate(LocalDate.now().plusMonths(1));
        loan = loanRepository.save(loan);

        User user = loan.getUser();
        LoanApplication app = loan.getApplication();
        notificationService.notify(user, "Loan disbursed",
                "Your loan " + loan.getReferenceId() + " of KES " + loan.getPrincipal()
                        + " has been disbursed to your M-Pesa account.", "DISBURSEMENT");

        auditService.log("INSTITUTION", officerId, officerEmail, "DISBURSE_LOAN",
                "LOAN", loanId, "Disbursed " + loan.getReferenceId());

        return loan;
    }
}
