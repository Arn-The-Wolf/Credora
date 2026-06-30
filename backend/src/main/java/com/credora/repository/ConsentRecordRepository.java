package com.credora.repository;

import com.credora.model.ConsentRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsentRecordRepository extends JpaRepository<ConsentRecord, Long> {
    boolean existsByUser_IdAndConsentType(Long userId, String consentType);
}
