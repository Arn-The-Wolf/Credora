package com.credora.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "consent_records")
public class ConsentRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(nullable = false)
    private String consentType;
    private String version;
    private String ipAddress;
    @Column(nullable = false, updatable = false)
    private Instant acceptedAt;

    public ConsentRecord() {}

    @PrePersist
    void onCreate() { acceptedAt = Instant.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getConsentType() { return consentType; }
    public void setConsentType(String consentType) { this.consentType = consentType; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public Instant getAcceptedAt() { return acceptedAt; }
}
