package com.example.demo.controller;

import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PermissionResponse;
import com.example.demo.service.RolePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/admin/permissions", "/api/v1/admin/permissions"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPermissionController {

    private final RolePermissionService rolePermissionService;

    /**
     * STT 23: GET /admin/permissions - Danh sách tất cả quyền trong hệ thống
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAllPermissions() {
        List<PermissionResponse> permissions = rolePermissionService.getAllPermissions();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách quyền hệ thống thành công", permissions));
    }
}
