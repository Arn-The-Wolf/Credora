package com.credora.service;

import com.credora.dto.ReportDtos;
import com.credora.model.ApplicationDocument;
import com.credora.model.LoanApplication;
import com.credora.repository.ApplicationDocumentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    private final ApplicationDocumentRepository documentRepository;
    private final StorageService storageService;
    private final AuditService auditService;

    public DocumentService(ApplicationDocumentRepository documentRepository,
                           StorageService storageService, AuditService auditService) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ReportDtos.DocumentResponse> listAll(String status) {
        List<ApplicationDocument> docs = status != null && !status.equals("all")
                ? documentRepository.findByStatusOrderByUploadedAtDesc(status.toUpperCase())
                : documentRepository.findAllByOrderByUploadedAtDesc();
        return docs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public ReportDtos.DocumentResponse updateStatus(Long id, String status, Long officerId, String officerEmail) {
        ApplicationDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
        doc.setStatus(status.toUpperCase());
        auditService.log("INSTITUTION", officerId, officerEmail, "DOCUMENT_" + status.toUpperCase(),
                "DOCUMENT", id, doc.getFileName());
        return toResponse(documentRepository.save(doc));
    }

    @Transactional(readOnly = true)
    public ApplicationDocument getEntity(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    @Transactional(readOnly = true)
    public ReportDtos.DocumentResponse getDocument(Long id, Long officerId, String officerEmail) {
        ApplicationDocument doc = getEntity(id);
        auditService.log("INSTITUTION", officerId, officerEmail, "DOCUMENT_VIEW",
                "DOCUMENT", id, doc.getFileName());
        return toResponse(doc);
    }

    @Transactional
    public void saveDocument(LoanApplication app, ReportDtos.DocumentUploadRequest docReq) {
        if (docReq.getFileName() == null || docReq.getContentBase64() == null) return;
        StorageService.StoredFile stored = storageService.store(
                docReq.getDocumentType(), docReq.getFileName(), docReq.getContentType(), docReq.getContentBase64());

        ApplicationDocument ad = new ApplicationDocument();
        ad.setApplication(app);
        ad.setDocumentType(docReq.getDocumentType());
        ad.setFileName(docReq.getFileName());
        ad.setContentType(docReq.getContentType());
        ad.setStorageKey(stored.storageKey());
        ad.setFileSize(stored.fileSize());
        ad.setSha256Hash(stored.sha256());
        ad.setVirusScanStatus("CLEAN");
        ad.setContentBase64(stored.contentBase64());
        documentRepository.save(ad);
    }

    public byte[] downloadContent(ApplicationDocument doc) {
        if (doc.getStorageKey() != null) {
            return storageService.download(doc.getStorageKey());
        }
        if (doc.getContentBase64() != null) {
            String data = doc.getContentBase64().contains(",")
                    ? doc.getContentBase64().split(",")[1] : doc.getContentBase64();
            return Base64.getDecoder().decode(data);
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document content unavailable");
    }

    private ReportDtos.DocumentResponse toResponse(ApplicationDocument doc) {
        ReportDtos.DocumentResponse r = new ReportDtos.DocumentResponse();
        r.setId(doc.getId());
        r.setDocumentType(doc.getDocumentType());
        r.setFileName(doc.getFileName());
        r.setStatus(doc.getStatus());
        r.setUploadedAt(doc.getUploadedAt() != null ? doc.getUploadedAt().toString() : null);
        r.setContentType(doc.getContentType());
        r.setFileSize(doc.getFileSize());
        r.setVirusScanStatus(doc.getVirusScanStatus());
        if (doc.getStorageKey() != null) {
            r.setPreviewUrl(storageService.getSignedUrl(doc.getStorageKey()));
        }
        LoanApplication app = doc.getApplication();
        if (app != null) {
            r.setApplicationId(app.getId());
            r.setApplicationRef(app.getReferenceId());
            r.setLoanType(app.getLoanType());
            if (app.getUser() != null) {
                r.setCustomerName(app.getUser().getFullName());
                r.setCustomerEmail(app.getUser().getEmail());
            }
        }
        return r;
    }
}
