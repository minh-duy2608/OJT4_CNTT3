package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.AdminAssignRolesRequest;
import com.example.demo.dto.request.AdminUpdateUserRequest;
import com.example.demo.dto.request.AdminUpdateUserStatusRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.RoleResponse;
import com.example.demo.dto.response.UserDetailResponse;
import com.example.demo.dto.response.UserResponse;
import com.example.demo.entity.Address;
import com.example.demo.entity.Role;
import com.example.demo.entity.RoleEntity;
import com.example.demo.entity.User;
import com.example.demo.entity.UserStatus;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.AddressRepository;
import com.example.demo.repository.RefreshTokenRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.impl.AdminUserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Admin User Service Unit Tests")
class AdminUserServiceTest extends BaseUnitTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private AddressRepository addressRepository;

    @InjectMocks
    private AdminUserServiceImpl adminUserService;

    private User adminUser;
    private User standardUser;
    private RoleEntity adminRoleEntity;
    private RoleEntity clientRoleEntity;

    @BeforeEach
    void setUp() {
        adminRoleEntity = RoleEntity.builder()
                .id(1L)
                .code("ADMIN")
                .name("Quản trị viên")
                .description("Quản lý toàn hệ thống")
                .isSystem(true)
                .build();

        clientRoleEntity = RoleEntity.builder()
                .id(2L)
                .code("CLIENT")
                .name("Khách hàng")
                .description("Người mua hàng")
                .isSystem(true)
                .build();

        adminUser = User.builder()
                .id(1L)
                .username("system_admin")
                .email("admin@test.com")
                .fullName("System Administrator")
                .role(Role.ROLE_ADMIN)
                .status(UserStatus.ACTIVE)
                .roles(new HashSet<>(Set.of(adminRoleEntity)))
                .build();

        standardUser = User.builder()
                .id(2L)
                .username("customer_user")
                .email("customer@test.com")
                .fullName("Customer User")
                .phone("0987654321")
                .role(Role.CLIENT)
                .status(UserStatus.ACTIVE)
                .roles(new HashSet<>(Set.of(clientRoleEntity)))
                .build();
    }

    @Nested
    @DisplayName("API 12: GET /admin/users")
    class GetUsersTests {

        @Test
        @DisplayName("Should return paginated users list successfully")
        void getUsers_success() {
            Page<User> page = new PageImpl<>(List.of(adminUser, standardUser));
            when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

            PageResponse<UserResponse> result = adminUserService.getUsers(
                    "test", "CLIENT", UserStatus.ACTIVE, 0, 10, "createdAt", "desc"
            );

            assertNotNull(result);
            assertEquals(2, result.getContent().size());
            assertEquals(2, result.getTotalElements());
        }
    }

    @Nested
    @DisplayName("API 13: GET /admin/users/{userId}")
    class GetUserByIdTests {

        @Test
        @DisplayName("Should return user detail with addresses and roles")
        void getUserById_success() {
            Address address = Address.builder()
                    .id(101L)
                    .user(standardUser)
                    .recipientName("Customer User")
                    .phone("0987654321")
                    .province("TP. Hồ Chí Minh")
                    .addressDetail("123 Vo Van Tan")
                    .isDefault(true)
                    .build();

            when(userRepository.findById(2L)).thenReturn(Optional.of(standardUser));
            when(addressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(standardUser))
                    .thenReturn(List.of(address));

            UserDetailResponse response = adminUserService.getUserById(2L);

            assertNotNull(response);
            assertEquals("customer_user", response.getUsername());
            assertEquals(1, response.getAddresses().size());
            assertEquals("123 Vo Van Tan", response.getAddresses().get(0).getAddressDetail());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when user does not exist")
        void getUserById_notFound() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(ResourceNotFoundException.class, () -> adminUserService.getUserById(999L));
        }
    }

    @Nested
    @DisplayName("API 14: PATCH /admin/users/{userId}")
    class UpdateUserTests {

        @Test
        @DisplayName("Should update allowed admin fields (fullName, phone, avatarUrl, emailVerified)")
        void updateUser_success() {
            when(userRepository.findById(2L)).thenReturn(Optional.of(standardUser));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            AdminUpdateUserRequest request = AdminUpdateUserRequest.builder()
                    .fullName("Updated Customer Name")
                    .phone("0912345678")
                    .avatarUrl("https://example.com/avatar.jpg")
                    .emailVerified(true)
                    .build();

            UserResponse response = adminUserService.updateUser(2L, request);

            assertNotNull(response);
            assertEquals("Updated Customer Name", response.getFullName());
            assertEquals("0912345678", response.getPhone());
            assertNotNull(standardUser.getEmailVerifiedAt());
        }
    }

    @Nested
    @DisplayName("API 15: PATCH /admin/users/{userId}/status")
    class UpdateUserStatusTests {

        @Test
        @DisplayName("Should disallow admin from locking own account")
        void updateUserStatus_selfLock_throwsBadRequest() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

            AdminUpdateUserStatusRequest request = AdminUpdateUserStatusRequest.builder()
                    .status(UserStatus.LOCKED)
                    .reason("Self lock test")
                    .build();

            assertThrows(BadRequestException.class, () ->
                    adminUserService.updateUserStatus("system_admin", 1L, request)
            );
        }

        @Test
        @DisplayName("Should disallow locking the only active admin in the system")
        void updateUserStatus_lastAdminLock_throwsBadRequest() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
            when(userRepository.countActiveAdmins(eq(UserStatus.ACTIVE), any(Role.class), any(Role.class)))
                    .thenReturn(1L);

            AdminUpdateUserStatusRequest request = AdminUpdateUserStatusRequest.builder()
                    .status(UserStatus.LOCKED)
                    .reason("Lock admin test")
                    .build();

            assertThrows(BadRequestException.class, () ->
                    adminUserService.updateUserStatus("other_super_admin", 1L, request)
            );
        }

        @Test
        @DisplayName("Should lock standard user and revoke all active refresh tokens")
        void updateUserStatus_lockUser_revokesTokens() {
            when(userRepository.findById(2L)).thenReturn(Optional.of(standardUser));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            AdminUpdateUserStatusRequest request = AdminUpdateUserStatusRequest.builder()
                    .status(UserStatus.LOCKED)
                    .reason("Policy violation")
                    .build();

            UserResponse response = adminUserService.updateUserStatus("system_admin", 2L, request);

            assertNotNull(response);
            assertEquals(UserStatus.LOCKED, response.getStatus());
            verify(refreshTokenRepository, times(1)).revokeAllByUser(standardUser);
        }

        @Test
        @DisplayName("Should unlock user without revoking tokens")
        void updateUserStatus_activateUser_success() {
            standardUser.setStatus(UserStatus.LOCKED);
            when(userRepository.findById(2L)).thenReturn(Optional.of(standardUser));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            AdminUpdateUserStatusRequest request = AdminUpdateUserStatusRequest.builder()
                    .status(UserStatus.ACTIVE)
                    .build();

            UserResponse response = adminUserService.updateUserStatus("system_admin", 2L, request);

            assertNotNull(response);
            assertEquals(UserStatus.ACTIVE, response.getStatus());
            verify(refreshTokenRepository, never()).revokeAllByUser(standardUser);
        }
    }

    @Nested
    @DisplayName("API 16 & 17: User Roles Management")
    class UserRolesTests {

        @Test
        @DisplayName("API 16: Should return user roles list")
        void getUserRoles_success() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

            List<RoleResponse> roles = adminUserService.getUserRoles(1L);

            assertNotNull(roles);
            assertFalse(roles.isEmpty());
            assertEquals("ADMIN", roles.get(0).getCode());
        }

        @Test
        @DisplayName("API 17: Should prevent admin from self-demoting (removing own ADMIN role)")
        void assignUserRoles_selfDemote_throwsBadRequest() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

            AdminAssignRolesRequest request = AdminAssignRolesRequest.builder()
                    .roles(Set.of("CLIENT"))
                    .build();

            assertThrows(BadRequestException.class, () ->
                    adminUserService.assignUserRoles("system_admin", 1L, request)
            );
        }

        @Test
        @DisplayName("API 17: Should prevent removing ADMIN role from the only active admin")
        void assignUserRoles_lastAdminDemote_throwsBadRequest() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
            when(userRepository.countActiveAdmins(eq(UserStatus.ACTIVE), any(Role.class), any(Role.class)))
                    .thenReturn(1L);

            AdminAssignRolesRequest request = AdminAssignRolesRequest.builder()
                    .roles(Set.of("CLIENT"))
                    .build();

            assertThrows(BadRequestException.class, () ->
                    adminUserService.assignUserRoles("another_admin", 1L, request)
            );
        }

        @Test
        @DisplayName("API 17: Should successfully assign roles to user")
        void assignUserRoles_success() {
            when(userRepository.findById(2L)).thenReturn(Optional.of(standardUser));
            when(roleRepository.findByCode("SHOP_OWNER")).thenReturn(Optional.of(
                    RoleEntity.builder().code("SHOP_OWNER").name("Chủ cửa hàng").build()
            ));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            AdminAssignRolesRequest request = AdminAssignRolesRequest.builder()
                    .roles(Set.of("SHOP_OWNER"))
                    .build();

            List<RoleResponse> roles = adminUserService.assignUserRoles("system_admin", 2L, request);

            assertNotNull(roles);
            assertEquals(Role.SHOP_OWNER, standardUser.getRole());
            verify(userRepository, times(1)).save(standardUser);
        }
    }
}

