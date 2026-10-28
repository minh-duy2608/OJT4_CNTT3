package com.example.demo.event;

import com.example.demo.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthEventListener {

    private final EmailService emailService;

    @EventListener
    public void handleUserRegistered(UserRegisteredEvent event) {
        log.info("[MICROSERVICE EVENT: USER_REGISTERED] User ID: {}, Email: {}", event.getUserId(), event.getEmail());
        if (event.getVerificationToken() != null) {
            emailService.sendVerificationOtp(event.getEmail(), event.getFullName(), event.getVerificationToken());
        }
    }

    @EventListener
    public void handlePasswordResetRequested(PasswordResetRequestedEvent event) {
        log.info("[MICROSERVICE EVENT: PASSWORD_RESET_REQUESTED] User ID: {}, Email: {}", event.getUserId(), event.getEmail());
        if (event.getResetToken() != null) {
            emailService.sendPasswordResetEmail(event.getEmail(), event.getResetToken());
        }
    }

    @EventListener
    public void handleEmailVerificationRequested(EmailVerificationRequestedEvent event) {
        log.info("[MICROSERVICE EVENT: EMAIL_VERIFICATION_REQUESTED] User ID: {}, Email: {}", event.getUserId(), event.getEmail());
        if (event.getVerificationToken() != null) {
            emailService.sendVerificationOtp(event.getEmail(), event.getFullName(), event.getVerificationToken());
        }
    }
}
