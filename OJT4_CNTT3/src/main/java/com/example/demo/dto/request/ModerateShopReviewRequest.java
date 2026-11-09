package com.example.demo.dto.request;

import com.example.demo.entity.ShopReviewStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerateShopReviewRequest {

    @NotNull(message = "Trạng thái kiểm duyệt không được để trống")
    private ShopReviewStatus status;

    private String reason;
}

