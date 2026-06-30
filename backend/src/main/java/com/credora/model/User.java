package com.credora.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String fullName;
    @Column(nullable = false, unique = true)
    private String email;
    @Column(nullable = false)
    private String password;
    private String phoneNumber;
    private String address;
    private String employmentStatus;
    @Column(precision = 12, scale = 2)
    private BigDecimal monthlyIncome;
    private String idPassportNumber;
    private String city;
    private String state;
    private String zipCode;
    private String employerName;
    private String bankName;
    private String bankAccountNumber;
    private Boolean emailVerified;
    private Instant termsAcceptedAt;
    private Instant privacyAcceptedAt;
    private Instant creditConsentAt;
    private Integer failedLoginAttempts;
    private Instant lockedUntil;
    private Instant deletedAt;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public User() {}

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        if (emailVerified == null) emailVerified = false;
        if (failedLoginAttempts == null) failedLoginAttempts = 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getEmploymentStatus() { return employmentStatus; }
    public void setEmploymentStatus(String employmentStatus) { this.employmentStatus = employmentStatus; }
    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; }
    public String getIdPassportNumber() { return idPassportNumber; }
    public void setIdPassportNumber(String idPassportNumber) { this.idPassportNumber = idPassportNumber; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getZipCode() { return zipCode; }
    public void setZipCode(String zipCode) { this.zipCode = zipCode; }
    public String getEmployerName() { return employerName; }
    public void setEmployerName(String employerName) { this.employerName = employerName; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public String getBankAccountNumber() { return bankAccountNumber; }
    public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }
    public Boolean getEmailVerified() { return emailVerified; }
    public void setEmailVerified(Boolean emailVerified) { this.emailVerified = emailVerified; }
    public Instant getTermsAcceptedAt() { return termsAcceptedAt; }
    public void setTermsAcceptedAt(Instant termsAcceptedAt) { this.termsAcceptedAt = termsAcceptedAt; }
    public Instant getPrivacyAcceptedAt() { return privacyAcceptedAt; }
    public void setPrivacyAcceptedAt(Instant privacyAcceptedAt) { this.privacyAcceptedAt = privacyAcceptedAt; }
    public Instant getCreditConsentAt() { return creditConsentAt; }
    public void setCreditConsentAt(Instant creditConsentAt) { this.creditConsentAt = creditConsentAt; }
    public Integer getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(Integer failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }
    public Instant getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(Instant lockedUntil) { this.lockedUntil = lockedUntil; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
