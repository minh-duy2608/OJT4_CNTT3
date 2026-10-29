package com.example.demo.dto.response;

import com.example.demo.entity.ProductImage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductImageResponse {

    private Long id;
    private Long productId;
    private String imageUrl;
    private String altText;
    private boolean isPrimary;
    private int sortOrder;

    public static ProductImageResponse fromEntity(ProductImage image) {
        if (image == null) return null;
        return ProductImageResponse.builder()
                .id(image.getId())
                .productId(image.getProduct() != null ? image.getProduct().getId() : null)
                .imageUrl(image.getImageUrl())
                .altText(image.getAltText())
                .isPrimary(image.isPrimary())
                .sortOrder(image.getSortOrder())
                .build();
    }
}
