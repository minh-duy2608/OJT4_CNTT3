package com.example.demo.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponse {

    private Long id;
    private Long variantId;
    private Long productId;
    private Long shopId;
    private String shopName;
    private String productName;
    private String variantName;
    private String sku;
    private String imageUrl;
    private BigDecimal price;
    private BigDecimal salePrice;
    private Integer quantity;
    private Integer stockQuantity;
    private BigDecimal lineTotal;
    private LocalDateTime addedAt;
}

