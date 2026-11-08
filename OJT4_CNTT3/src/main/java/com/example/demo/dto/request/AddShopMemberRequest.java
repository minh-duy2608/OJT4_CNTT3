package com.example.demo.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddShopMemberRequest {

    // Có thể truyền userId hoặc username/email của thành viên muốn mời
    private Long userId;

    private String usernameOrEmail;

    // roleId hoặc roleCode (mặc định roleId = 4 / SHOP_MANAGER hoặc SHOP_STAFF)
    private Long roleId;

    private String roleCode;
}

