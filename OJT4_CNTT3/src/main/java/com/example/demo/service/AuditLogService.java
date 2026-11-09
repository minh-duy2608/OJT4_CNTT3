package com.example.demo.service;

import com.example.demo.dto.response.AuditLogResponse;
import com.example.demo.dto.response.PageResponse;
import jakarta.servlet.http.HttpServletRequest;

public interface AuditLogService {

    void log(Long actorUserId, String action, String entityType, String entityId, Long shopId, String details, HttpServletRequest request);

    void log(Long actorUserId, String action, String entityType, String entityId, Long shopId, String details);

    PageResponse<AuditLogResponse> getAdminAuditLogs(String action, String entityType, Long shopId, int page, int size);

    AuditLogResponse getAuditLogDetail(Long logId);

    PageResponse<AuditLogResponse> getShopAuditLogs(Long shopId, int page, int size, String currentUsername);
}

