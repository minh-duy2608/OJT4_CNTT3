package com.example.demo.dto.response;

import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductSummaryResponse {

    private Long id;
    private Long shopId;
    private Long categoryId;
    private String categoryName;
    private Long brandId;
    private String name;
    private String slug;
    private String shortDescription;
    private Integer warrantyMonths;
    private ProductStatus status;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    public static ProductSummaryResponse fromEntity(Product product) {
        if (product == null) return null;
        return ProductSummaryResponse.builder()
                .id(product.getId())
                .shopId(product.getShopId())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .brandId(product.getBrandId())
                .name(product.getName())
                .slug(product.getSlug())
                .shortDescription(product.getShortDescription())
                .warrantyMonths(product.getWarrantyMonths())
                .status(product.getStatus())
                .createdAt(product.getCreatedAt())
                .build();
    }
}
