package com.example.demo.dto.request;

import com.example.demo.entity.CategoryStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
public class CreateCategoryRequest {

    @NotBlank(message = "Tên danh mục không được để trống")
    @Size(max = 150, message = "Tên danh mục tối đa 150 ký tự")
    private String name;

    @Size(max = 180, message = "Slug tối đa 180 ký tự")
    private String slug;

    private String description;

    @Size(max = 500, message = "URL hình ảnh tối đa 500 ký tự")
    private String imageUrl;

    private Long parentId;

    @Builder.Default
    private Integer sortOrder = 0;

    @Builder.Default
    private CategoryStatus status = CategoryStatus.ACTIVE;
}
