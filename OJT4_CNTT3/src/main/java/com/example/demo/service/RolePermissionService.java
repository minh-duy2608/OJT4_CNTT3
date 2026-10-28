package com.example.demo.service;

import com.example.demo.dto.request.AssignRolePermissionsRequest;
import com.example.demo.dto.request.CreateRoleRequest;
import com.example.demo.dto.request.UpdateRoleRequest;
import com.example.demo.dto.response.PermissionResponse;
import com.example.demo.dto.response.RoleDetailResponse;
import com.example.demo.dto.response.RoleResponse;

import java.util.List;
import java.util.Set;

public interface RolePermissionService {

    /**
     * API 18: GET /admin/roles - Danh sách vai trò
     */
    List<RoleResponse> getAllRoles();

    /**
     * API 19: GET /admin/roles/{roleId} - Chi tiết vai trò kèm permissions
     */
    RoleDetailResponse getRoleById(Long roleId);

    /**
     * API 20: POST /admin/roles - Tạo vai trò mới (tùy chỉnh)
     */
    RoleDetailResponse createRole(CreateRoleRequest request);

    /**
     * API 21: PATCH /admin/roles/{roleId} - Cập nhật thông tin vai trò
     */
    RoleDetailResponse updateRole(Long roleId, UpdateRoleRequest request);

    /**
     * API 22: DELETE /admin/roles/{roleId} - Xóa vai trò tùy chỉnh
     */
    void deleteRole(Long roleId);

    /**
     * API 23: GET /admin/permissions - Danh sách tất cả quyền trong hệ thống
     */
    List<PermissionResponse> getAllPermissions();

    /**
     * API 24: GET /admin/roles/{roleId}/permissions - Danh sách quyền của vai trò
     */
    List<PermissionResponse> getRolePermissions(Long roleId);

    /**
     * API 25: PUT /admin/roles/{roleId}/permissions - Gán hoặc thay thế danh sách quyền của vai trò
     */
    List<PermissionResponse> assignRolePermissions(Long roleId, AssignRolePermissionsRequest request);

    /**
     * API 26: GET /auth/me/permissions - Danh sách quyền của người dùng hiện tại
     */
    Set<String> getCurrentUserPermissions(String username);
}
