package com.example.demo.service;

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
import com.example.demo.dto.response.LoginResponse;
import com.example.demo.dto.response.TokenRefreshResponse;
import com.example.demo.dto.response.UserResponse;

import java.util.Map;

public interface AuthService {

    /**
     * 1. POST /auth/register - Đăng ký tài khoản khách hàng (Public)
     */
    UserResponse register(RegisterRequest request);

    /**
     * 2. POST /auth/login - Đăng nhập, cấp JWT (Public)
     */
    LoginResponse login(LoginRequest request);

    /**
     * 3. POST /auth/refresh - Làm mới access token bằng refresh token (Public / Token hợp lệ)
     */
    TokenRefreshResponse refreshToken(RefreshTokenRequest request);

    /**
     * 4. POST /auth/logout - Đăng xuất, thu hồi refresh token (Authenticated)
     */
    void logout(String currentUsername, LogoutRequest request);

    /**
     * 5. GET /auth/me - Lấy thông tin tài khoản hiện tại (Authenticated)
     */
    UserResponse getCurrentUser(String currentUsername);

    /**
     * 6. PATCH /auth/me - Cập nhật thông tin cá nhân (Authenticated)
     */
    UserResponse updateProfile(String currentUsername, UpdateProfileRequest request);

    /**
     * 7. PATCH /auth/me/password - Đổi mật khẩu (Authenticated)
     */
    void changePassword(String currentUsername, ChangePasswordRequest request);

    /**
     * 8. POST /auth/forgot-password - Yêu cầu khôi phục mật khẩu (Public)
     */
    Map<String, String> forgotPassword(ForgotPasswordRequest request);

    /**
     * 9. POST /auth/reset-password - Đặt lại mật khẩu bằng token hợp lệ (Public)
     */
    void resetPassword(ResetPasswordRequest request);

    /**
     * 10. POST /auth/verify-email - Xác minh email bằng token (Public)
     */
    void verifyEmail(VerifyEmailRequest request);

    /**
     * 11. POST /auth/resend-verification - Gửi lại email xác minh (Public)
     */
    Map<String, String> resendVerification(ResendVerificationRequest request);
}
