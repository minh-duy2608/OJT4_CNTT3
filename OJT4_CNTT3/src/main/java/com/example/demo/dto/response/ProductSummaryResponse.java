package com.example.demo.dto.response;

import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductSummaryResponse {

    private Long id;
    private Long shopId;
    private String shopName;
    private Long categoryId;
    private String categoryName;
    private Long brandId;
    private String brandName;
    private String name;
    private String slug;
    private String shortDescription;
    private Integer warrantyMonths;
    private ProductStatus status;
    private String primaryImageUrl;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    public static ProductSummaryResponse fromEntity(Product product) {
        return fromEntity(product, null, null, null);
    }

    public static ProductSummaryResponse fromEntity(
            Product product,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String primaryImageUrl
    ) {
        if (product == null) return null;
        String resolvedImage = primaryImageUrl != null
                ? primaryImageUrl
                : (product.getImages() != null && !product.getImages().isEmpty() ? product.getPrimaryImageUrl() : null);

        return ProductSummaryResponse.builder()
                .id(product.getId())
                .shopId(product.getShopId())
                .shopName(product.getShop() != null ? product.getShop().getName() : null)
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .brandId(product.getBrandId())
                .brandName(product.getBrand() != null ? product.getBrand().getName() : null)
                .name(product.getName())
                .slug(product.getSlug())
                .shortDescription(product.getShortDescription())
                .warrantyMonths(product.getWarrantyMonths())
                .status(product.getStatus())
                .primaryImageUrl(resolvedImage)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .createdAt(product.getCreatedAt())
                .build();
    }
}
