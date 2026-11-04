package com.example.demo.dto.request;

import com.example.demo.entity.CouponStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCouponStatusRequest {

    @NotNull(message = "Trạng thái mã giảm giá không được để trống")
    private CouponStatus status;
}

