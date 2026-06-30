package com.credora.controller;

import com.credora.dto.ApplicationDtos;
import com.credora.dto.DashboardDtos;
import com.credora.dto.ReportDtos;
import com.credora.model.AuditLog;
import com.credora.model.Loan;
import com.credora.repository.AuditLogRepository;
import com.credora.service.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final ApplicationService applicationService;
    private final ReportService reportService;
    private final DocumentService documentService;
    private final DisbursementService disbursementService;
    private final AuditLogRepository auditLogRepository;

    public AdminController(ApplicationService applicationService, ReportService reportService,
                           DocumentService documentService, DisbursementService disbursementService,
                           AuditLogRepository auditLogRepository) {
        this.applicationService = applicationService;
        this.reportService = reportService;
        this.documentService = documentService;
        this.disbursementService = disbursementService;
        this.auditLogRepository = auditLogRepository;
    }

    private Long officerId(Authentication auth) { return (Long) auth.getDetails(); }
    private String officerEmail(Authentication auth) { return auth.getName(); }

    @GetMapping("/dashboard")
    public DashboardDtos.AdminDashboardSummary dashboard() {
        return applicationService.getAdminDashboard();
    }

    @GetMapping("/applications")
    public List<ApplicationDtos.ApplicationResponse> applications(
            @RequestParam(defaultValue = "all") String status) {
        return applicationService.getAllApplications(status);
    }

    @PatchMapping("/applications/{id}/status")
    public ApplicationDtos.ApplicationResponse updateStatus(
            Authentication auth,
            @PathVariable Long id,
            @Valid @RequestBody ApplicationDtos.StatusUpdateRequest req) {
        return applicationService.updateStatus(id, req, officerId(auth), officerEmail(auth));
    }

    @PatchMapping("/applications/{id}/assign")
    public ApplicationDtos.ApplicationResponse assign(
            Authentication auth, @PathVariable Long id) {
        return applicationService.assignOfficer(id, officerId(auth), officerEmail(auth));
    }

    @PostMapping("/applications/{id}/notes")
    public ReportDtos.ApplicationNoteResponse addNote(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody ReportDtos.ApplicationNoteRequest req) {
        return applicationService.addNote(id, officerId(auth), officerEmail(auth), req);
    }

    @PostMapping("/loans/{id}/disburse")
    public Loan disburse(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String phone = body != null ? body.get("phoneNumber") : null;
        return disbursementService.disburse(id, officerId(auth), officerEmail(auth), phone);
    }

    @GetMapping("/customers")
    public List<ReportDtos.CustomerSummary> customers() {
        return reportService.getCustomerSummaries();
    }

    @GetMapping("/reports")
    public ReportDtos.AdminReportsSummary reports() {
        return reportService.getAdminReports();
    }

    @GetMapping("/documents")
    public List<ReportDtos.DocumentResponse> documents(
            @RequestParam(defaultValue = "all") String status) {
        return documentService.listAll(status);
    }

    @GetMapping("/documents/{id}")
    public ReportDtos.DocumentResponse getDocument(Authentication auth, @PathVariable Long id) {
        return documentService.getDocument(id, officerId(auth), officerEmail(auth));
    }

    @GetMapping("/documents/{id}/download")
    public ResponseEntity<byte[]> downloadDocument(Authentication auth, @PathVariable Long id) {
        var doc = documentService.getEntity(id);
        documentService.getDocument(id, officerId(auth), officerEmail(auth));
        byte[] content = documentService.downloadContent(doc);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(doc.getContentType() != null ? doc.getContentType() : "application/octet-stream"))
                .body(content);
    }

    @PatchMapping("/documents/{id}/status")
    public ReportDtos.DocumentResponse updateDocumentStatus(
            Authentication auth,
            @PathVariable Long id,
            @RequestBody ReportDtos.DocumentStatusRequest req) {
        return documentService.updateStatus(id, req.getStatus(), officerId(auth), officerEmail(auth));
    }

    @GetMapping("/audit-logs")
    public List<AuditLog> auditLogs() {
        return auditLogRepository.findTop100ByOrderByCreatedAtDesc();
    }
}
