package com.example.demo.config;

import com.example.demo.entity.RoleEntity;
import com.example.demo.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class RoleDataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        initRoles();
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
}
