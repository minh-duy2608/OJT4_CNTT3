package com.example.demo.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogoutRequest {

    /**
     * Optional refresh token to revoke. If null, all active refresh tokens for the authenticated user will be revoked.
     */
    private String refreshToken;
}

