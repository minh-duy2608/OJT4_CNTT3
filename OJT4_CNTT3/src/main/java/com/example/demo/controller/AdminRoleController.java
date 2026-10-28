package com.example.demo.controller;

import com.example.demo.dto.request.AssignRolePermissionsRequest;
import com.example.demo.dto.request.CreateRoleRequest;
import com.example.demo.dto.request.UpdateRoleRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PermissionResponse;
import com.example.demo.dto.response.RoleDetailResponse;
import com.example.demo.dto.response.RoleResponse;
import com.example.demo.service.RolePermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/admin/roles", "/api/v1/admin/roles"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminRoleController {

    private final RolePermissionService rolePermissionService;

    /**
     * STT 18: GET /admin/roles - Danh sách vai trò
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        List<RoleResponse> roles = rolePermissionService.getAllRoles();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách vai trò thành công", roles));
    }

    /**
     * STT 19: GET /admin/roles/{roleId} - Chi tiết vai trò kèm danh sách quyền
     */
    @GetMapping("/{roleId}")
    public ResponseEntity<ApiResponse<RoleDetailResponse>> getRoleById(@PathVariable Long roleId) {
        RoleDetailResponse role = rolePermissionService.getRoleById(roleId);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết vai trò thành công", role));
    }

    /**
     * STT 20: POST /admin/roles - Tạo vai trò mới nếu cho phép mở rộng
     */
    @PostMapping
    public ResponseEntity<ApiResponse<RoleDetailResponse>> createRole(@Valid @RequestBody CreateRoleRequest request) {
        RoleDetailResponse created = rolePermissionService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo vai trò mới thành công", created));
    }

    /**
     * STT 21: PATCH /admin/roles/{roleId} - Cập nhật vai trò (tên hiển thị, mô tả)
     */
    @PatchMapping("/{roleId}")
    public ResponseEntity<ApiResponse<RoleDetailResponse>> updateRole(
            @PathVariable Long roleId,
            @Valid @RequestBody UpdateRoleRequest request
    ) {
        RoleDetailResponse updated = rolePermissionService.updateRole(roleId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vai trò thành công", updated));
    }

    /**
     * STT 22: DELETE /admin/roles/{roleId} - Xóa vai trò tùy chỉnh không còn được sử dụng
     */
    @DeleteMapping("/{roleId}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable Long roleId) {
        rolePermissionService.deleteRole(roleId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa vai trò tùy chỉnh thành công", null));
    }

    /**
     * STT 24: GET /admin/roles/{roleId}/permissions - Danh sách quyền của vai trò
     */
    @GetMapping("/{roleId}/permissions")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getRolePermissions(@PathVariable Long roleId) {
        List<PermissionResponse> permissions = rolePermissionService.getRolePermissions(roleId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách quyền của vai trò thành công", permissions));
    }

    /**
     * STT 25: PUT /admin/roles/{roleId}/permissions - Gán hoặc thay thế danh sách quyền của vai trò
     */
    @PutMapping("/{roleId}/permissions")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> assignRolePermissions(
            @PathVariable Long roleId,
            @Valid @RequestBody AssignRolePermissionsRequest request
    ) {
        List<PermissionResponse> permissions = rolePermissionService.assignRolePermissions(roleId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật quyền cho vai trò thành công", permissions));
    }
}
