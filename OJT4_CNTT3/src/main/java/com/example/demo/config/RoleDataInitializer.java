package com.example.demo.config;

import com.example.demo.entity.Category;
import com.example.demo.entity.CategoryStatus;
import com.example.demo.entity.PermissionEntity;
import com.example.demo.entity.Role;
import com.example.demo.entity.RoleEntity;
import com.example.demo.entity.User;
import com.example.demo.entity.UserStatus;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.PermissionRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoleDataInitializer implements CommandLineRunner {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;

    // 44 Standard Permissions extracted from 01-init.sql
    private static final List<String[]> PERMISSION_DEFINITIONS = List.of(
            new String[]{"USER_VIEW", "Xem người dùng", "Xem danh sách tài khoản"},
            new String[]{"USER_CREATE", "Tạo người dùng", "Tạo tài khoản"},
            new String[]{"USER_UPDATE", "Cập nhật người dùng", "Sửa thông tin tài khoản"},
            new String[]{"USER_LOCK", "Khóa người dùng", "Khóa hoặc mở khóa tài khoản"},
            new String[]{"ROLE_VIEW", "Xem vai trò", "Xem danh sách vai trò"},
            new String[]{"ROLE_CREATE", "Tạo vai trò", "Tạo vai trò tùy chỉnh"},
            new String[]{"ROLE_UPDATE", "Sửa vai trò", "Cập nhật vai trò"},
            new String[]{"ROLE_DELETE", "Xóa vai trò", "Xóa vai trò tùy chỉnh"},
            new String[]{"ROLE_ASSIGN", "Gán vai trò", "Gán vai trò cho tài khoản"},
            new String[]{"PERMISSION_ASSIGN", "Gán quyền", "Gán quyền cho vai trò"},
            new String[]{"SHOP_VIEW_ALL", "Xem mọi cửa hàng", "Xem tất cả cửa hàng"},
            new String[]{"SHOP_APPROVE", "Duyệt cửa hàng", "Duyệt/từ chối đăng ký Shop"},
            new String[]{"SHOP_UPDATE_OWN", "Sửa cửa hàng của mình", "Cập nhật hồ sơ Shop được quản lý"},
            new String[]{"SHOP_MANAGE_ALL", "Quản lý mọi cửa hàng", "Quản trị mọi Shop"},
            new String[]{"PRODUCT_VIEW", "Xem sản phẩm", "Xem sản phẩm công khai"},
            new String[]{"PRODUCT_CREATE", "Tạo sản phẩm", "Tạo sản phẩm trong Shop"},
            new String[]{"PRODUCT_UPDATE_OWN", "Sửa sản phẩm của Shop", "Sửa sản phẩm trong phạm vi Shop"},
            new String[]{"PRODUCT_DELETE_OWN", "Xóa sản phẩm của Shop", "Ẩn/xóa mềm sản phẩm thuộc Shop"},
            new String[]{"PRODUCT_MODERATE", "Kiểm duyệt sản phẩm", "Duyệt/ẩn sản phẩm toàn hệ thống"},
            new String[]{"CATEGORY_MANAGE", "Quản lý danh mục", "Quản lý danh mục sản phẩm"},
            new String[]{"BRAND_MANAGE", "Quản lý thương hiệu", "Quản lý thương hiệu"},
            new String[]{"INVENTORY_MANAGE_OWN", "Quản lý tồn kho", "Quản lý tồn kho Shop"},
            new String[]{"COUPON_CREATE_OWN", "Tạo mã giảm giá", "Tạo mã cho Shop của mình"},
            new String[]{"COUPON_UPDATE_OWN", "Sửa mã giảm giá", "Sửa mã của Shop mình"},
            new String[]{"COUPON_VIEW_OWN", "Xem mã giảm giá", "Xem mã của Shop mình"},
            new String[]{"ORDER_VIEW_OWN", "Xem đơn hàng Shop", "Xem đơn hàng thuộc Shop"},
            new String[]{"ORDER_UPDATE_OWN", "Xử lý đơn hàng Shop", "Cập nhật trạng thái đơn Shop"},
            new String[]{"ORDER_VIEW_ALL", "Xem mọi đơn hàng", "Xem đơn hàng toàn hệ thống"},
            new String[]{"ORDER_MANAGE_ALL", "Quản lý mọi đơn hàng", "Quản lý đơn hàng toàn hệ thống"},
            new String[]{"CART_MANAGE_OWN", "Quản lý giỏ hàng", "Quản lý giỏ hàng cá nhân"},
            new String[]{"ADDRESS_MANAGE_OWN", "Quản lý địa chỉ", "Quản lý địa chỉ cá nhân"},
            new String[]{"ORDER_CREATE_OWN", "Đặt hàng", "Tạo đơn hàng cá nhân"},
            new String[]{"ORDER_VIEW_CUSTOMER", "Xem đơn hàng cá nhân", "Xem đơn hàng của mình"},
            new String[]{"ORDER_CANCEL_OWN", "Hủy đơn hàng cá nhân", "Hủy đơn nếu thỏa điều kiện"},
            new String[]{"REVIEW_CREATE_OWN", "Đánh giá Shop", "Đánh giá đơn giao thành công của mình"},
            new String[]{"REVIEW_VIEW", "Xem đánh giá", "Xem đánh giá công khai"},
            new String[]{"REVIEW_MODERATE", "Kiểm duyệt đánh giá", "Ẩn đánh giá vi phạm"},
            new String[]{"REVIEW_REPLY_OWN", "Phản hồi đánh giá", "Phản hồi đánh giá Shop mình"},
            new String[]{"REPORT_VIEW_OWN", "Xem báo cáo Shop", "Xem số liệu Shop mình"},
            new String[]{"REPORT_VIEW_ALL", "Xem báo cáo toàn hệ thống", "Xem báo cáo toàn hệ thống"},
            new String[]{"RETURN_MANAGE_OWN", "Xử lý đổi trả Shop", "Xử lý yêu cầu thuộc Shop"},
            new String[]{"RETURN_MANAGE_ALL", "Quản lý mọi đổi trả", "Quản lý đổi trả toàn hệ thống"},
            new String[]{"AUDIT_VIEW", "Xem nhật ký", "Xem nhật ký kiểm toán"},
            new String[]{"NOTIFICATION_VIEW_OWN", "Xem thông báo", "Xem thông báo của mình"}
    );

    @Override
    @Transactional
    public void run(String... args) {
        initPermissions();
        initRoles();
        initDefaultAdmin();
        initDefaultCategories();
    }

    private void initPermissions() {
        for (String[] def : PERMISSION_DEFINITIONS) {
            String code = def[0];
            String name = def[1];
            String desc = def[2];
            if (!permissionRepository.existsByCode(code)) {
                permissionRepository.save(PermissionEntity.builder()
                        .code(code)
                        .name(name)
                        .description(desc)
                        .build());
            }
        }
    }

    private void initRoles() {
        List<PermissionEntity> allPermissions = permissionRepository.findAll();

        // 1. ADMIN
        RoleEntity adminRole = roleRepository.findByCode("ADMIN").orElseGet(() ->
                roleRepository.save(RoleEntity.builder()
                        .code("ADMIN")
                        .name("Quản trị viên")
                        .description("Quản lý toàn hệ thống")
                        .isSystem(true)
                        .build()));
        if (adminRole.getPermissions() == null || adminRole.getPermissions().size() < allPermissions.size()) {
            adminRole.setPermissions(new HashSet<>(allPermissions));
            roleRepository.save(adminRole);
        }

        // 2. CLIENT
        RoleEntity clientRole = roleRepository.findByCode("CLIENT").orElseGet(() ->
                roleRepository.save(RoleEntity.builder()
                        .code("CLIENT")
                        .name("Khách hàng")
                        .description("Người mua hàng")
                        .isSystem(true)
                        .build()));
        if (clientRole.getPermissions() == null || clientRole.getPermissions().isEmpty()) {
            Set<String> clientPermCodes = Set.of(
                    "PRODUCT_VIEW", "CART_MANAGE_OWN", "ADDRESS_MANAGE_OWN",
                    "ORDER_CREATE_OWN", "ORDER_VIEW_CUSTOMER", "ORDER_CANCEL_OWN",
                    "REVIEW_CREATE_OWN", "REVIEW_VIEW", "NOTIFICATION_VIEW_OWN"
            );
            List<PermissionEntity> clientPerms = permissionRepository.findByCodeIn(clientPermCodes);
            clientRole.setPermissions(new HashSet<>(clientPerms));
            roleRepository.save(clientRole);
        }

        // 3. SHOP_OWNER
        RoleEntity ownerRole = roleRepository.findByCode("SHOP_OWNER").orElseGet(() ->
                roleRepository.save(RoleEntity.builder()
                        .code("SHOP_OWNER")
                        .name("Chủ cửa hàng")
                        .description("Quản lý cửa hàng của mình")
                        .isSystem(true)
                        .build()));
        if (ownerRole.getPermissions() == null || ownerRole.getPermissions().isEmpty()) {
            Set<String> ownerPermCodes = Set.of(
                    "SHOP_UPDATE_OWN", "PRODUCT_CREATE", "PRODUCT_UPDATE_OWN", "PRODUCT_DELETE_OWN",
                    "INVENTORY_MANAGE_OWN", "COUPON_CREATE_OWN", "COUPON_UPDATE_OWN", "COUPON_VIEW_OWN",
                    "ORDER_VIEW_OWN", "ORDER_UPDATE_OWN", "REVIEW_REPLY_OWN", "REPORT_VIEW_OWN",
                    "RETURN_MANAGE_OWN", "NOTIFICATION_VIEW_OWN"
            );
            List<PermissionEntity> ownerPerms = permissionRepository.findByCodeIn(ownerPermCodes);
            ownerRole.setPermissions(new HashSet<>(ownerPerms));
            roleRepository.save(ownerRole);
        }

        // 4. SHOP_MANAGER
        RoleEntity managerRole = roleRepository.findByCode("SHOP_MANAGER").orElseGet(() ->
                roleRepository.save(RoleEntity.builder()
                        .code("SHOP_MANAGER")
                        .name("Quản lý cửa hàng")
                        .description("Vận hành cửa hàng được phân công")
                        .isSystem(true)
                        .build()));
        if (managerRole.getPermissions() == null || managerRole.getPermissions().isEmpty()) {
            Set<String> managerPermCodes = Set.of(
                    "PRODUCT_CREATE", "PRODUCT_UPDATE_OWN", "INVENTORY_MANAGE_OWN",
                    "COUPON_VIEW_OWN", "ORDER_VIEW_OWN", "ORDER_UPDATE_OWN",
                    "REVIEW_REPLY_OWN", "REPORT_VIEW_OWN", "RETURN_MANAGE_OWN", "NOTIFICATION_VIEW_OWN"
            );
            List<PermissionEntity> managerPerms = permissionRepository.findByCodeIn(managerPermCodes);
            managerRole.setPermissions(new HashSet<>(managerPerms));
            roleRepository.save(managerRole);
        }

        // 5. SHOP_STAFF
        RoleEntity staffRole = roleRepository.findByCode("SHOP_STAFF").orElseGet(() ->
                roleRepository.save(RoleEntity.builder()
                        .code("SHOP_STAFF")
                        .name("Nhân viên cửa hàng")
                        .description("Hỗ trợ vận hành cửa hàng")
                        .isSystem(true)
                        .build()));
        if (staffRole.getPermissions() == null || staffRole.getPermissions().isEmpty()) {
            Set<String> staffPermCodes = Set.of(
                    "ORDER_VIEW_OWN", "ORDER_UPDATE_OWN", "INVENTORY_MANAGE_OWN", "NOTIFICATION_VIEW_OWN"
            );
            List<PermissionEntity> staffPerms = permissionRepository.findByCodeIn(staffPermCodes);
            staffRole.setPermissions(new HashSet<>(staffPerms));
            roleRepository.save(staffRole);
        }
    }

    private void initDefaultAdmin() {
        long activeAdmins = userRepository.countActiveAdmins(UserStatus.ACTIVE, Role.ROLE_ADMIN, Role.ADMIN);
        if (activeAdmins > 0) {
            return;
        }

        RoleEntity adminRole = roleRepository.findByCode("ADMIN").orElse(null);

        // 1. Nếu có tài khoản của bạn (hson05542@gmail.com), tự động gán quyền ADMIN
        var myUser = userRepository.findByEmail("hson05542@gmail.com");
        if (myUser.isPresent()) {
            User user = myUser.get();
            user.setRole(Role.ROLE_ADMIN);
            if (adminRole != null) {
                user.getRoles().add(adminRole);
            }
            userRepository.save(user);
            log.info("Auto-assigned ROLE_ADMIN to user: {}", user.getEmail());
            return;
        }

        // 2. Nếu đã có người dùng khác trong hệ thống, nâng quyền cho người dùng đầu tiên
        var firstUser = userRepository.findAll().stream().findFirst();
        if (firstUser.isPresent()) {
            User user = firstUser.get();
            user.setRole(Role.ROLE_ADMIN);
            if (adminRole != null) {
                user.getRoles().add(adminRole);
            }
            userRepository.save(user);
            log.info("Auto-assigned ROLE_ADMIN to first existing user: {}", user.getUsername());
            return;
        }

        // 3. Nếu DB hoàn toàn trống, tạo tài khoản quản trị viên mặc định: admin / Admin@123456
        User defaultAdmin = User.builder()
                .username("admin")
                .email("admin@cyber.vn")
                .password(passwordEncoder.encode("Admin@123456"))
                .fullName("Quản trị viên hệ thống")
                .role(Role.ROLE_ADMIN)
                .status(UserStatus.ACTIVE)
                .emailVerifiedAt(LocalDateTime.now())
                .roles(adminRole != null ? Set.of(adminRole) : Set.of())
                .build();
        userRepository.save(defaultAdmin);
        log.info("Initialized default system admin account: username 'admin', email 'admin@cyber.vn', password 'Admin@123456'");
    }

    private void initDefaultCategories() {
        if (categoryRepository.count() > 0) {
            return;
        }

        List<Category> sampleCategories = List.of(
                Category.builder().name("Điện thoại & Tablet").slug("dien-thoai-tablet").description("Điện thoại thông minh, máy tính bảng chính hãng").sortOrder(1).status(CategoryStatus.ACTIVE).build(),
                Category.builder().name("Laptop & Máy tính").slug("laptop-may-tinh").description("Laptop văn phòng, laptop gaming, máy tính để bàn").sortOrder(2).status(CategoryStatus.ACTIVE).build(),
                Category.builder().name("Đồng hồ thông minh").slug("dong-ho-thong-minh").description("Smartwatch, vòng đeo tay theo dõi sức khỏe").sortOrder(3).status(CategoryStatus.ACTIVE).build(),
                Category.builder().name("Âm thanh & Tai nghe").slug("am-thanh-tai-nghe").description("Tai nghe True Wireless, chụp tai, loa bluetooth cao cấp").sortOrder(4).status(CategoryStatus.ACTIVE).build(),
                Category.builder().name("Phụ kiện công nghệ").slug("phu-kien-cong-nghe").description("Cáp sạc, pin dự phòng, ốp lưng, chuột, bàn phím").sortOrder(5).status(CategoryStatus.ACTIVE).build()
        );

        categoryRepository.saveAll(sampleCategories);
        log.info("Initialized {} default product categories", sampleCategories.size());
    }
}
