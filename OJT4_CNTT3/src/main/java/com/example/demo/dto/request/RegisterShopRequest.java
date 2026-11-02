package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterShopRequest {

    @NotBlank(message = "Tên cửa hàng không được để trống")
    @Size(max = 200, message = "Tên cửa hàng không vượt quá 200 ký tự")
    private String name;

    private String slug;

    private String description;

    private String phone;

    private String email;

    private String province;

    private String district;

    private String ward;

    private String addressDetail;

    private String logoUrl;

    private String bannerUrl;
}
