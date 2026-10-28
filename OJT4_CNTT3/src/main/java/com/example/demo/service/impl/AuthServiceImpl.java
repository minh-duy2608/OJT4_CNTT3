package com.example.demo.service.impl;

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
import com.example.demo.event.EmailVerificationRequestedEvent;
import com.example.demo.event.PasswordResetRequestedEvent;
import com.example.demo.event.UserRegisteredEvent;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ConflictException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.EmailVerificationTokenRepository;
import com.example.demo.repository.PasswordResetTokenRepository;
import com.example.demo.repository.RefreshTokenRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 1. POST /auth/register - Đăng ký tài khoản khách hàng (Public)
     */
    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        log.info("Processing registration for username: {}, email: {}", request.getUsername(), request.getEmail());

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ConflictException("Username already exists");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered");
        }

        User user = User.builder()
                .username(request.getUsername().trim())
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName() != null ? request.getFullName().trim() : null)
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .role(Role.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);

        // Generate 6-digit email verification OTP
        String verificationTokenString = generateSixDigitOtp();
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .token(verificationTokenString)
                .user(savedUser)
                .expiryDate(LocalDateTime.now().plus(tokenProvider.getEmailVerificationExpirationMs(), ChronoUnit.MILLIS))
                .used(false)
                .build();
        emailVerificationTokenRepository.save(verificationToken);

        // Publish microservice domain event
        eventPublisher.publishEvent(new UserRegisteredEvent(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                verificationTokenString
        ));

        log.info("Successfully registered user with id: {}", savedUser.getId());
        return UserResponse.fromEntity(savedUser);
    }

    /**
     * 2. POST /auth/login - Đăng nhập, cấp JWT (Public)
     */
    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        log.info("Processing login for username: {}", request.getUsername());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername().trim(), request.getPassword())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userDetails.getUser();

        if (user.getStatus() == UserStatus.LOCKED || user.getStatus() == UserStatus.BLOCKED) {
            throw new UnauthorizedException("Tài khoản đã bị khóa hoặc chặn truy cập");
        }

        // Update last login timestamp
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // Issue JWT access token
        String accessToken = tokenProvider.generateToken(userDetails);

        // Issue and persist Refresh Token
        String refreshTokenString = UUID.randomUUID().toString();
        RefreshToken refreshToken = RefreshToken.builder()
                .token(refreshTokenString)
                .user(user)
                .expiryDate(LocalDateTime.now().plus(tokenProvider.getRefreshExpirationMs(), ChronoUnit.MILLIS))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenString)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getExpirationMs())
                .user(UserResponse.fromEntity(user))
                .build();
    }

    /**
     * 3. POST /auth/refresh - Làm mới access token (Public / Token hợp lệ)
     */
    @Override
    @Transactional
    public TokenRefreshResponse refreshToken(RefreshTokenRequest request) {
        log.info("Processing refresh token request");

        RefreshToken storedToken = refreshTokenRepository.findByToken(request.getRefreshToken().trim())
                .orElseThrow(() -> new UnauthorizedException("Refresh token không hợp lệ hoặc không tồn tại"));

        if (storedToken.isRevoked()) {
            throw new UnauthorizedException("Refresh token đã bị thu hồi");
        }

        if (storedToken.isExpired()) {
            throw new UnauthorizedException("Refresh token đã hết hạn, vui lòng đăng nhập lại");
        }

        User user = storedToken.getUser();
        if (user.getStatus() == UserStatus.LOCKED || user.getStatus() == UserStatus.BLOCKED || user.getStatus() == UserStatus.DELETED) {
            throw new UnauthorizedException("Tài khoản không hoạt động hoặc đã bị vô hiệu hóa");
        }

        // Token Rotation: revoke current token and create a new refresh token
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        String newRefreshTokenString = UUID.randomUUID().toString();
        RefreshToken newRefreshToken = RefreshToken.builder()
                .token(newRefreshTokenString)
                .user(user)
                .expiryDate(LocalDateTime.now().plus(tokenProvider.getRefreshExpirationMs(), ChronoUnit.MILLIS))
                .revoked(false)
                .build();
        refreshTokenRepository.save(newRefreshToken);

        CustomUserDetails userDetails = new CustomUserDetails(user);
        String newAccessToken = tokenProvider.generateToken(userDetails);

        return TokenRefreshResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshTokenString)
                .tokenType("Bearer")
                .expiresIn(tokenProvider.getExpirationMs())
                .build();
    }

    /**
     * 4. POST /auth/logout - Đăng xuất, thu hồi refresh token (Authenticated)
     */
    @Override
    @Transactional
    public void logout(String currentUsername, LogoutRequest request) {
        log.info("Processing logout for user: {}", currentUsername);

        User user = findUserByUsernameOrEmail(currentUsername);

        if (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank()) {
            refreshTokenRepository.revokeByToken(request.getRefreshToken().trim());
        } else {
            refreshTokenRepository.revokeAllByUser(user);
        }

        SecurityContextHolder.clearContext();
        log.info("Successfully logged out user: {}", currentUsername);
    }

    /**
     * 5. GET /auth/me - Lấy thông tin tài khoản hiện tại (Authenticated)
     */
    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String currentUsername) {
        log.info("Fetching profile for user: {}", currentUsername);
        User user = findUserByUsernameOrEmail(currentUsername);
        return UserResponse.fromEntity(user);
    }

    /**
     * 6. PATCH /auth/me - Cập nhật thông tin cá nhân (Authenticated)
     */
    @Override
    @Transactional
    public UserResponse updateProfile(String currentUsername, UpdateProfileRequest request) {
        log.info("Updating profile for user: {}", currentUsername);
        User user = findUserByUsernameOrEmail(currentUsername);

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }

        User updatedUser = userRepository.save(user);
        log.info("Profile successfully updated for user: {}", currentUsername);
        return UserResponse.fromEntity(updatedUser);
    }

    /**
     * 7. PATCH /auth/me/password - Đổi mật khẩu (Authenticated)
     */
    @Override
    @Transactional
    public void changePassword(String currentUsername, ChangePasswordRequest request) {
        log.info("Changing password for user: {}", currentUsername);

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Xác nhận mật khẩu mới không khớp");
        }

        User user = findUserByUsernameOrEmail(currentUsername);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu mới không được trùng với mật khẩu cũ");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Invalidate all active refresh tokens to force re-login across all sessions
        refreshTokenRepository.revokeAllByUser(user);
        log.info("Password changed successfully for user: {}", currentUsername);
    }

    /**
     * 8. POST /auth/forgot-password - Yêu cầu khôi phục mật khẩu (Public)
     */
    @Override
    @Transactional
    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        log.info("Processing forgot password request for email: {}", email);

        Optional<User> userOptional = userRepository.findByEmail(email);
        Map<String, String> response = new HashMap<>();

        if (userOptional.isPresent()) {
            User user = userOptional.get();

            // Invalidate existing unused tokens for this user
            passwordResetTokenRepository.invalidateAllByUser(user);

            // Create new reset token as 6-digit OTP
            String resetTokenString = generatePasswordResetOtp();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .token(resetTokenString)
                    .user(user)
                    .expiryDate(LocalDateTime.now().plus(tokenProvider.getResetPasswordExpirationMs(), ChronoUnit.MILLIS))
                    .used(false)
                    .build();
            passwordResetTokenRepository.save(resetToken);

            // Publish domain event for notification/email microservice
            eventPublisher.publishEvent(new PasswordResetRequestedEvent(user.getId(), user.getEmail(), resetTokenString));

            response.put("message", "Mã xác minh đặt lại mật khẩu gồm 6 chữ số đã được gửi đến email của bạn.");
            response.put("resetToken", resetTokenString);
        } else {
            // Consistent response message to prevent email enumeration
            response.put("message", "Nếu email này tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn.");
        }

        return response;
    }

    /**
     * 9. POST /auth/reset-password - Đặt lại mật khẩu bằng token hợp lệ (Public)
     */
    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        log.info("Processing reset password request");

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Xác nhận mật khẩu mới không khớp");
        }

        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken().trim())
                .orElseThrow(() -> new BadRequestException("Mã token khôi phục mật khẩu không hợp lệ"));

        if (resetToken.isUsed()) {
            throw new BadRequestException("Mã token khôi phục mật khẩu đã được sử dụng");
        }

        if (resetToken.isExpired()) {
            throw new BadRequestException("Mã token khôi phục mật khẩu đã hết hạn");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        // Revoke all refresh tokens
        refreshTokenRepository.revokeAllByUser(user);
        log.info("Password reset successfully for user: {}", user.getUsername());
    }

    /**
     * 10. POST /auth/verify-email - Xác minh email bằng token (Public)
     */
    @Override
    @Transactional
    public void verifyEmail(VerifyEmailRequest request) {
        log.info("Processing email verification request");

        EmailVerificationToken verificationToken = emailVerificationTokenRepository.findByToken(request.getToken().trim())
                .orElseThrow(() -> new BadRequestException("Mã token xác minh email không hợp lệ"));

        if (verificationToken.isUsed()) {
            throw new BadRequestException("Mã token xác minh email đã được sử dụng");
        }

        if (verificationToken.isExpired()) {
            throw new BadRequestException("Mã token xác minh email đã hết hạn");
        }

        User user = verificationToken.getUser();
        user.setEmailVerifiedAt(LocalDateTime.now());
        if (user.getStatus() == UserStatus.PENDING) {
            user.setStatus(UserStatus.ACTIVE);
        }
        userRepository.save(user);

        verificationToken.setUsed(true);
        emailVerificationTokenRepository.save(verificationToken);

        log.info("Email verified successfully for user: {}", user.getUsername());
    }

    /**
     * 11. POST /auth/resend-verification - Gửi lại email xác minh (Public)
     */
    @Override
    @Transactional
    public Map<String, String> resendVerification(ResendVerificationRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        log.info("Processing resend verification email for: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với email này"));

        Map<String, String> response = new HashMap<>();

        if (user.getEmailVerifiedAt() != null) {
            response.put("message", "Tài khoản này đã được xác minh email trước đó.");
            return response;
        }

        // Invalidate old tokens
        emailVerificationTokenRepository.invalidateAllByUser(user);

        // Create new 6-digit OTP token
        String tokenString = generateSixDigitOtp();
        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .token(tokenString)
                .user(user)
                .expiryDate(LocalDateTime.now().plus(tokenProvider.getEmailVerificationExpirationMs(), ChronoUnit.MILLIS))
                .used(false)
                .build();
        emailVerificationTokenRepository.save(verificationToken);

        // Publish event for email microservice
        eventPublisher.publishEvent(new EmailVerificationRequestedEvent(
                user.getId(), 
                user.getEmail(), 
                user.getFullName(), 
                tokenString
        ));

        response.put("message", "Mã xác minh gồm 6 chữ số mới đã được gửi từ son666727@gmail.com đến email của bạn.");
        response.put("verificationToken", tokenString);
        return response;
    }

    private String generateSixDigitOtp() {
        java.security.SecureRandom random = new java.security.SecureRandom();
        String code;
        int attempts = 0;
        do {
            code = String.format("%06d", random.nextInt(1000000));
            attempts++;
            if (attempts > 50) {
                code = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                break;
            }
        } while (emailVerificationTokenRepository.findByToken(code).isPresent());
        return code;
    }

    private String generatePasswordResetOtp() {
        java.security.SecureRandom random = new java.security.SecureRandom();
        String code;
        int attempts = 0;
        do {
            code = String.format("%06d", random.nextInt(1000000));
            attempts++;
            if (attempts > 50) {
                code = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                break;
            }
        } while (passwordResetTokenRepository.findByToken(code).isPresent());
        return code;
    }

    private User findUserByUsernameOrEmail(String usernameOrEmail) {
        return userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản người dùng: " + usernameOrEmail));
    }
}
