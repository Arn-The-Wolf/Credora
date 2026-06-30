package com.credora.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "application_notes")
public class ApplicationNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private LoanApplication application;
    @Column(nullable = false)
    private Long officerId;
    private String officerEmail;
    private String noteType;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public ApplicationNote() {}

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        if (noteType == null) noteType = "NOTE";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LoanApplication getApplication() { return application; }
    public void setApplication(LoanApplication application) { this.application = application; }
    public Long getOfficerId() { return officerId; }
    public void setOfficerId(Long officerId) { this.officerId = officerId; }
    public String getOfficerEmail() { return officerEmail; }
    public void setOfficerEmail(String officerEmail) { this.officerEmail = officerEmail; }
    public String getNoteType() { return noteType; }
    public void setNoteType(String noteType) { this.noteType = noteType; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Instant getCreatedAt() { return createdAt; }
}
