package com.example.demo.dto.request;

import com.example.demo.entity.ReturnStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessReturnRequest {

    @NotNull(message = "Trạng thái xử lý không được để trống")
    private ReturnStatus status;

    private BigDecimal refundAmount;
    private String resolutionNote;
}

