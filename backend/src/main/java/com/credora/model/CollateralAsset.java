package com.credora.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "collateral_assets")
public class CollateralAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private LoanApplication application;

    @Column(name = "collateral_type", nullable = false, length = 50)
    private String collateralType;

    @Column(length = 500)
    private String description;

    @Column(name = "estimated_value", precision = 15, scale = 2)
    private BigDecimal estimatedValue;

    @Column(length = 120)
    private String identifier;

    @Column(name = "lien_status", length = 30)
    private String lienStatus = "PENDING";

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LoanApplication getApplication() { return application; }
    public void setApplication(LoanApplication application) { this.application = application; }
    public String getCollateralType() { return collateralType; }
    public void setCollateralType(String collateralType) { this.collateralType = collateralType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getEstimatedValue() { return estimatedValue; }
    public void setEstimatedValue(BigDecimal estimatedValue) { this.estimatedValue = estimatedValue; }
    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
    public String getLienStatus() { return lienStatus; }
    public void setLienStatus(String lienStatus) { this.lienStatus = lienStatus; }
    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
