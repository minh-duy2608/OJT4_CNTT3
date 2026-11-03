package com.example.demo.dto.request;

import com.example.demo.entity.ShopStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateShopStatusRequest {

    @NotNull(message = "Trạng thái không được để trống")
    private ShopStatus status;

    private String rejectionReason;
}

