package com.example.demo.dto.response;

import com.example.demo.entity.Brand;
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
public class BrandSummaryResponse {

    private Long id;
    private String name;
    private String slug;
    private String logoUrl;

    public static BrandSummaryResponse fromEntity(Brand brand) {
        if (brand == null) return null;
        return BrandSummaryResponse.builder()
                .id(brand.getId())
                .name(brand.getName())
                .slug(brand.getSlug())
                .logoUrl(brand.getLogoUrl())
                .build();
    }
}

