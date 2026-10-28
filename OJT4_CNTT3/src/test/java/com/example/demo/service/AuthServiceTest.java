package com.example.demo.service;

import com.example.demo.config.security.CustomUserDetails;
import com.example.demo.config.security.JwtTokenProvider;
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
import com.example.demo.entity.EmailVerificationToken;
import com.example.demo.entity.PasswordResetToken;
import com.example.demo.entity.RefreshToken;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.entity.UserStatus;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ConflictException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.EmailVerificationTokenRepository;
import com.example.demo.repository.PasswordResetTokenRepository;
import com.example.demo.repository.RefreshTokenRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.impl.AuthServiceImpl;
import com.example.demo.event.EmailVerificationRequestedEvent;
import com.example.demo.event.PasswordResetRequestedEvent;
import com.example.demo.event.UserRegisteredEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TC-AUTH: AuthService 11 Microservice APIs Unit Tests")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private AuthServiceImpl authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User user;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .username("nguyenvan_a")
                .email("vana@example.com")
                .password("SecurePassword123!")
                .fullName("Nguyễn Văn A")
                .build();

        loginRequest = LoginRequest.builder()
                .username("nguyenvan_a")
                .password("SecurePassword123!")
                .build();

        user = User.builder()
                .id(1L)
                .username("nguyenvan_a")
                .email("vana@example.com")
                .password("encoded_secure_password")
                .fullName("Nguyễn Văn A")
                .role(Role.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("API 1: Đăng ký tài khoản mới thành công")
    void register_success() {
        when(userRepository.existsByUsername("nguyenvan_a")).thenReturn(false);
        when(userRepository.existsByEmail("vana@example.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePassword123!")).thenReturn("encoded_secure_password");
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(tokenProvider.getEmailVerificationExpirationMs()).thenReturn(86400000L);

        UserResponse response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals("nguyenvan_a", response.getUsername());
        assertEquals("vana@example.com", response.getEmail());
        assertEquals(Role.ROLE_USER, response.getRole());
        assertEquals(UserStatus.ACTIVE, response.getStatus());

        verify(userRepository).save(any(User.class));
        verify(emailVerificationTokenRepository).save(any(EmailVerificationToken.class));
        verify(eventPublisher).publishEvent(any(UserRegisteredEvent.class));
    }

    @Test
    @DisplayName("API 1: Đăng ký thất bại khi username đã tồn tại")
    void register_conflict_username() {
        when(userRepository.existsByUsername("nguyenvan_a")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(registerRequest));
        assertEquals("Username already exists", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("API 1: Đăng ký thất bại khi email đã tồn tại")
    void register_conflict_email() {
        when(userRepository.existsByUsername("nguyenvan_a")).thenReturn(false);
        when(userRepository.existsByEmail("vana@example.com")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(registerRequest));
        assertEquals("Email already registered", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("API 2: Đăng nhập thành công trả về JWT Token và Refresh Token")
    void login_success() {
        CustomUserDetails userDetails = new CustomUserDetails(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(tokenProvider.generateToken(userDetails)).thenReturn("mocked.jwt.token");
        when(tokenProvider.getExpirationMs()).thenReturn(86400000L);
        when(tokenProvider.getRefreshExpirationMs()).thenReturn(604800000L);
        when(userRepository.save(any(User.class))).thenReturn(user);

        LoginResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("mocked.jwt.token", response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals(86400000L, response.getExpiresIn());
        assertNotNull(response.getUser());
        assertEquals("nguyenvan_a", response.getUser().getUsername());

        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("API 2: Đăng nhập thất bại khi sai mật khẩu")
    void login_badCredentials() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(loginRequest));
    }

    @Test
    @DisplayName("API 3: Làm mới access token thành công với refresh token hợp lệ")
    void refreshToken_success() {
        RefreshToken storedToken = RefreshToken.builder()
                .id(1L)
                .token("valid-refresh-token")
                .user(user)
                .revoked(false)
                .expiryDate(LocalDateTime.now().plusDays(7))
                .build();

        when(refreshTokenRepository.findByToken("valid-refresh-token")).thenReturn(Optional.of(storedToken));
        when(tokenProvider.getRefreshExpirationMs()).thenReturn(604800000L);
        when(tokenProvider.getExpirationMs()).thenReturn(86400000L);
        when(tokenProvider.generateToken(any())).thenReturn("new-access-token");

        TokenRefreshResponse response = authService.refreshToken(new RefreshTokenRequest("valid-refresh-token"));

        assertNotNull(response);
        assertEquals("new-access-token", response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertTrue(storedToken.isRevoked());
        verify(refreshTokenRepository, atLeastOnce()).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("API 3: Làm mới thất bại khi refresh token đã bị thu hồi")
    void refreshToken_revoked() {
        RefreshToken revokedToken = RefreshToken.builder()
                .token("revoked-token")
                .user(user)
                .revoked(true)
                .expiryDate(LocalDateTime.now().plusDays(1))
                .build();

        when(refreshTokenRepository.findByToken("revoked-token")).thenReturn(Optional.of(revokedToken));

        assertThrows(UnauthorizedException.class, () -> authService.refreshToken(new RefreshTokenRequest("revoked-token")));
    }

    @Test
    @DisplayName("API 4: Đăng xuất và thu hồi refresh token")
    void logout_success() {
        when(userRepository.findByUsernameOrEmail("nguyenvan_a", "nguyenvan_a")).thenReturn(Optional.of(user));

        authService.logout("nguyenvan_a", new LogoutRequest("some-token"));

        verify(refreshTokenRepository).revokeByToken("some-token");
    }

    @Test
    @DisplayName("API 5: Lấy thông tin tài khoản hiện tại")
    void getCurrentUser_success() {
        when(userRepository.findByUsernameOrEmail("nguyenvan_a", "nguyenvan_a")).thenReturn(Optional.of(user));

        UserResponse response = authService.getCurrentUser("nguyenvan_a");

        assertNotNull(response);
        assertEquals("nguyenvan_a", response.getUsername());
        assertEquals("vana@example.com", response.getEmail());
    }

    @Test
    @DisplayName("API 6: Cập nhật thông tin cá nhân")
    void updateProfile_success() {
        when(userRepository.findByUsernameOrEmail("nguyenvan_a", "nguyenvan_a")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .fullName("Nguyễn Văn A Mới")
                .phone("0912345678")
                .avatarUrl("https://example.com/avatar.png")
                .build();

        UserResponse response = authService.updateProfile("nguyenvan_a", request);

        assertNotNull(response);
        assertEquals("Nguyễn Văn A Mới", user.getFullName());
        assertEquals("0912345678", user.getPhone());
    }

    @Test
    @DisplayName("API 7: Đổi mật khẩu thành công")
    void changePassword_success() {
        when(userRepository.findByUsernameOrEmail("nguyenvan_a", "nguyenvan_a")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("OldPassword123!", "encoded_secure_password")).thenReturn(true);
        when(passwordEncoder.matches("NewPassword123!", "encoded_secure_password")).thenReturn(false);
        when(passwordEncoder.encode("NewPassword123!")).thenReturn("encoded_new_password");

        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("OldPassword123!")
                .newPassword("NewPassword123!")
                .confirmPassword("NewPassword123!")
                .build();

        authService.changePassword("nguyenvan_a", request);

        assertEquals("encoded_new_password", user.getPassword());
        verify(refreshTokenRepository).revokeAllByUser(user);
    }

    @Test
    @DisplayName("API 7: Đổi mật khẩu thất bại khi mật khẩu hiện tại không đúng")
    void changePassword_wrongCurrentPassword() {
        when(userRepository.findByUsernameOrEmail("nguyenvan_a", "nguyenvan_a")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword", "encoded_secure_password")).thenReturn(false);

        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("WrongPassword")
                .newPassword("NewPassword123!")
                .confirmPassword("NewPassword123!")
                .build();

        assertThrows(BadRequestException.class, () -> authService.changePassword("nguyenvan_a", request));
    }

    @Test
    @DisplayName("API 8: Yêu cầu khôi phục mật khẩu thành công")
    void forgotPassword_success() {
        when(userRepository.findByEmail("vana@example.com")).thenReturn(Optional.of(user));
        when(tokenProvider.getResetPasswordExpirationMs()).thenReturn(900000L);

        Map<String, String> result = authService.forgotPassword(new ForgotPasswordRequest("vana@example.com"));

        assertNotNull(result);
        assertNotNull(result.get("resetToken"));
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        verify(eventPublisher).publishEvent(any(PasswordResetRequestedEvent.class));
    }

    @Test
    @DisplayName("API 9: Đặt lại mật khẩu thành công với token hợp lệ")
    void resetPassword_success() {
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token("valid-reset-token")
                .user(user)
                .used(false)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .build();

        when(passwordResetTokenRepository.findByToken("valid-reset-token")).thenReturn(Optional.of(resetToken));
        when(passwordEncoder.encode("NewPassword123!")).thenReturn("encoded_new_password");

        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .token("valid-reset-token")
                .newPassword("NewPassword123!")
                .confirmPassword("NewPassword123!")
                .build();

        authService.resetPassword(request);

        assertTrue(resetToken.isUsed());
        assertEquals("encoded_new_password", user.getPassword());
        verify(refreshTokenRepository).revokeAllByUser(user);
    }

    @Test
    @DisplayName("API 10: Xác minh email bằng token thành công")
    void verifyEmail_success() {
        EmailVerificationToken token = EmailVerificationToken.builder()
                .token("valid-verify-token")
                .user(user)
                .used(false)
                .expiryDate(LocalDateTime.now().plusDays(1))
                .build();

        when(emailVerificationTokenRepository.findByToken("valid-verify-token")).thenReturn(Optional.of(token));

        authService.verifyEmail(new VerifyEmailRequest("valid-verify-token"));

        assertTrue(token.isUsed());
        assertNotNull(user.getEmailVerifiedAt());
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("API 11: Gửi lại email xác minh thành công")
    void resendVerification_success() {
        user.setEmailVerifiedAt(null);
        when(userRepository.findByEmail("vana@example.com")).thenReturn(Optional.of(user));
        when(tokenProvider.getEmailVerificationExpirationMs()).thenReturn(86400000L);

        Map<String, String> result = authService.resendVerification(new ResendVerificationRequest("vana@example.com"));

        assertNotNull(result);
        assertNotNull(result.get("verificationToken"));
        verify(emailVerificationTokenRepository).save(any(EmailVerificationToken.class));
        verify(eventPublisher).publishEvent(any(EmailVerificationRequestedEvent.class));
    }
}
