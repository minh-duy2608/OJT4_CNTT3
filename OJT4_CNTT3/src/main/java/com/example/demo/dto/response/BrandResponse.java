package com.example.demo.dto.response;

import com.example.demo.entity.Brand;
import com.example.demo.entity.BrandStatus;
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
public class BrandResponse {

    private Long id;
    private String name;
    private String slug;
    private String logoUrl;
    private String description;
    private BrandStatus status;
    private Long productCount;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    public static BrandResponse fromEntity(Brand brand) {
        return fromEntity(brand, null);
    }

    public static BrandResponse fromEntity(Brand brand, Long productCount) {
        if (brand == null) return null;
        return BrandResponse.builder()
                .id(brand.getId())
                .name(brand.getName())
                .slug(brand.getSlug())
                .logoUrl(brand.getLogoUrl())
                .description(brand.getDescription())
                .status(brand.getStatus())
                .productCount(productCount)
                .createdAt(brand.getCreatedAt())
                .build();
    }
}

