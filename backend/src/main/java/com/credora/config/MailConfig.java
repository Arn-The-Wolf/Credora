package com.credora.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@Configuration
public class MailConfig {

    /** No-op mail sender for console/dev mode when SMTP is unavailable */
    @Bean
    @ConditionalOnMissingBean(JavaMailSender.class)
    public JavaMailSender noopMailSender() {
        return new JavaMailSenderImpl() {
            @Override
            public void send(SimpleMailMessage simpleMessage) {
                // handled by EmailService console mode
            }
        };
    }
}
