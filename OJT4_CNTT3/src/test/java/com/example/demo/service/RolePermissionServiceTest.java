package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.AssignRolePermissionsRequest;
import com.example.demo.dto.request.CreateRoleRequest;
import com.example.demo.dto.request.UpdateRoleRequest;
import com.example.demo.dto.response.PermissionResponse;
import com.example.demo.dto.response.RoleDetailResponse;
import com.example.demo.dto.response.RoleResponse;
import com.example.demo.entity.PermissionEntity;
import com.example.demo.entity.Role;
import com.example.demo.entity.RoleEntity;
import com.example.demo.entity.User;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ConflictException;
import com.example.demo.repository.PermissionRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.impl.RolePermissionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Role & Permission Service Unit Tests (STT 18 - 26)")
class RolePermissionServiceTest extends BaseUnitTest {

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PermissionRepository permissionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RolePermissionServiceImpl rolePermissionService;

    private RoleEntity adminRole;
    private RoleEntity customRole;
    private PermissionEntity permUserView;
    private PermissionEntity permProductView;

    @BeforeEach
    void setUp() {
        permUserView = PermissionEntity.builder().id(1L).code("USER_VIEW").name("Xem người dùng").build();
        permProductView = PermissionEntity.builder().id(2L).code("PRODUCT_VIEW").name("Xem sản phẩm").build();

        adminRole = RoleEntity.builder()
                .id(1L)
                .code("ADMIN")
                .name("Quản trị viên")
                .isSystem(true)
                .permissions(new HashSet<>(Set.of(permUserView, permProductView)))
                .build();

        customRole = RoleEntity.builder()
                .id(10L)
                .code("MARKETING_LEAD")
                .name("Trưởng nhóm Marketing")
                .isSystem(false)
                .permissions(new HashSet<>(Set.of(permProductView)))
                .build();
    }

    @Nested
    @DisplayName("Roles CRUD Tests (APIs 18 - 22)")
    class RoleCrudTests {

        @Test
        @DisplayName("STT 18: getAllRoles should return list of roles")
        void getAllRoles_success() {
            when(roleRepository.findAll()).thenReturn(List.of(adminRole, customRole));

            List<RoleResponse> results = rolePermissionService.getAllRoles();

            assertNotNull(results);
            assertEquals(2, results.size());
        }

        @Test
        @DisplayName("STT 19: getRoleById should return role detail with permissions")
        void getRoleById_success() {
            when(roleRepository.findById(1L)).thenReturn(Optional.of(adminRole));

            RoleDetailResponse detail = rolePermissionService.getRoleById(1L);

            assertNotNull(detail);
            assertEquals("ADMIN", detail.getCode());
            assertEquals(2, detail.getPermissions().size());
        }

        @Test
        @DisplayName("STT 20: createRole should reject duplicate code")
        void createRole_duplicateCode_throwsConflict() {
            when(roleRepository.existsByCode("MARKETING_LEAD")).thenReturn(true);

            CreateRoleRequest request = CreateRoleRequest.builder()
                    .code("MARKETING_LEAD")
                    .name("Marketing")
                    .build();

            assertThrows(ConflictException.class, () -> rolePermissionService.createRole(request));
        }

        @Test
        @DisplayName("STT 20: createRole should save new custom role with isSystem=false")
        void createRole_success() {
            when(roleRepository.existsByCode("CONTENT_CREATOR")).thenReturn(false);
            when(roleRepository.save(any(RoleEntity.class))).thenAnswer(inv -> inv.getArgument(0));

            CreateRoleRequest request = CreateRoleRequest.builder()
                    .code("CONTENT_CREATOR")
                    .name("Sáng tạo nội dung")
                    .description("Soạn thảo bài viết sản phẩm")
                    .build();

            RoleDetailResponse created = rolePermissionService.createRole(request);

            assertNotNull(created);
            assertEquals("CONTENT_CREATOR", created.getCode());
            assertFalse(created.isSystem(), "Vai trò mới tạo phải là custom role (isSystem=false)");
        }

        @Test
        @DisplayName("STT 21: updateRole should update name and description")
        void updateRole_success() {
            when(roleRepository.findById(10L)).thenReturn(Optional.of(customRole));
            when(roleRepository.save(any(RoleEntity.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateRoleRequest request = UpdateRoleRequest.builder()
                    .name("Trưởng nhóm Marketing & Sales")
                    .description("Cập nhật mô tả mới")
                    .build();

            RoleDetailResponse updated = rolePermissionService.updateRole(10L, request);

            assertNotNull(updated);
            assertEquals("Trưởng nhóm Marketing & Sales", updated.getName());
        }

        @Test
        @DisplayName("STT 22: deleteRole should disallow deleting system roles")
        void deleteRole_systemRole_throwsBadRequest() {
            when(roleRepository.findById(1L)).thenReturn(Optional.of(adminRole));

            assertThrows(BadRequestException.class, () -> rolePermissionService.deleteRole(1L));
        }

        @Test
        @DisplayName("STT 22: deleteRole should disallow deleting role if assigned to users")
        void deleteRole_assignedToUsers_throwsBadRequest() {
            when(roleRepository.findById(10L)).thenReturn(Optional.of(customRole));
            when(userRepository.countUsersWithRoleId(10L)).thenReturn(3L);

            assertThrows(BadRequestException.class, () -> rolePermissionService.deleteRole(10L));
        }

        @Test
        @DisplayName("STT 22: deleteRole should succeed when custom role is unused")
        void deleteRole_success() {
            when(roleRepository.findById(10L)).thenReturn(Optional.of(customRole));
            when(userRepository.countUsersWithRoleId(10L)).thenReturn(0L);

            rolePermissionService.deleteRole(10L);

            verify(roleRepository, times(1)).delete(customRole);
        }
    }

    @Nested
    @DisplayName("Permissions Management Tests (APIs 23 - 26)")
    class PermissionTests {

        @Test
        @DisplayName("STT 23: getAllPermissions should return permissions list")
        void getAllPermissions_success() {
            when(permissionRepository.findAll()).thenReturn(List.of(permUserView, permProductView));

            List<PermissionResponse> list = rolePermissionService.getAllPermissions();

            assertNotNull(list);
            assertEquals(2, list.size());
        }

        @Test
        @DisplayName("STT 25: assignRolePermissions should disallow removing essential admin permissions from ADMIN role")
        void assignRolePermissions_removeEssentialAdmin_throwsBadRequest() {
            when(roleRepository.findById(1L)).thenReturn(Optional.of(adminRole));

            AssignRolePermissionsRequest request = AssignRolePermissionsRequest.builder()
                    .permissionCodes(Set.of("PRODUCT_VIEW")) // Thiếu USER_VIEW, USER_UPDATE, USER_LOCK, v.v.
                    .build();

            assertThrows(BadRequestException.class, () -> rolePermissionService.assignRolePermissions(1L, request));
        }

        @Test
        @DisplayName("STT 26: getCurrentUserPermissions should return all permissions if user is ADMIN")
        void getCurrentUserPermissions_adminUser_returnsAll() {
            User user = User.builder().username("admin").role(Role.ROLE_ADMIN).build();
            when(userRepository.findByUsernameOrEmail("admin", "admin")).thenReturn(Optional.of(user));
            when(permissionRepository.findAll()).thenReturn(List.of(permUserView, permProductView));

            Set<String> perms = rolePermissionService.getCurrentUserPermissions("admin");

            assertEquals(2, perms.size());
            assertTrue(perms.contains("USER_VIEW"));
            assertTrue(perms.contains("PRODUCT_VIEW"));
        }
    }
}
