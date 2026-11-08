package com.example.demo.dto.request;

import com.example.demo.entity.ShopMemberStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateShopMemberRequest {

    private Long roleId;

    private String roleCode;

    private ShopMemberStatus status;
}
