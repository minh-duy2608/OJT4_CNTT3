package com.example.demo.controller;

import com.example.demo.dto.request.ChangePasswordRequest;
import com.example.demo.dto.request.ForgotPasswordRequest;
import com.example.demo.dto.request.LoginRequest;
import com.example.demo.dto.request.LogoutRequest;
import com.example.demo.dto.request.RefreshTokenRequest;
import com.example.demo.dto.request.RegisterRequest;
import com.example.demo.dto.request.ResendVerificationRequest;
import com.example.demo.dto.request.ResetPasswordRequest;
import com.example.demo.dto.request.UpdateProfileRequest;
import com.example.demo.dto.request.VerifyEmailRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.LoginResponse;
import com.example.demo.dto.response.TokenRefreshResponse;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.service.AuthService;
import com.example.demo.service.RolePermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping({"/auth", "/api/v1/auth"})
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RolePermissionService rolePermissionService;

    /**
     * 1. POST /auth/register - Đăng ký tài khoản khách hàng (Public)
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.created("Đăng ký tài khoản thành công", response));
    }

    /**
     * 2. POST /auth/login - Đăng nhập, cấp JWT (Public)
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity
                .ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    /**
     * 3. POST /auth/refresh - Làm mới access token nếu triển khai refresh token (Public/Token hợp lệ)
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenRefreshResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        TokenRefreshResponse response = authService.refreshToken(request);
        return ResponseEntity
                .ok(ApiResponse.success("Làm mới token thành công", response));
    }

    /**
     * 4. POST /auth/logout - Đăng xuất, thu hồi refresh token nếu có cơ chế lưu trữ (Authenticated)
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            Principal principal,
            @RequestBody(required = false) LogoutRequest request
    ) {
        String currentUsername = principal != null ? principal.getName() : null;
        authService.logout(currentUsername, request);
        return ResponseEntity
                .ok(ApiResponse.success("Đăng xuất thành công", null));
    }

    /**
     * 5. GET /auth/me - Lấy thông tin tài khoản hiện tại (Authenticated)
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(Principal principal) {
        UserResponse response = authService.getCurrentUser(principal.getName());
        return ResponseEntity
                .ok(ApiResponse.success("Lấy thông tin tài khoản hiện tại thành công", response));
    }

    /**
     * 6. PATCH /auth/me - Cập nhật thông tin cá nhân (Authenticated)
     */
    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            Principal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UserResponse response = authService.updateProfile(principal.getName(), request);
        return ResponseEntity
                .ok(ApiResponse.success("Cập nhật thông tin cá nhân thành công", response));
    }

    /**
     * 7. PATCH /auth/me/password - Đổi mật khẩu (Authenticated)
     */
    @PatchMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Principal principal,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(principal.getName(), request);
        return ResponseEntity
                .ok(ApiResponse.success("Đổi mật khẩu thành công", null));
    }

    /**
     * 8. POST /auth/forgot-password - Yêu cầu khôi phục mật khẩu (Public)
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Map<String, String>>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        Map<String, String> response = authService.forgotPassword(request);
        return ResponseEntity
                .ok(ApiResponse.success("Yêu cầu khôi phục mật khẩu đã được tiếp nhận", response));
    }

    /**
     * 9. POST /auth/reset-password - Đặt lại mật khẩu bằng token hợp lệ (Public)
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        authService.resetPassword(request);
        return ResponseEntity
                .ok(ApiResponse.success("Đặt lại mật khẩu thành công", null));
    }

    /**
     * 10. POST /auth/verify-email - Xác minh email nếu hệ thống hỗ trợ (Public)
     */
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request
    ) {
        authService.verifyEmail(request);
        return ResponseEntity
                .ok(ApiResponse.success("Xác minh email thành công", null));
    }

    /**
     * 11. POST /auth/resend-verification - Gửi lại email xác minh (Public)
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Map<String, String>>> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request
    ) {
        Map<String, String> response = authService.resendVerification(request);
        return ResponseEntity
                .ok(ApiResponse.success("Yêu cầu gửi lại email xác minh thành công", response));
    }

    /**
     * STT 26: GET /auth/me/permissions - Danh sách quyền của người dùng hiện tại (Authenticated)
     */
    @GetMapping({"/me/permissions", "/permissions"})
    public ResponseEntity<ApiResponse<Set<String>>> getMyPermissions(Principal principal) {
        Set<String> permissions = rolePermissionService.getCurrentUserPermissions(principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách quyền của người dùng hiện tại thành công", permissions));
    }
}
