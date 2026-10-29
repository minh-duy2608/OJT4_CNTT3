package com.example.demo.dto.request;

import com.example.demo.entity.ProductVariantStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProductVariantRequest {

    private Long id;

    @NotBlank(message = "Tên phiên bản không được để trống")
    private String variantName;

    private String sku;

    private String color;

    private String storage;

    private String attributes;

    @NotNull(message = "Giá phiên bản không được để trống")
    @DecimalMin(value = "0.0", message = "Giá không được nhỏ hơn 0")
    private BigDecimal price;

    private BigDecimal salePrice;

    private Integer weightGrams;

    @Builder.Default
    private Integer stockQuantity = 100;

    @Builder.Default
    private ProductVariantStatus status = ProductVariantStatus.ACTIVE;
}
