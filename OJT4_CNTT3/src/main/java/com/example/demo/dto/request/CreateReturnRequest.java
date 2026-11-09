package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReturnRequest {

    @NotBlank(message = "Lý do yêu cầu trả hàng không được để trống")
    private String reason;

    private String description;

    private String evidenceUrls;

    private String returnMethod;
}

