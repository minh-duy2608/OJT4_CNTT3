package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private Long actorUserId;
    private String actorUsername;
    private String actorFullName;
    private String action;
    private String entityType;
    private String entityId;
    private Long shopId;
    private String shopName;
    private String ipAddress;
    private String userAgent;
    private String details;
    private LocalDateTime createdAt;
}

