package com.credora.config;

import com.credora.model.Institution;
import com.credora.model.InstitutionRole;
import com.credora.model.User;
import com.credora.repository.InstitutionRepository;
import com.credora.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;

@Configuration
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    CommandLineRunner seedDemoAccounts(UserRepository userRepository,
                                     InstitutionRepository institutionRepository,
                                     PasswordEncoder passwordEncoder) {
        return args -> {
            if (!userRepository.existsByEmail("demo@credora.test")) {
                User demo = new User();
                demo.setFullName("Demo Applicant");
                demo.setEmail("demo@credora.test");
                demo.setPassword(passwordEncoder.encode("Password123!"));
                demo.setPhoneNumber("+254712345678");
                demo.setEmploymentStatus("full_time");
                demo.setEmailVerified(true);
                demo.setTermsAcceptedAt(Instant.now());
                demo.setPrivacyAcceptedAt(Instant.now());
                userRepository.save(demo);
                log.info("Seeded demo applicant: demo@credora.test / Password123!");
            }

            if (!institutionRepository.existsByInstitutionEmail("admin@credora.test")) {
                Institution inst = new Institution();
                inst.setInstitutionName("Credora Demo SACCO");
                inst.setRegistrationLicenseNumber("SACCO-DEMO-001");
                inst.setContactPersonName("Demo Admin");
                inst.setInstitutionEmail("admin@credora.test");
                inst.setPassword(passwordEncoder.encode("Password123!"));
                inst.setPhoneNumber("+254700000000");
                inst.setRole(InstitutionRole.SUPER_ADMIN);
                institutionRepository.save(inst);
                log.info("Seeded demo institution: admin@credora.test / Password123!");
            }
        };
    }
}
