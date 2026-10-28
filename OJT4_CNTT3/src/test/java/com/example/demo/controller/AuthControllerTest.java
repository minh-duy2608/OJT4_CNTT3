package com.example.demo.controller;

import com.example.demo.dto.request.LoginRequest;
import com.example.demo.dto.request.RegisterRequest;
import com.example.demo.dto.response.LoginResponse;
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

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("TC-AUTH & TC-VAL: AuthController API Tests")
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("TC-AUTH-01: POST /api/v1/auth/register thành công trả về 201 Created")
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

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").value(201))
                .andExpect(jsonPath("$.data.username").value("nguyenvan_a"))
                .andExpect(jsonPath("$.data.email").value("vana@example.com"));
    }

    @Test
    @DisplayName("TC-AUTH-02: POST /api/v1/auth/register thất bại do trùng lặp email trả về 409 Conflict")
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

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(409))
                .andExpect(jsonPath("$.message").value("Email already registered"));
    }

    @Test
    @DisplayName("TC-VAL-01: POST /api/v1/auth/register dữ liệu rỗng trả về 400 Bad Request")
    void register_validation_empty_fields() throws Exception {
        String invalidPayload = """
                {
                    "username": "",
                    "email": "invalid-email",
                    "password": ""
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.data.username").exists())
                .andExpect(jsonPath("$.data.email").exists());
    }

    @Test
    @DisplayName("TC-AUTH-03: POST /api/v1/auth/login thành công trả về JWT Token và 200 OK")
    void login_success() throws Exception {
        LoginResponse response = LoginResponse.builder()
                .accessToken("mocked-jwt-token-string")
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

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.accessToken").value("mocked-jwt-token-string"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("TC-AUTH-04: POST /api/v1/auth/login sai mật khẩu trả về 401 Unauthorized")
    void login_badCredentials() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        String jsonPayload = """
                {
                    "username": "nguyenvan_a",
                    "password": "WrongPassword!"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }
}
