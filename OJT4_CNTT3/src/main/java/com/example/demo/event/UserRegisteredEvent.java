package com.example.demo.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserRegisteredEvent {
    private final Long userId;
    private final String username;
    private final String email;
    private final String fullName;
    private final String verificationToken;

    public UserRegisteredEvent(Long userId, String username, String email, String verificationToken) {
        this(userId, username, email, null, verificationToken);
    }
}
