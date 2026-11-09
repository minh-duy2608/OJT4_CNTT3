package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.AuditLogResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Tag(name = "20. Audit Log API - Nhật ký hệ thống", description = "Truy vết nhật ký thao tác quan trọng trên hệ thống và cửa hàng")
@RestController
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    /**
     * STT 160: GET /admin/audit-logs - Danh sách nhật ký hoạt động (ADMIN)
     */
    @GetMapping({"/admin/audit-logs", "/api/v1/admin/audit-logs"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<AuditLogResponse>>> getAdminAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Long shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        PageResponse<AuditLogResponse> response = auditLogService.getAdminAuditLogs(action, entityType, shopId, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhật ký hoạt động thành công", response));
    }

    /**
     * STT 161: GET /admin/audit-logs/{logId} - Chi tiết một bản ghi nhật ký (ADMIN)
     */
    @GetMapping({"/admin/audit-logs/{logId}", "/api/v1/admin/audit-logs/{logId}"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<AuditLogResponse>> getAuditLogDetail(@PathVariable Long logId) {
        AuditLogResponse response = auditLogService.getAuditLogDetail(logId);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết bản ghi nhật ký thành công", response));
    }

    /**
     * STT 162: GET /shops/{shopId}/audit-logs - Nhật ký trong phạm vi cửa hàng (Shop permission)
     */
    @GetMapping({"/shops/{shopId}/audit-logs", "/api/v1/shops/{shopId}/audit-logs"})
    public ResponseEntity<ApiResponse<PageResponse<AuditLogResponse>>> getShopAuditLogs(
            @PathVariable Long shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<AuditLogResponse> response = auditLogService.getShopAuditLogs(shopId, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhật ký của cửa hàng thành công", response));
    }
}
