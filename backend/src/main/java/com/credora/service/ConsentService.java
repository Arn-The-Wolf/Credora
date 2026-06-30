package com.credora.service;

import com.credora.model.ConsentRecord;
import com.credora.model.User;
import com.credora.repository.ConsentRecordRepository;
import com.credora.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class ConsentService {

    private final ConsentRecordRepository consentRepository;
    private final UserRepository userRepository;

    public ConsentService(ConsentRecordRepository consentRepository, UserRepository userRepository) {
        this.consentRepository = consentRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void recordConsent(User user, String type, String version, String ip) {
        ConsentRecord record = new ConsentRecord();
        record.setUser(user);
        record.setConsentType(type);
        record.setVersion(version != null ? version : "1.0");
        record.setIpAddress(ip);
        consentRepository.save(record);

        if ("TERMS".equals(type)) user.setTermsAcceptedAt(Instant.now());
        if ("PRIVACY".equals(type)) user.setPrivacyAcceptedAt(Instant.now());
        if ("CREDIT_BUREAU".equals(type)) user.setCreditConsentAt(Instant.now());
        userRepository.save(user);
    }

    public boolean hasConsent(Long userId, String type) {
        return consentRepository.existsByUser_IdAndConsentType(userId, type);
    }
}
