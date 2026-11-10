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
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDetailResponse {

    private Long id;
    private Long shopId;
    private ShopSummaryResponse shop;
    private Long categoryId;
    private String categoryName;
    private String categorySlug;
    private Long brandId;
    private BrandSummaryResponse brand;

    private String name;
    private String slug;
    private String shortDescription;
    private String description;
    private Integer warrantyMonths;
    private ProductStatus status;

    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private Boolean inStock;
    private Integer totalStockQuantity;

    @Builder.Default
    private List<ProductVariantResponse> variants = new ArrayList<>();

    @Builder.Default
    private List<ProductImageResponse> images = new ArrayList<>();

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    public static ProductDetailResponse fromEntity(
            Product product,
            List<ProductVariantResponse> variants,
            List<ProductImageResponse> images,
            BigDecimal minPrice,
            BigDecimal maxPrice
    ) {
        if (product == null) return null;
        List<ProductVariantResponse> safeVariants = variants != null ? variants : new ArrayList<>();
        int totalStock = safeVariants.stream()
                .mapToInt(v -> v.getAvailableQuantity() != null ? v.getAvailableQuantity() : (v.getStockQuantity() != null ? v.getStockQuantity() : 0))
                .sum();
        boolean inStock = safeVariants.isEmpty() ? (product.getStatus() == ProductStatus.ACTIVE) : safeVariants.stream()
                .anyMatch(v -> (v.getAvailableQuantity() != null && v.getAvailableQuantity() > 0) || (v.getStockQuantity() != null && v.getStockQuantity() > 0));

        return ProductDetailResponse.builder()
                .id(product.getId())
                .shopId(product.getShopId())
                .shop(product.getShop() != null ? ShopSummaryResponse.fromEntity(product.getShop()) : null)
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .categorySlug(product.getCategory() != null ? product.getCategory().getSlug() : null)
                .brandId(product.getBrandId())
                .brand(product.getBrand() != null ? BrandSummaryResponse.fromEntity(product.getBrand()) : null)
                .name(product.getName())
                .slug(product.getSlug())
                .shortDescription(product.getShortDescription())
                .description(product.getDescription())
                .warrantyMonths(product.getWarrantyMonths())
                .status(product.getStatus())
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .inStock(inStock)
                .totalStockQuantity(totalStock)
                .variants(safeVariants)
                .images(images != null ? images : new ArrayList<>())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}

