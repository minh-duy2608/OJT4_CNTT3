package com.example.demo.dto.request;

import com.example.demo.entity.ProductStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProductRequest {

    @NotBlank(message = "Tên sản phẩm không được để trống")
    private String name;

    private String slug;

    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;

    private Long brandId;

    private Long shopId;

    private String shortDescription;

    private String description;

    private Integer warrantyMonths;

    @Builder.Default
    private ProductStatus status = ProductStatus.ACTIVE;

    @Builder.Default
    private List<CreateProductVariantRequest> variants = new ArrayList<>();

    @Builder.Default
    private List<CreateProductImageRequest> images = new ArrayList<>();
}
