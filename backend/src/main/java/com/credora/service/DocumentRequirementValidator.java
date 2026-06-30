package com.credora.service;

import com.credora.dto.ReportDtos;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class DocumentRequirementValidator {

    private static final Map<String, Set<String>> REQUIRED = Map.of(
            "personal", Set.of("id_document", "bank_statement"),
            "business", Set.of("id_document", "business_registration", "bank_statement", "tax_returns"),
            "mortgage", Set.of("id_document", "property_deed", "income_proof"),
            "auto", Set.of("id_document", "vehicle_invoice", "insurance_quote"),
            "education", Set.of("id_document", "admission_letter", "tuition_invoice")
    );

    public void validate(String loanType, List<ReportDtos.DocumentUploadRequest> documents) {
        Set<String> required = REQUIRED.get(loanType != null ? loanType.toLowerCase() : "");
        if (required == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported loan type: " + loanType);
        }
        if (documents == null || documents.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Required documents missing for " + loanType + " loan");
        }
        Set<String> uploaded = documents.stream()
                .map(ReportDtos.DocumentUploadRequest::getDocumentType)
                .filter(t -> t != null && !t.isBlank())
                .map(String::toLowerCase)
                .collect(java.util.stream.Collectors.toSet());
        for (String docType : required) {
            if (!uploaded.contains(docType.toLowerCase())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Missing required document: " + docType + " for " + loanType + " loan");
            }
        }
    }
}
