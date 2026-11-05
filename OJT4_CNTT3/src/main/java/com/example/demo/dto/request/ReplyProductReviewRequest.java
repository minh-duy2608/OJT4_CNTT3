package com.example.demo.dto.request;

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
public class ReplyProductReviewRequest {

    @NotBlank(message = "Nội dung phản hồi không được để trống")
    @Size(max = 2000, message = "Nội dung phản hồi không quá 2000 ký tự")
    private String reply;
}

