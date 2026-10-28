package com.example.demo.controller;

import com.example.demo.dto.request.AdminAssignRolesRequest;
import com.example.demo.dto.request.AdminUpdateUserRequest;
import com.example.demo.dto.request.AdminUpdateUserStatusRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.RoleResponse;
import com.example.demo.dto.response.UserDetailResponse;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.entity.UserStatus;
import com.example.demo.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/admin/users", "/api/v1/admin/users"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    /**
     * STT 12: GET /admin/users - Danh sách người dùng (hỗ trợ tìm kiếm, lọc theo vai trò & trạng thái, phân trang)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> getUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        PageResponse<UserResponse> response = adminUserService.getUsers(
                keyword, role, status, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng thành công", response));
    }

    /**
     * STT 13: GET /admin/users/{userId} - Chi tiết người dùng (thông tin tài khoản, danh sách vai trò, địa chỉ)
     */
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getUserById(@PathVariable Long userId) {
        UserDetailResponse response = adminUserService.getUserById(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin chi tiết người dùng thành công", response));
    }

    /**
     * STT 14: PATCH /admin/users/{userId} - Cập nhật thông tin quản trị được phép sửa (họ tên, SĐT, avatar, trạng thái xác thực email)
     */
    @PatchMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long userId,
            @Valid @RequestBody AdminUpdateUserRequest request
    ) {
        UserResponse response = adminUserService.updateUser(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin người dùng thành công", response));
    }

    /**
     * STT 15: PATCH /admin/users/{userId}/status - Khóa hoặc mở khóa tài khoản / thay đổi trạng thái (LOCKED, ACTIVE, DELETED)
     */
    @PatchMapping("/{userId}/status")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            Authentication authentication,
            @PathVariable Long userId,
            @Valid @RequestBody AdminUpdateUserStatusRequest request
    ) {
        UserResponse response = adminUserService.updateUserStatus(authentication.getName(), userId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái người dùng thành công", response));
    }

    /**
     * STT 16: GET /admin/users/{userId}/roles - Danh sách vai trò của người dùng
     */
    @GetMapping("/{userId}/roles")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getUserRoles(@PathVariable Long userId) {
        List<RoleResponse> response = adminUserService.getUserRoles(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách vai trò của người dùng thành công", response));
    }

    /**
     * STT 17: PUT /admin/users/{userId}/roles - Gán hoặc thay thế tập vai trò hệ thống theo chính sách
     */
    @PutMapping("/{userId}/roles")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> assignUserRoles(
            Authentication authentication,
            @PathVariable Long userId,
            @Valid @RequestBody AdminAssignRolesRequest request
    ) {
        List<RoleResponse> response = adminUserService.assignUserRoles(authentication.getName(), userId, request);
        return ResponseEntity.ok(ApiResponse.success("Gán và thay thế tập vai trò hệ thống thành công", response));
    }
}
