package com.example.demo.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class EmailVerificationRequestedEvent {
    private final Long userId;
    private final String email;
    private final String verificationToken;
}

