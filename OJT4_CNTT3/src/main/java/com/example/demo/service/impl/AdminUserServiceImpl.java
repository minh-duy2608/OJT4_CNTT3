package com.example.demo.service.impl;

import com.example.demo.dto.request.AdminAssignRolesRequest;
import com.example.demo.dto.request.AdminUpdateUserRequest;
import com.example.demo.dto.request.AdminUpdateUserStatusRequest;
import com.example.demo.dto.response.AddressResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.RoleResponse;
import com.example.demo.dto.response.UserDetailResponse;
import com.example.demo.dto.response.UserResponse;
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
import com.example.demo.service.AdminUserService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserServiceImpl implements AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AddressRepository addressRepository;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "username", "email", "fullName", "role", "status", "createdAt", "updatedAt"
    );

    private static final Map<String, String> DEFAULT_ROLE_NAMES = Map.of(
            "ADMIN", "Quản trị viên",
            "CLIENT", "Khách hàng",
            "SHOP_OWNER", "Chủ cửa hàng",
            "SHOP_MANAGER", "Quản lý cửa hàng",
            "SHOP_STAFF", "Nhân viên cửa hàng"
    );

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getUsers(
            String keyword,
            String role,
            UserStatus status,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        String cleanSortBy = (sortBy != null && ALLOWED_SORT_FIELDS.contains(sortBy)) ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(direction, cleanSortBy));

        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Tìm kiếm theo từ khóa (username, email, fullName, phone)
            if (keyword != null && !keyword.trim().isEmpty()) {
                String pattern = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
                Predicate usernameMatch = cb.like(cb.lower(root.get("username")), pattern);
                Predicate emailMatch = cb.like(cb.lower(root.get("email")), pattern);
                Predicate nameMatch = cb.like(cb.lower(root.get("fullName")), pattern);
                Predicate phoneMatch = cb.like(root.get("phone"), pattern);
                predicates.add(cb.or(usernameMatch, emailMatch, nameMatch, phoneMatch));
            }

            // 2. Lọc theo trạng thái tài khoản
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            // 3. Lọc theo vai trò (role)
            if (role != null && !role.trim().isEmpty()) {
                String normalizedRole = normalizeRoleCode(role.trim());
                try {
                    Role roleEnum = Role.valueOf(normalizedRole);
                    predicates.add(cb.equal(root.get("role"), roleEnum));
                } catch (IllegalArgumentException ignored) {
                    // Thử tìm role có tiền tố ROLE_
                    try {
                        Role roleEnumPrefixed = Role.valueOf("ROLE_" + normalizedRole);
                        predicates.add(cb.equal(root.get("role"), roleEnumPrefixed));
                    } catch (IllegalArgumentException ex) {
                        log.warn("Unknown role filter: {}", role);
                    }
                }
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> userPage = userRepository.findAll(spec, pageable);
        return PageResponse.from(userPage.map(UserResponse::fromEntity));
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetailResponse getUserById(Long userId) {
        User user = findUserById(userId);
        List<RoleResponse> roles = getUserRoles(userId);
        List<AddressResponse> addresses = addressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user)
                .stream()
                .map(AddressResponse::fromEntity)
                .collect(Collectors.toList());

        return UserDetailResponse.of(user, roles, addresses);
    }

    @Override
    @Transactional
    public UserResponse updateUser(Long userId, AdminUpdateUserRequest request) {
        User user = findUserById(userId);

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }
        if (request.getEmailVerified() != null) {
            if (Boolean.TRUE.equals(request.getEmailVerified())) {
                if (user.getEmailVerifiedAt() == null) {
                    user.setEmailVerifiedAt(LocalDateTime.now());
                }
            } else {
                user.setEmailVerifiedAt(null);
            }
        }

        User saved = userRepository.save(user);
        log.info("Admin updated user profile: ID {}", userId);
        return UserResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public UserResponse updateUserStatus(String currentAdminUsername, Long userId, AdminUpdateUserStatusRequest request) {
        User user = findUserById(userId);
        UserStatus newStatus = request.getStatus();

        // QUY TẮC BẢO VỆ 1: Quản trị viên không được tự khóa hoặc xóa tài khoản của chính mình
        if (user.getUsername().equalsIgnoreCase(currentAdminUsername) && newStatus != UserStatus.ACTIVE) {
            throw new BadRequestException("Bạn không thể tự khóa hoặc hủy kích hoạt tài khoản của chính mình!");
        }

        // QUY TẮC BẢO VỆ 2: Không được khóa hoặc xóa Quản trị viên (ADMIN) duy nhất còn hoạt động
        if (isUserAdmin(user) && newStatus != UserStatus.ACTIVE) {
            long activeAdmins = userRepository.countActiveAdmins(UserStatus.ACTIVE, Role.ROLE_ADMIN, Role.ADMIN);
            if (activeAdmins <= 1) {
                throw new BadRequestException("Không thể khóa hoặc xóa Quản trị viên (ADMIN) duy nhất đang hoạt động trong hệ thống!");
            }
        }

        // Cập nhật trạng thái
        user.setStatus(newStatus);

        // BẢO MẬT: Nếu tài khoản bị Khóa (LOCKED), Chặn (BLOCKED) hoặc Xóa mềm (DELETED),
        // thu hồi toàn bộ token đăng nhập đang hoạt động của người dùng đó
        if (newStatus == UserStatus.LOCKED || newStatus == UserStatus.DELETED || newStatus == UserStatus.BLOCKED) {
            int revokedCount = refreshTokenRepository.revokeAllByUser(user);
            log.info("Revoked {} active refresh tokens for locked/deleted user ID {}", revokedCount, userId);
        }

        User saved = userRepository.save(user);
        log.info("Admin updated status for user ID {} to {} (Reason: {})", userId, newStatus, request.getReason());
        return UserResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> getUserRoles(Long userId) {
        User user = findUserById(userId);
        List<RoleResponse> result = new ArrayList<>();

        Set<String> processedCodes = new HashSet<>();

        // 1. Lấy từ danh sách user_roles nếu đã được gán
        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            for (RoleEntity r : user.getRoles()) {
                boolean isPrimary = isPrimaryRole(user.getRole(), r.getCode());
                result.add(RoleResponse.fromEntity(r, isPrimary));
                processedCodes.add(r.getCode().toUpperCase(Locale.ROOT));
            }
        }

        // 2. Nếu chưa có trong user_roles, lấy từ thuộc tính role chính của user
        if (user.getRole() != null) {
            String primaryCode = normalizeRoleCode(user.getRole().name());
            if (!processedCodes.contains(primaryCode)) {
                RoleEntity roleEntity = roleRepository.findByCode(primaryCode).orElse(null);
                if (roleEntity != null) {
                    result.add(RoleResponse.fromEntity(roleEntity, true));
                } else {
                    String name = DEFAULT_ROLE_NAMES.getOrDefault(primaryCode, primaryCode);
                    result.add(RoleResponse.fromCode(primaryCode, name, "Vai trò hệ thống", true));
                }
            }
        }

        return result;
    }

    @Override
    @Transactional
    public List<RoleResponse> assignUserRoles(String currentAdminUsername, Long userId, AdminAssignRolesRequest request) {
        User user = findUserById(userId);

        if (request.getRoles() == null || request.getRoles().isEmpty()) {
            throw new BadRequestException("Tập vai trò không được để trống!");
        }

        // Chuẩn hóa danh sách mã vai trò yêu cầu
        Set<String> requestedCodes = request.getRoles().stream()
                .map(this::normalizeRoleCode)
                .collect(Collectors.toSet());

        boolean willHaveAdmin = requestedCodes.contains("ADMIN");
        boolean currentlyIsAdmin = isUserAdmin(user);

        // QUY TẮC BẢO VỆ 1: Admin không thể tự loại bỏ quyền ADMIN của chính mình
        if (user.getUsername().equalsIgnoreCase(currentAdminUsername) && currentlyIsAdmin && !willHaveAdmin) {
            throw new BadRequestException("Bạn không thể tự tước quyền Quản trị viên (ADMIN) của chính tài khoản đang đăng nhập!");
        }

        // QUY TẮC BẢO VỆ 2: Không được loại bỏ quyền của ADMIN duy nhất còn hoạt động
        if (currentlyIsAdmin && !willHaveAdmin && user.getStatus() == UserStatus.ACTIVE) {
            long activeAdmins = userRepository.countActiveAdmins(UserStatus.ACTIVE, Role.ROLE_ADMIN, Role.ADMIN);
            if (activeAdmins <= 1) {
                throw new BadRequestException("Hệ thống phải có ít nhất 1 Quản trị viên (ADMIN) hoạt động. Không thể loại bỏ quyền của Quản trị viên cuối cùng!");
            }
        }

        // Tìm và gán các RoleEntity tương ứng
        Set<RoleEntity> newRoles = new HashSet<>();
        for (String code : requestedCodes) {
            RoleEntity roleEntity = roleRepository.findByCode(code)
                    .orElseGet(() -> {
                        // Tự động tạo RoleEntity nếu là vai trò hệ thống hợp lệ
                        if (DEFAULT_ROLE_NAMES.containsKey(code)) {
                            return roleRepository.save(RoleEntity.builder()
                                    .code(code)
                                    .name(DEFAULT_ROLE_NAMES.get(code))
                                    .description("Vai trò hệ thống " + code)
                                    .isSystem(true)
                                    .build());
                        }
                        throw new BadRequestException("Vai trò không hợp lệ trong hệ thống: " + code);
                    });
            newRoles.add(roleEntity);
        }

        // Cập nhật tập roles
        user.setRoles(newRoles);

        // Đồng bộ thuộc tính role chính (primary role) trên User
        if (willHaveAdmin) {
            user.setRole(Role.ROLE_ADMIN);
        } else if (requestedCodes.contains("SHOP_OWNER")) {
            user.setRole(Role.SHOP_OWNER);
        } else if (requestedCodes.contains("SHOP_MANAGER")) {
            user.setRole(Role.SHOP_MANAGER);
        } else if (requestedCodes.contains("SHOP_STAFF")) {
            user.setRole(Role.SHOP_STAFF);
        } else {
            user.setRole(Role.CLIENT);
        }

        userRepository.save(user);
        log.info("Admin updated roles for user ID {} to {}", userId, requestedCodes);

        return getUserRoles(userId);
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));
    }

    private boolean isUserAdmin(User user) {
        if (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ADMIN) {
            return true;
        }
        if (user.getRoles() != null) {
            return user.getRoles().stream().anyMatch(r -> "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode()));
        }
        return false;
    }

    private boolean isPrimaryRole(Role primaryRole, String code) {
        if (primaryRole == null || code == null) return false;
        String normalizedPrimary = normalizeRoleCode(primaryRole.name());
        return normalizedPrimary.equalsIgnoreCase(normalizeRoleCode(code));
    }

    private String normalizeRoleCode(String raw) {
        if (raw == null) return "CLIENT";
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if (upper.startsWith("ROLE_")) {
            upper = upper.substring(5);
        }
        if ("USER".equalsIgnoreCase(upper)) {
            return "CLIENT";
        }
        return upper;
    }
}

