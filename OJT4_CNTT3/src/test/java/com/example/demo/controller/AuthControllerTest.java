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
import com.example.demo.dto.response.LoginResponse;
import com.example.demo.dto.response.TokenRefreshResponse;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.entity.Role;
import com.example.demo.entity.UserStatus;
import com.example.demo.exception.ConflictException;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("TC-AUTH & TC-VAL: AuthController 11 Microservice APIs Tests")
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private Principal mockPrincipal;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mockPrincipal = () -> "nguyenvan_a";
    }

    @Test
    @DisplayName("API 1: POST /auth/register thành công trả về 201 Created")
    void register_success() throws Exception {
        UserResponse response = UserResponse.builder()
                .id(1L)
                .username("nguyenvan_a")
                .email("vana@example.com")
                .fullName("Nguyễn Văn A")
                .role(Role.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        String jsonPayload = """
                {
                    "username": "nguyenvan_a",
                    "email": "vana@example.com",
                    "password": "SecurePassword123!",
                    "fullName": "Nguyễn Văn A"
                }
                """;

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").value(201))
                .andExpect(jsonPath("$.data.username").value("nguyenvan_a"))
                .andExpect(jsonPath("$.data.email").value("vana@example.com"));
    }

    @Test
    @DisplayName("API 1 (Conflict): POST /auth/register trùng lặp email trả về 409 Conflict")
    void register_conflict_email() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new ConflictException("Email already registered"));

        String jsonPayload = """
                {
                    "username": "nguyenvan_a",
                    "email": "vana@example.com",
                    "password": "SecurePassword123!",
                    "fullName": "Nguyễn Văn A"
                }
                """;

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(409))
                .andExpect(jsonPath("$.message").value("Email already registered"));
    }

    @Test
    @DisplayName("API 2: POST /auth/login thành công trả về JWT Token và 200 OK")
    void login_success() throws Exception {
        LoginResponse response = LoginResponse.builder()
                .accessToken("mocked-jwt-access-token")
                .refreshToken("mocked-refresh-token")
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .user(UserResponse.builder().id(1L).username("nguyenvan_a").email("vana@example.com").build())
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        String jsonPayload = """
                {
                    "username": "nguyenvan_a",
                    "password": "SecurePassword123!"
                }
                """;

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.accessToken").value("mocked-jwt-access-token"))
                .andExpect(jsonPath("$.data.refreshToken").value("mocked-refresh-token"));
    }

    @Test
    @DisplayName("API 2 (Fail): POST /auth/login sai mật khẩu trả về 401 Unauthorized")
    void login_badCredentials() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        String jsonPayload = """
                {
                    "username": "nguyenvan_a",
                    "password": "WrongPassword!"
                }
                """;

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("API 3: POST /auth/refresh làm mới access token thành công")
    void refresh_success() throws Exception {
        TokenRefreshResponse response = TokenRefreshResponse.builder()
                .accessToken("new-jwt-access-token")
                .refreshToken("new-refresh-token")
                .tokenType("Bearer")
                .expiresIn(86400000L)
                .build();

        when(authService.refreshToken(any(RefreshTokenRequest.class))).thenReturn(response);

        String jsonPayload = """
                {
                    "refreshToken": "valid-old-refresh-token"
                }
                """;

        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new-jwt-access-token"))
                .andExpect(jsonPath("$.data.refreshToken").value("new-refresh-token"));
    }

    @Test
    @DisplayName("API 4: POST /auth/logout đăng xuất thành công")
    void logout_success() throws Exception {
        doNothing().when(authService).logout(eq("nguyenvan_a"), any());

        String jsonPayload = """
                {
                    "refreshToken": "some-refresh-token"
                }
                """;

        mockMvc.perform(post("/auth/logout")
                        .principal(mockPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đăng xuất thành công"));
    }

    @Test
    @DisplayName("API 5: GET /auth/me lấy thông tin tài khoản hiện tại thành công")
    void getCurrentUser_success() throws Exception {
        UserResponse response = UserResponse.builder()
                .id(1L)
                .username("nguyenvan_a")
                .email("vana@example.com")
                .fullName("Nguyễn Văn A")
                .role(Role.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build();

        when(authService.getCurrentUser("nguyenvan_a")).thenReturn(response);

        mockMvc.perform(get("/auth/me")
                        .principal(mockPrincipal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("nguyenvan_a"))
                .andExpect(jsonPath("$.data.email").value("vana@example.com"));
    }

    @Test
    @DisplayName("API 6: PATCH /auth/me cập nhật thông tin cá nhân thành công")
    void updateProfile_success() throws Exception {
        UserResponse response = UserResponse.builder()
                .id(1L)
                .username("nguyenvan_a")
                .email("vana@example.com")
                .fullName("Nguyễn Văn A Mới")
                .phone("0912345678")
                .avatarUrl("https://example.com/avatar.jpg")
                .role(Role.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build();

        when(authService.updateProfile(eq("nguyenvan_a"), any(UpdateProfileRequest.class))).thenReturn(response);

        String jsonPayload = """
                {
                    "fullName": "Nguyễn Văn A Mới",
                    "phone": "0912345678",
                    "avatarUrl": "https://example.com/avatar.jpg"
                }
                """;

        mockMvc.perform(patch("/auth/me")
                        .principal(mockPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Nguyễn Văn A Mới"))
                .andExpect(jsonPath("$.data.phone").value("0912345678"));
    }

    @Test
    @DisplayName("API 7: PATCH /auth/me/password đổi mật khẩu thành công")
    void changePassword_success() throws Exception {
        doNothing().when(authService).changePassword(eq("nguyenvan_a"), any(ChangePasswordRequest.class));

        String jsonPayload = """
                {
                    "currentPassword": "OldPassword123!",
                    "newPassword": "NewPassword123!",
                    "confirmPassword": "NewPassword123!"
                }
                """;

        mockMvc.perform(patch("/auth/me/password")
                        .principal(mockPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đổi mật khẩu thành công"));
    }

    @Test
    @DisplayName("API 8: POST /auth/forgot-password gửi yêu cầu khôi phục mật khẩu thành công")
    void forgotPassword_success() throws Exception {
        when(authService.forgotPassword(any(ForgotPasswordRequest.class)))
                .thenReturn(Map.of("message", "Hướng dẫn đặt lại mật khẩu đã được gửi.", "resetToken", "uuid-token"));

        String jsonPayload = """
                {
                    "email": "vana@example.com"
                }
                """;

        mockMvc.perform(post("/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resetToken").value("uuid-token"));
    }

    @Test
    @DisplayName("API 9: POST /auth/reset-password đặt lại mật khẩu thành công")
    void resetPassword_success() throws Exception {
        doNothing().when(authService).resetPassword(any(ResetPasswordRequest.class));

        String jsonPayload = """
                {
                    "token": "valid-reset-token",
                    "newPassword": "NewPassword123!",
                    "confirmPassword": "NewPassword123!"
                }
                """;

        mockMvc.perform(post("/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đặt lại mật khẩu thành công"));
    }

    @Test
    @DisplayName("API 10: POST /auth/verify-email xác minh email thành công")
    void verifyEmail_success() throws Exception {
        doNothing().when(authService).verifyEmail(any(VerifyEmailRequest.class));

        String jsonPayload = """
                {
                    "token": "valid-verify-token"
                }
                """;

        mockMvc.perform(post("/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xác minh email thành công"));
    }

    @Test
    @DisplayName("API 11: POST /auth/resend-verification gửi lại email xác minh thành công")
    void resendVerification_success() throws Exception {
        when(authService.resendVerification(any(ResendVerificationRequest.class)))
                .thenReturn(Map.of("message", "Mã xác minh mới đã được gửi.", "verificationToken", "new-verify-token"));

        String jsonPayload = """
                {
                    "email": "vana@example.com"
                }
                """;

        mockMvc.perform(post("/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.verificationToken").value("new-verify-token"));
    }
}
