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
public class WishlistItemResponse {

    private Long productId;
    private String name;
    private String slug;
    private String shortDescription;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private String imageUrl;
    private Long shopId;
    private String shopName;
    private Long categoryId;
    private String categoryName;
    private Long brandId;
    private String brandName;
    private boolean inStock;
    private LocalDateTime addedAt;
}
