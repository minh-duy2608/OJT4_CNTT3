package com.example.demo.dto.request;

import com.example.demo.entity.CouponDiscountType;
import com.example.demo.entity.CouponStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCouponRequest {

    // Có thể null nếu người tạo là Người bán (sẽ tự động gán shop do người dùng sở hữu)
    private Long shopId;

    @NotBlank(message = "Mã giảm giá không được để trống")
    @Size(min = 2, max = 50, message = "Mã giảm giá phải từ 2 đến 50 ký tự")
    private String code;

    @NotBlank(message = "Tên chương trình ưu đãi không được để trống")
    @Size(max = 150, message = "Tên chương trình không vượt quá 150 ký tự")
    private String name;

    private String description;

    @NotNull(message = "Loại giảm giá không được để trống")
    private CouponDiscountType discountType;

    @NotNull(message = "Giá trị giảm không được để trống")
    @DecimalMin(value = "0.01", message = "Giá trị giảm phải lớn hơn 0")
    private BigDecimal discountValue;

    private BigDecimal maxDiscountAmount;

    @Builder.Default
    private BigDecimal minOrderAmount = BigDecimal.ZERO;

    private Integer usageLimit;

    private Integer perUserLimit;

    @NotNull(message = "Thời gian bắt đầu áp dụng không được để trống")
    @JsonFormat(pattern = "yyyy-MM-dd['T'][ ]HH:mm[:ss]")
    private LocalDateTime startAt;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    @JsonFormat(pattern = "yyyy-MM-dd['T'][ ]HH:mm[:ss]")
    private LocalDateTime endAt;

    @Builder.Default
    private CouponStatus status = CouponStatus.ACTIVE;

    private List<Long> productIds;
}
