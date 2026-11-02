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
public class InventoryDetailResponse {

    private Long inventoryId; // Equals variantId
    private Long variantId;
    private Long productId;
    private String productName;
    private String variantName;
    private String sku;
    private BigDecimal price;
    private BigDecimal salePrice;
    private Long shopId;
    private String shopName;
    private Integer quantity;
    private Integer reservedQuantity;
    private Integer availableQuantity;
    private String variantStatus;
    private LocalDateTime updatedAt;
}
