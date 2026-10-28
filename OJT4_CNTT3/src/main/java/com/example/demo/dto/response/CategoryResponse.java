package com.example.demo.dto.response;

import com.example.demo.entity.Category;
import com.example.demo.entity.CategoryStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryResponse {

    private Long id;
    private String name;
    private String slug;
    private String description;
    private String imageUrl;
    private CategoryStatus status;
    private int sortOrder;
    private Long parentId;
    private String parentName;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<CategoryResponse> subCategories = new ArrayList<>();

    public static CategoryResponse fromEntity(Category category) {
        return fromEntity(category, false);
    }

    public static CategoryResponse fromEntity(Category category, boolean includeChildren) {
        if (category == null) return null;

        List<CategoryResponse> subs = new ArrayList<>();
        if (includeChildren && category.getSubCategories() != null) {
            subs = category.getSubCategories().stream()
                    .map(sub -> fromEntity(sub, false))
                    .collect(Collectors.toList());
        }

        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .imageUrl(category.getImageUrl())
                .status(category.getStatus())
                .sortOrder(category.getSortOrder())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .subCategories(subs)
                .build();
    }
}
