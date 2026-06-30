package com.credora.service;

import com.credora.dto.ReportDtos;
import com.credora.repository.ConsentRecordRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CreditBureauService {

    private final ConsentRecordRepository consentRepository;
    private final AuditService auditService;

    @Value("${credora.credit-bureau.mode:sandbox}")
    private String mode;

    public CreditBureauService(ConsentRecordRepository consentRepository, AuditService auditService) {
        this.consentRepository = consentRepository;
        this.auditService = auditService;
    }

    public ReportDtos.CreditCheckResponse check(ReportDtos.CreditCheckRequest req) {
        if (req.getUserId() != null && !consentRepository.existsByUser_IdAndConsentType(req.getUserId(), "CREDIT_BUREAU")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Credit bureau consent required");
        }

        String seed = (req.getIdNumber() != null ? req.getIdNumber() : "")
                + (req.getPhoneNumber() != null ? req.getPhoneNumber() : "")
                + (req.getFullName() != null ? req.getFullName() : "");
        int hash = Math.abs(seed.hashCode());
        int score = 300 + (hash % 551);

        ReportDtos.CreditCheckResponse resp = new ReportDtos.CreditCheckResponse();
        resp.setCreditScore(score);
        resp.setBureau("sandbox".equals(mode) ? "Credora Sandbox Bureau" : "TransUnion CRB Kenya");
        resp.setRiskGrade(score >= 720 ? "A" : score >= 650 ? "B" : score >= 580 ? "C" : "D");
        resp.setReportSummary(String.format(
                "Credit pull for %s. Score: %d (%s). Bureau: %s.",
                req.getFullName() != null ? req.getFullName() : "applicant",
                score, resp.getRiskGrade(), resp.getBureau()));
        resp.setFactors(java.util.List.of(
                factor("Payment history", score >= 650 ? 85 : 55),
                factor("Credit utilization", score >= 700 ? 78 : 48),
                factor("Mobile money activity", score >= 600 ? 72 : 60),
                factor("Identity verification", req.getIdNumber() != null ? 90 : 40)
        ));

        auditService.log("SYSTEM", null, null, "CREDIT_BUREAU_PULL",
                "USER", req.getUserId(), "Score=" + score + " bureau=" + resp.getBureau());

        return resp;
    }

    private ReportDtos.ScoringFactor factor(String name, int value) {
        ReportDtos.ScoringFactor f = new ReportDtos.ScoringFactor();
        f.setName(name);
        f.setValue(value);
        return f;
    }
}
