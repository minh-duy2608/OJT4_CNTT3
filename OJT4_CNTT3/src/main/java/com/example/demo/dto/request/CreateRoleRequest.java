package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateRoleRequest {

    @NotBlank(message = "Mã vai trò không được để trống")
    @Size(min = 2, max = 50, message = "Mã vai trò từ 2 đến 50 ký tự")
    @Pattern(regexp = "^[A-Z0-9_]+$", message = "Mã vai trò chỉ gồm chữ hoa, chữ số và gạch dưới (VD: MARKETING_LEAD)")
    private String code;

    @NotBlank(message = "Tên vai trò không được để trống")
    @Size(max = 100, message = "Tên vai trò tối đa 100 ký tự")
    private String name;

    @Size(max = 255, message = "Mô tả tối đa 255 ký tự")
    private String description;

    private Set<String> permissionCodes;
}
