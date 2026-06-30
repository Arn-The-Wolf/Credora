package com.credora.service;

import com.credora.model.InAppNotification;
import com.credora.model.User;
import com.credora.repository.InAppNotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final InAppNotificationRepository notificationRepository;
    private final EmailService emailService;

    public NotificationService(InAppNotificationRepository notificationRepository, EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.emailService = emailService;
    }

    @Transactional
    public void notify(User user, String title, String message, String category) {
        InAppNotification n = new InAppNotification();
        n.setUser(user);
        n.setTitle(title);
        n.setMessage(message);
        n.setCategory(category);
        notificationRepository.save(n);
        if (user.getEmail() != null && ("APPLICATION".equals(category) || "PAYMENT".equals(category))) {
            emailService.send(user.getEmail(), title, message);
        }
    }

    public List<NotificationDto> listForUser(User user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public long unreadCount(User user) {
        return notificationRepository.countByUserAndReadAtIsNull(user);
    }

    @Transactional
    public void markRead(Long userId, Long notificationId) {
        InAppNotification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Notification not found"));
        if (!n.getUser().getId().equals(userId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Access denied");
        }
        n.setReadAt(Instant.now());
        notificationRepository.save(n);
    }

    private NotificationDto toDto(InAppNotification n) {
        NotificationDto d = new NotificationDto();
        d.setId(n.getId());
        d.setTitle(n.getTitle());
        d.setMessage(n.getMessage());
        d.setCategory(n.getCategory());
        d.setRead(n.getReadAt() != null);
        d.setCreatedAt(n.getCreatedAt() != null ? n.getCreatedAt().toString() : null);
        return d;
    }

    public static class NotificationDto {
        private Long id;
        private String title;
        private String message;
        private String category;
        private boolean read;
        private String createdAt;
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public boolean isRead() { return read; }
        public void setRead(boolean read) { this.read = read; }
        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    }
}
