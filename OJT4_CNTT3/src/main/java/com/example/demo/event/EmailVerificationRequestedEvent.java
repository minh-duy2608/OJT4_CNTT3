package com.example.demo.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class EmailVerificationRequestedEvent {
    private final Long userId;
    private final String email;
    private final String fullName;
    private final String verificationToken;

    public EmailVerificationRequestedEvent(Long userId, String email, String verificationToken) {
        this(userId, email, null, verificationToken);
    }
}
