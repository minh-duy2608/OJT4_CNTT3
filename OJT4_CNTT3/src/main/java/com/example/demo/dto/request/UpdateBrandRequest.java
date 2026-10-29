package com.example.demo.dto.request;

import com.example.demo.entity.BrandStatus;
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
public class UpdateBrandRequest {

    @Size(max = 150, message = "Tên thương hiệu tối đa 150 ký tự")
    private String name;

    @Size(max = 180, message = "Slug tối đa 180 ký tự")
    private String slug;

    @Size(max = 500, message = "Logo URL tối đa 500 ký tự")
    private String logoUrl;

    private String description;

    private BrandStatus status;
}
