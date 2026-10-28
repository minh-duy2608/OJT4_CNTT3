package com.example.demo.config;

import com.example.demo.entity.Role;
import com.example.demo.entity.RoleEntity;
import com.example.demo.entity.User;
import com.example.demo.entity.UserStatus;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoleDataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        initRoles();
        initDefaultAdmin();
    }

    private void initRoles() {
        List<RoleEntity> defaultRoles = List.of(
                RoleEntity.builder().code("ADMIN").name("Quản trị viên").description("Quản lý toàn hệ thống").isSystem(true).build(),
                RoleEntity.builder().code("CLIENT").name("Khách hàng").description("Người mua hàng").isSystem(true).build(),
                RoleEntity.builder().code("SHOP_OWNER").name("Chủ cửa hàng").description("Quản lý cửa hàng của mình").isSystem(true).build(),
                RoleEntity.builder().code("SHOP_MANAGER").name("Quản lý cửa hàng").description("Vận hành cửa hàng được phân công").isSystem(true).build(),
                RoleEntity.builder().code("SHOP_STAFF").name("Nhân viên cửa hàng").description("Hỗ trợ vận hành cửa hàng").isSystem(true).build()
        );

        for (RoleEntity r : defaultRoles) {
            if (!roleRepository.existsByCode(r.getCode())) {
                roleRepository.save(r);
                log.info("Initialized system role: {}", r.getCode());
            }
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
}
