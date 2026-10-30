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
    private final com.example.demo.repository.BrandRepository brandRepository;
    private final com.example.demo.repository.ShopRepository shopRepository;
    private final com.example.demo.repository.ProductRepository productRepository;
    private final com.example.demo.repository.ProductVariantRepository productVariantRepository;
    private final com.example.demo.repository.ProductImageRepository productImageRepository;
    private final com.example.demo.repository.InventoryRepository inventoryRepository;
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
        initDefaultBrands();
        initDefaultShopAndProducts();
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

        // 3. SHOP_MANAGER (Quản lý shop)
        RoleEntity managerRole = roleRepository.findByCode("SHOP_MANAGER").orElseGet(() ->
                roleRepository.save(RoleEntity.builder()
                        .code("SHOP_MANAGER")
                        .name("Quản lý shop")
                        .description("Quản lý và vận hành cửa hàng")
                        .isSystem(true)
                        .build()));
        if (managerRole.getPermissions() == null || managerRole.getPermissions().isEmpty()) {
            Set<String> managerPermCodes = Set.of(
                    "PRODUCT_CREATE", "PRODUCT_UPDATE_OWN", "PRODUCT_DELETE_OWN", "INVENTORY_MANAGE_OWN",
                    "COUPON_CREATE_OWN", "COUPON_UPDATE_OWN", "COUPON_VIEW_OWN",
                    "ORDER_VIEW_OWN", "ORDER_UPDATE_OWN", "REVIEW_VIEW",
                    "REVIEW_REPLY_OWN", "REPORT_VIEW_OWN", "RETURN_MANAGE_OWN", "NOTIFICATION_VIEW_OWN"
            );
            List<PermissionEntity> managerPerms = permissionRepository.findByCodeIn(managerPermCodes);
            managerRole.setPermissions(new HashSet<>(managerPerms));
            roleRepository.save(managerRole);
        }

        // Dọn dẹp các vai trò không còn sử dụng: SHOP_OWNER và SHOP_STAFF
        List<String> deprecatedCodes = List.of("SHOP_OWNER", "SHOP_STAFF");
        for (String code : deprecatedCodes) {
            roleRepository.findByCode(code).ifPresent(depRole -> {
                List<User> usersWithRole = userRepository.findAll();
                for (User u : usersWithRole) {
                    boolean userChanged = false;
                    if (u.getRoles() != null && u.getRoles().contains(depRole)) {
                        u.getRoles().remove(depRole);
                        if (u.getRoles().isEmpty()) {
                            u.getRoles().add(clientRole);
                        }
                        userChanged = true;
                    }
                    if (u.getRole() == Role.SHOP_OWNER || u.getRole() == Role.SHOP_STAFF) {
                        u.setRole(Role.CLIENT);
                        userChanged = true;
                    }
                    if (userChanged) {
                        userRepository.save(u);
                    }
                }
                depRole.getPermissions().clear();
                roleRepository.save(depRole);
                roleRepository.delete(depRole);
                log.info("Cleaned up deprecated system role: {}", code);
            });
        }
    }

    private void initDefaultAdmin() {
        RoleEntity adminRole = roleRepository.findByCode("ADMIN").orElse(null);
        RoleEntity clientRole = roleRepository.findByCode("CLIENT").orElse(null);

        // 1. Đảm bảo tài khoản 1 (tài khoản đang dùng: hson05542@gmail.com) có quyền ADMIN
        var user1Opt = userRepository.findByEmail("hson05542@gmail.com");
        if (user1Opt.isPresent()) {
            User u1 = user1Opt.get();
            u1.setRole(Role.ROLE_ADMIN);
            if (adminRole != null) {
                if (u1.getRoles() == null) {
                    u1.setRoles(new HashSet<>());
                }
                u1.getRoles().add(adminRole);
            }
            userRepository.save(u1);
            log.info("Assigned ADMIN privileges to primary user: {}", u1.getEmail());
        }

        // 2. Đảm bảo tài khoản 2 (son666727@gmail.com) có mật khẩu Hoangson06 và quyền ADMIN
        var user2Opt = userRepository.findByEmail("son666727@gmail.com");
        if (user2Opt.isPresent()) {
            User u2 = user2Opt.get();
            u2.setRole(Role.ROLE_ADMIN);
            u2.setPassword(passwordEncoder.encode("Hoangson06"));
            u2.setStatus(UserStatus.ACTIVE);
            if (u2.getEmailVerifiedAt() == null) {
                u2.setEmailVerifiedAt(LocalDateTime.now());
            }
            if (adminRole != null) {
                if (u2.getRoles() == null) {
                    u2.setRoles(new HashSet<>());
                }
                u2.getRoles().add(adminRole);
            }
            userRepository.save(u2);
            log.info("Updated admin account son666727@gmail.com with password Hoangson06");
        } else {
            User u2 = User.builder()
                    .username("son666727")
                    .email("son666727@gmail.com")
                    .fullName("Hoàng Sơn")
                    .password(passwordEncoder.encode("Hoangson06"))
                    .role(Role.ROLE_ADMIN)
                    .status(UserStatus.ACTIVE)
                    .emailVerifiedAt(LocalDateTime.now())
                    .roles(adminRole != null ? new HashSet<>(Set.of(adminRole)) : new HashSet<>())
                    .build();
            userRepository.save(u2);
            log.info("Created new admin account son666727@gmail.com with password Hoangson06");
        }

        // 3. Đảm bảo tài khoản quản trị hệ thống mặc định (admin@gmail.com) có mật khẩu Admin@123456 và quyền ADMIN
        var adminOpt = userRepository.findByEmail("admin@gmail.com");
        if (adminOpt.isPresent()) {
            User adminUser = adminOpt.get();
            adminUser.setRole(Role.ROLE_ADMIN);
            adminUser.setPassword(passwordEncoder.encode("Admin@123456"));
            adminUser.setStatus(UserStatus.ACTIVE);
            if (adminUser.getEmailVerifiedAt() == null) {
                adminUser.setEmailVerifiedAt(LocalDateTime.now());
            }
            if (adminRole != null) {
                if (adminUser.getRoles() == null) {
                    adminUser.setRoles(new HashSet<>());
                }
                adminUser.getRoles().add(adminRole);
            }
            userRepository.save(adminUser);
            log.info("Updated admin account admin@gmail.com with password Admin@123456");
        } else {
            User adminUser = User.builder()
                    .username("admin")
                    .email("admin@gmail.com")
                    .fullName("Quản Trị Viên Cyber")
                    .password(passwordEncoder.encode("Admin@123456"))
                    .role(Role.ROLE_ADMIN)
                    .status(UserStatus.ACTIVE)
                    .emailVerifiedAt(LocalDateTime.now())
                    .roles(adminRole != null ? new HashSet<>(Set.of(adminRole)) : new HashSet<>())
                    .build();
            userRepository.save(adminUser);
            log.info("Created default admin account admin@gmail.com with password Admin@123456");
        }

        // 4. Thu hồi quyền ADMIN của bất kỳ tài khoản nào khác không thuộc danh sách quản trị viên được phép
        List<User> allUsers = userRepository.findAll();
        for (User u : allUsers) {
            String email = u.getEmail();
            if (!"hson05542@gmail.com".equalsIgnoreCase(email) 
                    && !"son666727@gmail.com".equalsIgnoreCase(email)
                    && !"admin@gmail.com".equalsIgnoreCase(email)) {
                boolean changed = false;
                if (u.getRole() == Role.ROLE_ADMIN || u.getRole() == Role.ADMIN) {
                    u.setRole(Role.ROLE_USER);
                    changed = true;
                }
                if (u.getRoles() != null && adminRole != null && u.getRoles().contains(adminRole)) {
                    u.getRoles().remove(adminRole);
                    if (clientRole != null && u.getRoles().isEmpty()) {
                        u.getRoles().add(clientRole);
                    }
                    changed = true;
                }
                if (changed) {
                    userRepository.save(u);
                    log.info("Revoked admin privilege from non-admin account: {}", u.getUsername());
                }
            }
        }
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

    private void initDefaultBrands() {
        List<com.example.demo.entity.Brand> sampleBrands = List.of(
                com.example.demo.entity.Brand.builder().name("Apple").slug("apple").description("Apple Inc. - iPhone, iPad, Mac, Apple Watch").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Samsung").slug("samsung").description("Samsung Electronics - Galaxy Phones, Tablets, Watches").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Sony").slug("sony").description("Sony - Tai nghe, loa bluetooth, thiết bị âm thanh đỉnh cao").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Dell").slug("dell").description("Dell - Laptop doanh nhân XPS, Alienware Gaming").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Asus").slug("asus").description("Asus - Zenbook, ROG Gaming laptop & linh kiện").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Xiaomi").slug("xiaomi").description("Xiaomi - Thiết bị di động & hệ sinh thái thông minh").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("MSI").slug("msi").description("MSI - Laptop Gaming, Creator & Bo mạch chủ hàng đầu thế giới").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Acer").slug("acer").description("Acer - Laptop Predator, Nitro Gaming và văn phòng mỏng nhẹ").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Lenovo").slug("lenovo").description("Lenovo - ThinkPad doanh nhân, Legion Gaming và Yoga cao cấp").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("HP").slug("hp").description("HP - Laptop OMEN Gaming, Envy, Pavilion và Spectre sang trọng").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("OPPO").slug("oppo").description("OPPO - Camera Phone, Reno & Find X Series cao cấp").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Garmin").slug("garmin").description("Garmin - Đồng hồ thể thao & theo dõi sức khỏe chuyên nghiệp").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Marshall").slug("marshall").description("Marshall - Âm thanh biểu tượng phong cách Rock & Roll Anh Quốc").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("JBL").slug("jbl").description("JBL - Loa bluetooth di động và tai nghe âm bass mạnh mẽ").status(com.example.demo.entity.BrandStatus.ACTIVE).build(),
                com.example.demo.entity.Brand.builder().name("Canon").slug("canon").description("Canon - Máy ảnh chuyên nghiệp EOS & ống kính chính hãng").status(com.example.demo.entity.BrandStatus.ACTIVE).build()
        );

        for (var b : sampleBrands) {
            if (!brandRepository.existsBySlug(b.getSlug())) {
                brandRepository.save(b);
            }
        }
        log.info("Verified and updated default product brands catalog");
    }

    private void initDefaultShopAndProducts() {
        // Đảm bảo có ít nhất 1 shop chính thức
        com.example.demo.entity.Shop officialShop = shopRepository.findBySlug("cyber-official-store").orElseGet(() -> {
            User adminUser = userRepository.findByEmail("son666727@gmail.com")
                    .or(() -> userRepository.findByEmail("hson05542@gmail.com"))
                    .orElse(null);
            Long ownerId = adminUser != null ? adminUser.getId() : 1L;

            return shopRepository.save(com.example.demo.entity.Shop.builder()
                    .ownerId(ownerId)
                    .name("Cyber Flagship Store")
                    .slug("cyber-official-store")
                    .description("Cửa hàng công nghệ chính hãng Cyber Tech Mall")
                    .email("support@cybertech.vn")
                    .phone("19006868")
                    .province("TP. Hồ Chí Minh")
                    .district("Quận 1")
                    .status(com.example.demo.entity.ShopStatus.ACTIVE)
                    .build());
        });

        // Lấy danh mục và thương hiệu mẫu
        var catPhone = categoryRepository.findBySlug("dien-thoai-tablet").orElse(null);
        var catLaptop = categoryRepository.findBySlug("laptop-may-tinh").orElse(null);
        var catAudio = categoryRepository.findBySlug("am-thanh-tai-nghe").orElse(null);
        var catWatch = categoryRepository.findBySlug("dong-ho-thong-minh").orElse(null);

        var brandApple = brandRepository.findBySlug("apple").orElse(null);
        var brandSamsung = brandRepository.findBySlug("samsung").orElse(null);
        var brandSony = brandRepository.findBySlug("sony").orElse(null);
        var brandAsus = brandRepository.findBySlug("asus").orElse(null);
        var brandDell = brandRepository.findBySlug("dell").orElse(null);
        var brandMsi = brandRepository.findBySlug("msi").orElse(null);
        var brandAcer = brandRepository.findBySlug("acer").orElse(null);

        // 1. iPhone 15 Pro Max
        if (catPhone != null && brandApple != null && !productRepository.existsBySlug("iphone-15-pro-max-256gb")) {
            createSampleProduct(
                    officialShop.getId(), catPhone, brandApple,
                    "iPhone 15 Pro Max 256GB", "iphone-15-pro-max-256gb",
                    "Thiết kế titan cao cấp, chip A17 Pro cực mạnh, camera tiềm vọng 5x",
                    "Màn hình Super Retina XDR OLED 6.7 inch 120Hz Promotion. Khung vỏ Titan chuẩn hàng không vũ trụ siêu bền và nhẹ. Cổng USB-C tốc độ truyền 10Gbps.",
                    12, "IP15PM-256-BLK", "Titan Đen 256GB",
                    new java.math.BigDecimal("29990000"), new java.math.BigDecimal("28490000"),
                    50, "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800"
            );
        }

        // 2. Samsung Galaxy S24 Ultra
        if (catPhone != null && brandSamsung != null && !productRepository.existsBySlug("samsung-galaxy-s24-ultra-512gb")) {
            createSampleProduct(
                    officialShop.getId(), catPhone, brandSamsung,
                    "Samsung Galaxy S24 Ultra 512GB", "samsung-galaxy-s24-ultra-512gb",
                    "Quyền năng Galaxy AI, khung viền titan và bút S-Pen thông minh",
                    "Snapdragon 8 Gen 3 for Galaxy, Màn hình Dynamic AMOLED 2X 6.8 inch 2600 nits chống chói. Camera 200MP đột phá.",
                    12, "S24U-512-GRY", "Xám Titan 512GB",
                    new java.math.BigDecimal("31990000"), new java.math.BigDecimal("29990000"),
                    35, "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800"
            );
        }

        // 3. Sony WH-1000XM5
        if (catAudio != null && brandSony != null && !productRepository.existsBySlug("sony-wh-1000xm5")) {
            createSampleProduct(
                    officialShop.getId(), catAudio, brandSony,
                    "Tai nghe chống ồn Sony WH-1000XM5", "sony-wh-1000xm5",
                    "Khả năng chống ồn hàng đầu ngành với bộ xử lý tích hợp V1",
                    "Thời lượng pin lên đến 30 giờ, công nghệ đàm thoại khử tiếng ồn bằng AI, sạc nhanh 3 phút nghe được 3 giờ.",
                    12, "WH1000XM5-BLK", "Đen Huyền Bí",
                    new java.math.BigDecimal("8490000"), new java.math.BigDecimal("7990000"),
                    40, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"
            );
        }

        // 4. Apple Watch Series 9
        if (catWatch != null && brandApple != null && !productRepository.existsBySlug("apple-watch-series-9-gps-45mm")) {
            createSampleProduct(
                    officialShop.getId(), catWatch, brandApple,
                    "Apple Watch Series 9 GPS 45mm", "apple-watch-series-9-gps-45mm",
                    "Chip S9 SiP mạnh mẽ, cử chỉ chạm hai lần Double Tap kỳ diệu",
                    "Màn hình sáng gấp đôi lên đến 2000 nits, theo dõi nhịp tim, điện tâm đồ ECG, theo dõi giấc ngủ chi tiết.",
                    12, "AWS9-45-MID", "Midnight Nhôm 45mm",
                    new java.math.BigDecimal("10490000"), null,
                    25, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"
            );
        }

        // 5. Apple MacBook Air M2
        if (catLaptop != null && brandApple != null && !productRepository.existsBySlug("apple-macbook-air-m2-2024-8cpu-8gpu-16gb-256gb")) {
            createSampleProduct(
                    officialShop.getId(), catLaptop, brandApple,
                    "Apple MacBook Air M2 2024 16GB 256GB", "apple-macbook-air-m2-2024-8cpu-8gpu-16gb-256gb",
                    "MacBook Air M2 được trang bị chip M2 mạnh mẽ, mang lại hiệu năng vượt trội cho việc học và làm việc",
                    "Chip Apple M2 với 8 lõi CPU và 8 lõi GPU. Màn hình Liquid Retina 13.6 inch 500 nits. Thời lượng pin lên đến 18 giờ.",
                    12, "MBA-M2-16-256-SLV", "Bạc Silver 16GB/256GB",
                    new java.math.BigDecimal("21990000"), new java.math.BigDecimal("18500000"),
                    30, "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"
            );
        }

        // 6. Asus ROG Zephyrus G14
        if (catLaptop != null && brandAsus != null && !productRepository.existsBySlug("asus-rog-zephyrus-g14-oled")) {
            createSampleProduct(
                    officialShop.getId(), catLaptop, brandAsus,
                    "Laptop Asus ROG Zephyrus G14 OLED GA403", "asus-rog-zephyrus-g14-oled",
                    "Laptop Gaming màn OLED 3K 120Hz siêu mỏng nhẹ, CPU AMD Ryzen 9 AI, Card đồ họa RTX 4060, vỏ nhôm CNC",
                    "Bộ vi xử lý AMD Ryzen 9 8945HS với Ryzen AI. Card đồ họa NVIDIA GeForce RTX 4060 8GB GDDR6. Màn hình ROG Nebula OLED 3K 120Hz 0.2ms.",
                    24, "ROG-G14-OLED-4060", "Xám Eclipse 16GB/512GB",
                    new java.math.BigDecimal("44990000"), new java.math.BigDecimal("39990000"),
                    20, "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800"
            );
        }

        // 7. Dell XPS 13 Plus
        if (catLaptop != null && brandDell != null && !productRepository.existsBySlug("dell-xps-13-plus-9320")) {
            createSampleProduct(
                    officialShop.getId(), catLaptop, brandDell,
                    "Laptop Dell XPS 13 Plus 9320 Core i7", "dell-xps-13-plus-9320",
                    "Kiệt tác thiết kế siêu mỏng nhẹ, màn hình OLED 3.5K cảm ứng, bàn phím tràn cạnh và thanh cảm ứng điện dung",
                    "Intel Core i7-1360P thế hệ 13. Màn hình 13.4 inch 3.5K OLED InfinityEdge cảm ứng 400 nits. Trọng lượng siêu nhẹ chỉ 1.23kg.",
                    12, "DELL-XPS13-9320", "Bạc Platinum 16GB/512GB",
                    new java.math.BigDecimal("41990000"), new java.math.BigDecimal("36990000"),
                    15, "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800"
            );
        }

        // 8. MSI Cyborg 15
        if (catLaptop != null && brandMsi != null && !productRepository.existsBySlug("msi-cyborg-15-a12v")) {
            createSampleProduct(
                    officialShop.getId(), catLaptop, brandMsi,
                    "Laptop Gaming MSI Cyborg 15 A12V RTX 4050", "msi-cyborg-15-a12v",
                    "Thiết kế cyberpunk xuyên thấu đậm chất tương lai, màn hình 144Hz IPS, CPU Intel Core i7 và card đồ họa RTX 4050",
                    "Intel Core i7-12650H, RTX 4050 6GB GDDR6, Màn hình 15.6 inch FHD 144Hz IPS-level, Bàn phím đèn nền xanh Translucent.",
                    24, "MSI-CYBORG-15", "Đen Translucent 16GB/512GB",
                    new java.math.BigDecimal("24990000"), new java.math.BigDecimal("21990000"),
                    25, "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800"
            );
        }

        // 9. Acer Nitro V 15
        if (catLaptop != null && brandAcer != null && !productRepository.existsBySlug("acer-nitro-v-15-anv15")) {
            createSampleProduct(
                    officialShop.getId(), catLaptop, brandAcer,
                    "Laptop Acer Nitro V 15 ANV15 Core i5 RTX 4050", "acer-nitro-v-15-anv15",
                    "Chiến binh gaming quốc dân, tản nhiệt 2 quạt mát lạnh, màn hình 144Hz siêu mượt và card rời RTX 4050 6GB",
                    "Intel Core i5-13420H, Card rời NVIDIA GeForce RTX 4050 6GB, Màn hình 15.6 inch FHD 144Hz IPS, Tản nhiệt kép cực mát.",
                    12, "ACER-NITRO-V15", "Đen Obsidian 16GB/512GB",
                    new java.math.BigDecimal("22990000"), new java.math.BigDecimal("19990000"),
                    30, "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800"
            );
        }

        log.info("Initialized default shop and catalog sample products");
    }

    private void createSampleProduct(
            Long shopId,
            Category category,
            com.example.demo.entity.Brand brand,
            String name,
            String slug,
            String shortDesc,
            String desc,
            int warranty,
            String sku,
            String variantName,
            java.math.BigDecimal price,
            java.math.BigDecimal salePrice,
            int stock,
            String imageUrl
    ) {
        com.example.demo.entity.Product product = productRepository.save(com.example.demo.entity.Product.builder()
                .shopId(shopId)
                .category(category)
                .brandId(brand.getId())
                .name(name)
                .slug(slug)
                .shortDescription(shortDesc)
                .description(desc)
                .warrantyMonths(warranty)
                .status(com.example.demo.entity.ProductStatus.ACTIVE)
                .build());

        com.example.demo.entity.ProductVariant variant = productVariantRepository.save(com.example.demo.entity.ProductVariant.builder()
                .product(product)
                .sku(sku)
                .variantName(variantName)
                .price(price)
                .salePrice(salePrice)
                .weightGrams(250)
                .status(com.example.demo.entity.ProductVariantStatus.ACTIVE)
                .build());

        inventoryRepository.save(com.example.demo.entity.Inventory.builder()
                .variantId(variant.getId())
                .quantity(stock)
                .reservedQuantity(0)
                .build());

        if (imageUrl != null) {
            productImageRepository.save(com.example.demo.entity.ProductImage.builder()
                    .product(product)
                    .imageUrl(imageUrl)
                    .altText(name)
                    .isPrimary(true)
                    .sortOrder(0)
                    .build());
        }
    }
}
