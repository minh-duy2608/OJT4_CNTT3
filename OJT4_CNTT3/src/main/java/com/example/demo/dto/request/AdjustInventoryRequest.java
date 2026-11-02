package com.example.demo.dto.request;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdjustInventoryRequest {

    /**
     * Phép điều chỉnh: "SET" (cài đặt chính xác), "INCREMENT" (cộng thêm), "DECREMENT" (trừ bớt), "ADJUST" (cộng/trừ theo adjustment)
     */
    private String operation;

    /**
     * Số lượng tồn kho mới (dùng khi operation = "SET")
     */
    @Min(value = 0, message = "Số lượng tồn kho không được âm")
    private Integer quantity;

    /**
     * Mức thay đổi tăng/giảm (+/-)
     */
    private Integer adjustment;

    /**
     * Số lượng hàng đang tạm giữ
     */
    @Min(value = 0, message = "Số lượng tạm giữ không được âm")
    private Integer reservedQuantity;

    /**
     * Lý do điều chỉnh kho (nhập hàng, kiểm kho, hư hại, trả hàng)
     */
    private String reason;
}
