package com.example.demo.dto.response;

import com.example.demo.entity.ProductVariant;
import com.example.demo.entity.ProductVariantStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariantResponse {

    private Long id;
    private Long productId;
    private String sku;
    private String variantName;
    private String attributes;
    private BigDecimal price;
    private BigDecimal salePrice;
    private Integer weightGrams;
    private ProductVariantStatus status;
    private Integer stockQuantity;
    private Integer availableQuantity;

    public static ProductVariantResponse fromEntity(ProductVariant variant) {
        return fromEntity(variant, null, null);
    }

    public static ProductVariantResponse fromEntity(ProductVariant variant, Integer stockQuantity, Integer availableQuantity) {
        if (variant == null) return null;
        return ProductVariantResponse.builder()
                .id(variant.getId())
                .productId(variant.getProduct() != null ? variant.getProduct().getId() : null)
                .sku(variant.getSku())
                .variantName(variant.getVariantName())
                .attributes(variant.getAttributes())
                .price(variant.getPrice())
                .salePrice(variant.getSalePrice())
                .weightGrams(variant.getWeightGrams())
                .status(variant.getStatus())
                .stockQuantity(stockQuantity != null ? stockQuantity : 0)
                .availableQuantity(availableQuantity != null ? availableQuantity : 0)
                .build();
    }
}
