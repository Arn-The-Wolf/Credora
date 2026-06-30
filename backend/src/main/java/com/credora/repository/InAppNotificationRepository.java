package com.credora.repository;

import com.credora.model.InAppNotification;
import com.credora.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InAppNotificationRepository extends JpaRepository<InAppNotification, Long> {
    List<InAppNotification> findByUserOrderByCreatedAtDesc(User user);
    long countByUserAndReadAtIsNull(User user);
}
