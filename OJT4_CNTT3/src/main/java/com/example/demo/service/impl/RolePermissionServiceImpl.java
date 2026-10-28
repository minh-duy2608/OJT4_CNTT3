package com.example.demo.service.impl;

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
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.PermissionRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.RolePermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RolePermissionServiceImpl implements RolePermissionService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;

    // Các quyền tối thiểu bắt buộc đối với ADMIN để chống tự làm hỏng quyền quản trị
    private static final Set<String> ESSENTIAL_ADMIN_PERMISSIONS = Set.of(
            "USER_VIEW", "USER_UPDATE", "USER_LOCK", "ROLE_VIEW", "ROLE_ASSIGN", "PERMISSION_ASSIGN"
    );

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .sorted(Comparator.comparing(RoleEntity::isSystem).reversed()
                        .thenComparing(RoleEntity::getCode))
                .map(r -> RoleResponse.fromEntity(r, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RoleDetailResponse getRoleById(Long roleId) {
        RoleEntity role = findRoleById(roleId);
        return RoleDetailResponse.fromEntity(role);
    }

    @Override
    @Transactional
    public RoleDetailResponse createRole(CreateRoleRequest request) {
        String code = normalizeCode(request.getCode());

        if (roleRepository.existsByCode(code)) {
            throw new ConflictException("Mã vai trò '" + code + "' đã tồn tại trong hệ thống!");
        }

        Set<PermissionEntity> permissions = new HashSet<>();
        if (request.getPermissionCodes() != null && !request.getPermissionCodes().isEmpty()) {
            permissions.addAll(permissionRepository.findByCodeIn(request.getPermissionCodes()));
        }

        RoleEntity newRole = RoleEntity.builder()
                .code(code)
                .name(request.getName().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .isSystem(false)
                .permissions(permissions)
                .build();

        RoleEntity saved = roleRepository.save(newRole);
        log.info("Created custom role: {} with {} permissions", code, permissions.size());
        return RoleDetailResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public RoleDetailResponse updateRole(Long roleId, UpdateRoleRequest request) {
        RoleEntity role = findRoleById(roleId);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            role.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            role.setDescription(request.getDescription().trim());
        }

        RoleEntity updated = roleRepository.save(role);
        log.info("Updated role ID {}: {}", roleId, role.getCode());
        return RoleDetailResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteRole(Long roleId) {
        RoleEntity role = findRoleById(roleId);

        // LƯU Ý THIẾT KẾ: Không được xóa vai trò hệ thống (ADMIN, CLIENT, SHOP_OWNER, SHOP_MANAGER, SHOP_STAFF)
        if (role.isSystem()) {
            throw new BadRequestException("Không thể xóa vai trò hệ thống mặc định ('" + role.getCode() + "')!");
        }

        // Kiểm tra xem có người dùng nào đang được gán vai trò này không
        long userCount = userRepository.countUsersWithRoleId(roleId);
        if (userCount > 0) {
            throw new BadRequestException("Không thể xóa vai trò '" + role.getCode() + "' vì đang có " +
                    userCount + " người dùng được gán vai trò này. Vui lòng gỡ vai trò khỏi các người dùng trước!");
        }

        roleRepository.delete(role);
        log.info("Deleted custom role ID {}: {}", roleId, role.getCode());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .sorted(Comparator.comparing(PermissionEntity::getCode))
                .map(PermissionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> getRolePermissions(Long roleId) {
        RoleEntity role = findRoleById(roleId);
        return role.getPermissions().stream()
                .sorted(Comparator.comparing(PermissionEntity::getCode))
                .map(PermissionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<PermissionResponse> assignRolePermissions(Long roleId, AssignRolePermissionsRequest request) {
        RoleEntity role = findRoleById(roleId);

        Set<String> requestedCodes = request.getPermissionCodes() != null
                ? request.getPermissionCodes().stream().map(String::trim).collect(Collectors.toSet())
                : Set.of();

        // QUY TẮC BẢO VỆ: Nếu cấu hình quyền cho vai trò ADMIN, không được loại bỏ các quyền quản trị cốt lõi
        if ("ADMIN".equalsIgnoreCase(role.getCode())) {
            for (String essential : ESSENTIAL_ADMIN_PERMISSIONS) {
                if (!requestedCodes.contains(essential)) {
                    throw new BadRequestException("Không thể loại bỏ quyền cốt lõi '" + essential + "' khỏi vai trò ADMIN!");
                }
            }
        }

        List<PermissionEntity> matched = permissionRepository.findByCodeIn(requestedCodes);
        role.setPermissions(new HashSet<>(matched));

        roleRepository.save(role);
        log.info("Updated permissions for role {}: {} permissions assigned", role.getCode(), matched.size());

        return getRolePermissions(roleId);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<String> getCurrentUserPermissions(String username) {
        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + username));

        // Nếu là ADMIN, cấp toàn bộ quyền
        if (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ADMIN) {
            return permissionRepository.findAll().stream()
                    .map(PermissionEntity::getCode)
                    .collect(Collectors.toSet());
        }

        Set<String> permissions = new HashSet<>();
        if (user.getRoles() != null) {
            for (RoleEntity r : user.getRoles()) {
                if ("ADMIN".equalsIgnoreCase(r.getCode())) {
                    return permissionRepository.findAll().stream()
                            .map(PermissionEntity::getCode)
                            .collect(Collectors.toSet());
                }
                if (r.getPermissions() != null) {
                    r.getPermissions().forEach(p -> permissions.add(p.getCode()));
                }
            }
        }

        // Nếu chưa có trong user_roles, fallback tìm role theo primary role
        if (permissions.isEmpty() && user.getRole() != null) {
            String primaryCode = user.getRole().name();
            if (primaryCode.startsWith("ROLE_")) {
                primaryCode = primaryCode.substring(5);
            }
            if ("USER".equalsIgnoreCase(primaryCode)) {
                primaryCode = "CLIENT";
            }
            RoleEntity fallbackRole = roleRepository.findByCode(primaryCode).orElse(null);
            if (fallbackRole != null && fallbackRole.getPermissions() != null) {
                fallbackRole.getPermissions().forEach(p -> permissions.add(p.getCode()));
            }
        }

        return permissions;
    }

    private RoleEntity findRoleById(Long roleId) {
        return roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò với ID: " + roleId));
    }

    private String normalizeCode(String raw) {
        if (raw == null) return "";
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if (upper.startsWith("ROLE_")) {
            upper = upper.substring(5);
        }
        return upper;
    }
}
