package com.example.demo.service;

import com.example.demo.dto.request.AdminAssignRolesRequest;
import com.example.demo.dto.request.AdminUpdateUserRequest;
import com.example.demo.dto.request.AdminUpdateUserStatusRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.RoleResponse;
import com.example.demo.dto.response.UserDetailResponse;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.entity.UserStatus;

import java.util.List;

public interface AdminUserService {

    /**
     * API 12: GET /admin/users - Lấy danh sách người dùng có phân trang, tìm kiếm và lọc
     */
    PageResponse<UserResponse> getUsers(
            String keyword,
            String role,
            UserStatus status,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    /**
     * API 13: GET /admin/users/{userId} - Lấy chi tiết thông tin người dùng
     */
    UserDetailResponse getUserById(Long userId);

    /**
     * API 14: PATCH /admin/users/{userId} - Cập nhật thông tin quản trị được phép sửa
     */
    UserResponse updateUser(Long userId, AdminUpdateUserRequest request);

    /**
     * API 15: PATCH /admin/users/{userId}/status - Khóa, mở khóa hoặc thay đổi trạng thái tài khoản
     */
    UserResponse updateUserStatus(String currentAdminUsername, Long userId, AdminUpdateUserStatusRequest request);

    /**
     * API 16: GET /admin/users/{userId}/roles - Danh sách vai trò của người dùng
     */
    List<RoleResponse> getUserRoles(Long userId);

    /**
     * API 17: PUT /admin/users/{userId}/roles - Gán hoặc thay thế tập vai trò hệ thống theo chính sách
     */
    List<RoleResponse> assignUserRoles(String currentAdminUsername, Long userId, AdminAssignRolesRequest request);
}

