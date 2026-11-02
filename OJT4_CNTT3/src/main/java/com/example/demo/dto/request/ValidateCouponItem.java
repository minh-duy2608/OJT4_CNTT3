package com.example.demo.dto.request;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidateCouponItem {

    private Long variantId;

    private Long productId;

    @Min(value = 1, message = "Số lượng tối thiểu là 1")
    @Builder.Default
    private Integer quantity = 1;
}

