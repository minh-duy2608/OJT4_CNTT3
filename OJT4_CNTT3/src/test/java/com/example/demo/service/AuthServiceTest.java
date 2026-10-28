package com.example.demo.service;

import com.example.demo.config.security.CustomUserDetails;
import com.example.demo.config.security.JwtTokenProvider;
import com.example.demo.dto.request.LoginRequest;
import com.example.demo.dto.request.RegisterRequest;
import com.example.demo.dto.response.LoginResponse;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.entity.UserStatus;
import com.example.demo.exception.ConflictException;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TC-AUTH: AuthService Unit Tests")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider tokenProvider;

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
    @DisplayName("TC-AUTH-01: Đăng ký tài khoản mới thành công")
    void register_success() {
        when(userRepository.existsByUsername("nguyenvan_a")).thenReturn(false);
        when(userRepository.existsByEmail("vana@example.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePassword123!")).thenReturn("encoded_secure_password");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals("nguyenvan_a", response.getUsername());
        assertEquals("vana@example.com", response.getEmail());
        assertEquals(Role.ROLE_USER, response.getRole());
        assertEquals(UserStatus.ACTIVE, response.getStatus());

        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("TC-AUTH-02: Đăng ký thất bại khi username đã tồn tại")
    void register_conflict_username() {
        when(userRepository.existsByUsername("nguyenvan_a")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(registerRequest));
        assertEquals("Username already exists", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("TC-AUTH-02: Đăng ký thất bại khi email đã tồn tại")
    void register_conflict_email() {
        when(userRepository.existsByUsername("nguyenvan_a")).thenReturn(false);
        when(userRepository.existsByEmail("vana@example.com")).thenReturn(true);

        ConflictException ex = assertThrows(ConflictException.class, () -> authService.register(registerRequest));
        assertEquals("Email already registered", ex.getMessage());

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("TC-AUTH-03: Đăng nhập thành công trả về JWT Token")
    void login_success() {
        CustomUserDetails userDetails = new CustomUserDetails(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(tokenProvider.generateToken(userDetails)).thenReturn("mocked.jwt.token");
        when(tokenProvider.getExpirationMs()).thenReturn(86400000L);

        LoginResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("mocked.jwt.token", response.getAccessToken());
        assertEquals("Bearer", response.getTokenType());
        assertEquals(86400000L, response.getExpiresIn());
        assertNotNull(response.getUser());
        assertEquals("nguyenvan_a", response.getUser().getUsername());
    }

    @Test
    @DisplayName("TC-AUTH-04: Đăng nhập thất bại khi sai mật khẩu")
    void login_badCredentials() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(loginRequest));
    }
}
