package com.example.demo.controller;

import com.example.demo.dto.request.AdminAssignRolesRequest;
import com.example.demo.dto.request.AdminUpdateUserRequest;
import com.example.demo.dto.request.AdminUpdateUserStatusRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.RoleResponse;
import com.example.demo.dto.response.UserDetailResponse;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.entity.Role;
import com.example.demo.entity.UserStatus;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.GlobalExceptionHandler;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.service.AdminUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminUserController Microservice APIs (STT 12 - 17) Tests")
class AdminUserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AdminUserService adminUserService;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AdminUserController adminUserController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminUserController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("STT 12: GET /admin/users - Lấy danh sách người dùng thành công")
    void getUsers_success() throws Exception {
        UserResponse user = UserResponse.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .role(Role.ROLE_USER)
                .status(UserStatus.ACTIVE)
                .build();

        PageResponse<UserResponse> pageResponse = PageResponse.<UserResponse>builder()
                .content(List.of(user))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();

        when(adminUserService.getUsers(any(), any(), any(), anyInt(), anyInt(), anyString(), anyString()))
                .thenReturn(pageResponse);

        mockMvc.perform(get("/admin/users")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.content[0].username").value("testuser"));
    }

    @Test
    @DisplayName("STT 13: GET /admin/users/{userId} - Lấy chi tiết người dùng thành công")
    void getUserById_success() throws Exception {
        UserDetailResponse detail = UserDetailResponse.builder()
                .id(2L)
                .username("customer2")
                .email("customer2@example.com")
                .fullName("Customer Two")
                .role(Role.CLIENT)
                .status(UserStatus.ACTIVE)
                .roles(List.of(RoleResponse.builder().code("CLIENT").name("Khách hàng").build()))
                .build();

        when(adminUserService.getUserById(2L)).thenReturn(detail);

        mockMvc.perform(get("/admin/users/2")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.username").value("customer2"));
    }

    @Test
    @DisplayName("STT 13: GET /admin/users/{userId} - Trả về 404 khi không tìm thấy người dùng")
    void getUserById_notFound() throws Exception {
        when(adminUserService.getUserById(999L))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy người dùng với ID: 999"));

        mockMvc.perform(get("/admin/users/999")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404));
    }

    @Test
    @DisplayName("STT 14: PATCH /admin/users/{userId} - Cập nhật thông tin quản trị sửa thành công")
    void updateUser_success() throws Exception {
        String jsonPayload = """
                {
                    "fullName": "New Admin Set Name",
                    "phone": "0988776655",
                    "emailVerified": true
                }
                """;

        UserResponse response = UserResponse.builder()
                .id(2L)
                .username("customer2")
                .fullName("New Admin Set Name")
                .phone("0988776655")
                .build();

        when(adminUserService.updateUser(eq(2L), any(AdminUpdateUserRequest.class))).thenReturn(response);

        mockMvc.perform(patch("/admin/users/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.fullName").value("New Admin Set Name"));
    }

    @Test
    @DisplayName("STT 15: PATCH /admin/users/{userId}/status - Khóa hoặc mở khóa thành công")
    void updateUserStatus_success() throws Exception {
        String jsonPayload = """
                {
                    "status": "LOCKED",
                    "reason": "Spam violation"
                }
                """;

        UserResponse response = UserResponse.builder()
                .id(2L)
                .username("customer2")
                .status(UserStatus.LOCKED)
                .build();

        when(authentication.getName()).thenReturn("admin_user");
        when(adminUserService.updateUserStatus(eq("admin_user"), eq(2L), any(AdminUpdateUserStatusRequest.class)))
                .thenReturn(response);

        mockMvc.perform(patch("/admin/users/2/status")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.status").value("LOCKED"));
    }

    @Test
    @DisplayName("STT 15: PATCH /admin/users/{userId}/status - Không thể tự khóa tài khoản của chính mình")
    void updateUserStatus_selfLock_badRequest() throws Exception {
        String jsonPayload = """
                {
                    "status": "LOCKED"
                }
                """;

        when(authentication.getName()).thenReturn("admin_user");
        when(adminUserService.updateUserStatus(eq("admin_user"), eq(1L), any(AdminUpdateUserStatusRequest.class)))
                .thenThrow(new BadRequestException("Bạn không thể tự khóa hoặc hủy kích hoạt tài khoản của chính mình!"));

        mockMvc.perform(patch("/admin/users/1/status")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("Bạn không thể tự khóa hoặc hủy kích hoạt tài khoản của chính mình!"));
    }

    @Test
    @DisplayName("STT 16: GET /admin/users/{userId}/roles - Danh sách vai trò thành công")
    void getUserRoles_success() throws Exception {
        List<RoleResponse> roles = List.of(
                RoleResponse.builder().code("ADMIN").name("Quản trị viên").isPrimary(true).build()
        );

        when(adminUserService.getUserRoles(1L)).thenReturn(roles);

        mockMvc.perform(get("/admin/users/1/roles")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].code").value("ADMIN"));
    }

    @Test
    @DisplayName("STT 17: PUT /admin/users/{userId}/roles - Gán tập vai trò thành công")
    void assignUserRoles_success() throws Exception {
        String jsonPayload = """
                {
                    "roles": ["SHOP_MANAGER"]
                }
                """;

        List<RoleResponse> updatedRoles = List.of(
                RoleResponse.builder().code("SHOP_MANAGER").name("Quản lý shop").isPrimary(true).build()
        );

        when(authentication.getName()).thenReturn("admin_user");
        when(adminUserService.assignUserRoles(eq("admin_user"), eq(2L), any(AdminAssignRolesRequest.class)))
                .thenReturn(updatedRoles);

        mockMvc.perform(put("/admin/users/2/roles")
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[0].code").value("SHOP_MANAGER"));
    }
}
