package com.example.demo.dto.request;

import jakarta.validation.constraints.Pattern;
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
public class UpdateProfileRequest {

    @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự")
    private String fullName;

    @Pattern(regexp = "^(0|\\+84)[0-9]{9,10}$|^$", message = "Số điện thoại không hợp lệ (ví dụ: 0912345678)")
    private String phone;

    @Size(max = 500, message = "URL ảnh đại diện không được vượt quá 500 ký tự")
    private String avatarUrl;
}

