package com.example.demo.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AuthEventListener {

    @EventListener
    public void handleUserRegistered(UserRegisteredEvent event) {
        log.info("================================================================================");
        log.info("[MICROSERVICE EVENT: USER_REGISTERED]");
        log.info("User ID: {}, Username: {}, Email: {}", event.getUserId(), event.getUsername(), event.getEmail());
        if (event.getVerificationToken() != null) {
            log.info("Simulated Email Verification Link: http://localhost:3000/auth/verify-email?token={}", event.getVerificationToken());
            log.info("Verification Token: {}", event.getVerificationToken());
        }
        log.info("================================================================================");
    }

    @EventListener
    public void handlePasswordResetRequested(PasswordResetRequestedEvent event) {
        log.info("================================================================================");
        log.info("[MICROSERVICE EVENT: PASSWORD_RESET_REQUESTED]");
        log.info("User ID: {}, Email: {}", event.getUserId(), event.getEmail());
        log.info("Simulated Password Reset Link: http://localhost:3000/auth/reset-password?token={}", event.getResetToken());
        log.info("Reset Token: {}", event.getResetToken());
        log.info("================================================================================");
    }

    @EventListener
    public void handleEmailVerificationRequested(EmailVerificationRequestedEvent event) {
        log.info("================================================================================");
        log.info("[MICROSERVICE EVENT: EMAIL_VERIFICATION_REQUESTED]");
        log.info("User ID: {}, Email: {}", event.getUserId(), event.getEmail());
        log.info("Simulated Email Verification Link: http://localhost:3000/auth/verify-email?token={}", event.getVerificationToken());
        log.info("Verification Token: {}", event.getVerificationToken());
        log.info("================================================================================");
    }
}

