package com.credora.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class ApplicationDtos {

    public static class CreateApplicationRequest {
        @NotBlank private String loanType;
        @NotBlank private String amount;
        @NotBlank private String term;
        @NotBlank private String purpose;
        private String income;
        private String employment;
        private String creditScore;
        private String mobileMoneyAvg;
        private String utilityPaymentScore;
        private String existingDebt;
        private Map<String, String> sectorDetails;
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private String address;
        private String city;
        private String state;
        private String zipCode;
        private String idPassportNumber;
        private String employerName;
        private String bankName;
        private String bankAccountNumber;
        private List<ReportDtos.DocumentUploadRequest> documents;
        public String getLoanType() { return loanType; }
        public void setLoanType(String loanType) { this.loanType = loanType; }
        public String getAmount() { return amount; }
        public void setAmount(String amount) { this.amount = amount; }
        public String getTerm() { return term; }
        public void setTerm(String term) { this.term = term; }
        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }
        public String getIncome() { return income; }
        public void setIncome(String income) { this.income = income; }
        public String getEmployment() { return employment; }
        public void setEmployment(String employment) { this.employment = employment; }
        public String getCreditScore() { return creditScore; }
        public void setCreditScore(String creditScore) { this.creditScore = creditScore; }
        public String getMobileMoneyAvg() { return mobileMoneyAvg; }
        public void setMobileMoneyAvg(String mobileMoneyAvg) { this.mobileMoneyAvg = mobileMoneyAvg; }
        public String getUtilityPaymentScore() { return utilityPaymentScore; }
        public void setUtilityPaymentScore(String utilityPaymentScore) { this.utilityPaymentScore = utilityPaymentScore; }
        public String getExistingDebt() { return existingDebt; }
        public void setExistingDebt(String existingDebt) { this.existingDebt = existingDebt; }
        public Map<String, String> getSectorDetails() { return sectorDetails; }
        public void setSectorDetails(Map<String, String> sectorDetails) { this.sectorDetails = sectorDetails; }
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
        public String getState() { return state; }
        public void setState(String state) { this.state = state; }
        public String getZipCode() { return zipCode; }
        public void setZipCode(String zipCode) { this.zipCode = zipCode; }
        public String getIdPassportNumber() { return idPassportNumber; }
        public void setIdPassportNumber(String idPassportNumber) { this.idPassportNumber = idPassportNumber; }
        public String getEmployerName() { return employerName; }
        public void setEmployerName(String employerName) { this.employerName = employerName; }
        public String getBankName() { return bankName; }
        public void setBankName(String bankName) { this.bankName = bankName; }
        public String getBankAccountNumber() { return bankAccountNumber; }
        public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }
        public List<ReportDtos.DocumentUploadRequest> getDocuments() { return documents; }
        public void setDocuments(List<ReportDtos.DocumentUploadRequest> documents) { this.documents = documents; }
    }

    public static class ApplicationResponse {
        private Long id;
        private String referenceId;
        private String loanType;
        private String purpose;
        private BigDecimal amount;
        private Integer termMonths;
        private String status;
        private Integer aiCreditScore;
        private Double approvalProbability;
        private BigDecimal recommendedAmount;
        private Double estimatedApr;
        private String aiSummary;
        private String rejectionReason;
        private LocalDate submittedDate;
        private LocalDate approvalDate;
        private String customerName;
        private String customerEmail;
        private BigDecimal monthlyIncome;
        private Integer existingCreditScore;
        private Double debtToIncome;
        private Map<String, String> sectorDetails;
        private ScoringInsights scoring;
        private Long loanId;
        private String aiRecommendation;
        private Long assignedOfficerId;
        private String collateralSummary;
        private List<CollateralAssetResponse> collaterals;
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getReferenceId() { return referenceId; }
        public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
        public String getLoanType() { return loanType; }
        public void setLoanType(String loanType) { this.loanType = loanType; }
        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public Integer getTermMonths() { return termMonths; }
        public void setTermMonths(Integer termMonths) { this.termMonths = termMonths; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Integer getAiCreditScore() { return aiCreditScore; }
        public void setAiCreditScore(Integer aiCreditScore) { this.aiCreditScore = aiCreditScore; }
        public Double getApprovalProbability() { return approvalProbability; }
        public void setApprovalProbability(Double approvalProbability) { this.approvalProbability = approvalProbability; }
        public BigDecimal getRecommendedAmount() { return recommendedAmount; }
        public void setRecommendedAmount(BigDecimal recommendedAmount) { this.recommendedAmount = recommendedAmount; }
        public Double getEstimatedApr() { return estimatedApr; }
        public void setEstimatedApr(Double estimatedApr) { this.estimatedApr = estimatedApr; }
        public String getAiSummary() { return aiSummary; }
        public void setAiSummary(String aiSummary) { this.aiSummary = aiSummary; }
        public String getRejectionReason() { return rejectionReason; }
        public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
        public LocalDate getSubmittedDate() { return submittedDate; }
        public void setSubmittedDate(LocalDate submittedDate) { this.submittedDate = submittedDate; }
        public LocalDate getApprovalDate() { return approvalDate; }
        public void setApprovalDate(LocalDate approvalDate) { this.approvalDate = approvalDate; }
        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        public String getCustomerEmail() { return customerEmail; }
        public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
        public BigDecimal getMonthlyIncome() { return monthlyIncome; }
        public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; }
        public Integer getExistingCreditScore() { return existingCreditScore; }
        public void setExistingCreditScore(Integer existingCreditScore) { this.existingCreditScore = existingCreditScore; }
        public Double getDebtToIncome() { return debtToIncome; }
        public void setDebtToIncome(Double debtToIncome) { this.debtToIncome = debtToIncome; }
        public Map<String, String> getSectorDetails() { return sectorDetails; }
        public void setSectorDetails(Map<String, String> sectorDetails) { this.sectorDetails = sectorDetails; }
        public ScoringInsights getScoring() { return scoring; }
        public void setScoring(ScoringInsights scoring) { this.scoring = scoring; }
        public Long getLoanId() { return loanId; }
        public void setLoanId(Long loanId) { this.loanId = loanId; }
        public String getAiRecommendation() { return aiRecommendation; }
        public void setAiRecommendation(String aiRecommendation) { this.aiRecommendation = aiRecommendation; }
        public Long getAssignedOfficerId() { return assignedOfficerId; }
        public void setAssignedOfficerId(Long assignedOfficerId) { this.assignedOfficerId = assignedOfficerId; }
        public String getCollateralSummary() { return collateralSummary; }
        public void setCollateralSummary(String collateralSummary) { this.collateralSummary = collateralSummary; }
        public List<CollateralAssetResponse> getCollaterals() { return collaterals; }
        public void setCollaterals(List<CollateralAssetResponse> collaterals) { this.collaterals = collaterals; }
    }

    public static class CollateralAssetResponse {
        private Long id;
        private String collateralType;
        private String description;
        private BigDecimal estimatedValue;
        private String identifier;
        private String lienStatus;
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
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
    }

    public static class AdminApplicationDetail extends ApplicationResponse {
        private List<ReportDtos.ApplicationNoteResponse> notes;
        public List<ReportDtos.ApplicationNoteResponse> getNotes() { return notes; }
        public void setNotes(List<ReportDtos.ApplicationNoteResponse> notes) { this.notes = notes; }
    }

    public static class AdminLoanResponse {
        private Long id;
        private String referenceId;
        private Long applicationId;
        private String applicationRef;
        private String customerName;
        private String customerEmail;
        private String customerPhone;
        private BigDecimal principal;
        private String status;
        private String disbursementStatus;
        private BigDecimal monthlyPayment;
        private java.time.Instant createdAt;
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getReferenceId() { return referenceId; }
        public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
        public Long getApplicationId() { return applicationId; }
        public void setApplicationId(Long applicationId) { this.applicationId = applicationId; }
        public String getApplicationRef() { return applicationRef; }
        public void setApplicationRef(String applicationRef) { this.applicationRef = applicationRef; }
        public String getCustomerName() { return customerName; }
        public void setCustomerName(String customerName) { this.customerName = customerName; }
        public String getCustomerEmail() { return customerEmail; }
        public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }
        public String getCustomerPhone() { return customerPhone; }
        public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }
        public BigDecimal getPrincipal() { return principal; }
        public void setPrincipal(BigDecimal principal) { this.principal = principal; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getDisbursementStatus() { return disbursementStatus; }
        public void setDisbursementStatus(String disbursementStatus) { this.disbursementStatus = disbursementStatus; }
        public BigDecimal getMonthlyPayment() { return monthlyPayment; }
        public void setMonthlyPayment(BigDecimal monthlyPayment) { this.monthlyPayment = monthlyPayment; }
        public java.time.Instant getCreatedAt() { return createdAt; }
        public void setCreatedAt(java.time.Instant createdAt) { this.createdAt = createdAt; }
    }

    public static class ScoringInsights {
        private Integer creditScore;
        private Double approvalProbability;
        private BigDecimal recommendedAmount;
        private Double estimatedApr;
        private String summary;
        private String recommendation;
        private List<FactorScore> factors;
        private List<AmountOption> amountOptions;
        public Integer getCreditScore() { return creditScore; }
        public void setCreditScore(Integer creditScore) { this.creditScore = creditScore; }
        public Double getApprovalProbability() { return approvalProbability; }
        public void setApprovalProbability(Double approvalProbability) { this.approvalProbability = approvalProbability; }
        public BigDecimal getRecommendedAmount() { return recommendedAmount; }
        public void setRecommendedAmount(BigDecimal recommendedAmount) { this.recommendedAmount = recommendedAmount; }
        public Double getEstimatedApr() { return estimatedApr; }
        public void setEstimatedApr(Double estimatedApr) { this.estimatedApr = estimatedApr; }
        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
        public String getRecommendation() { return recommendation; }
        public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
        public List<FactorScore> getFactors() { return factors; }
        public void setFactors(List<FactorScore> factors) { this.factors = factors; }
        public List<AmountOption> getAmountOptions() { return amountOptions; }
        public void setAmountOptions(List<AmountOption> amountOptions) { this.amountOptions = amountOptions; }
    }

    public static class FactorScore {
        private String name;
        private Integer value;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Integer getValue() { return value; }
        public void setValue(Integer value) { this.value = value; }
    }

    public static class AmountOption {
        private String name;
        private Integer value;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public Integer getValue() { return value; }
        public void setValue(Integer value) { this.value = value; }
    }

    public static class StatusUpdateRequest {
        @NotBlank private String status;
        private String rejectionReason;
        private String officerOverrideReason;
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getRejectionReason() { return rejectionReason; }
        public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
        public String getOfficerOverrideReason() { return officerOverrideReason; }
        public void setOfficerOverrideReason(String officerOverrideReason) { this.officerOverrideReason = officerOverrideReason; }
    }
}
