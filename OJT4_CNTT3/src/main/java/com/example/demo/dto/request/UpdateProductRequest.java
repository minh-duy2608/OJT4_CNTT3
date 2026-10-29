package com.example.demo.dto.request;

import com.example.demo.entity.ProductStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProductRequest {

    private String name;

    private String slug;

    private Long categoryId;

    private Long brandId;

    private Long shopId;

    private String shortDescription;

    private String description;

    private Integer warrantyMonths;

    private ProductStatus status;

    private List<CreateProductVariantRequest> variants;

    private List<CreateProductImageRequest> images;
}
