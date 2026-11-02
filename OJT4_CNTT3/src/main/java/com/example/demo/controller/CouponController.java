package com.example.demo.controller;

import com.example.demo.dto.request.ValidateCouponRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.ValidateCouponResponse;
import com.example.demo.service.CouponService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    /**
     * STT 89: GET /shops/{shopId}/coupons - Danh sách mã giảm giá công khai của cửa hàng (Public)
     */
    @GetMapping({"/shops/{shopId}/coupons", "/api/v1/shops/{shopId}/coupons"})
    public ResponseEntity<ApiResponse<List<CouponResponse>>> getPublicShopCoupons(@PathVariable Long shopId) {
        List<CouponResponse> coupons = couponService.getPublicShopCoupons(shopId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã giảm giá của cửa hàng thành công", coupons));
    }

    /**
     * STT 90: POST /coupons/validate - Kiểm tra mã giảm giá với giỏ hàng hoặc đơn hàng dự kiến (CLIENT)
     */
    @PostMapping({"/coupons/validate", "/api/v1/coupons/validate"})
    public ResponseEntity<ApiResponse<ValidateCouponResponse>> validateCoupon(
            @Valid @RequestBody ValidateCouponRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ValidateCouponResponse response = couponService.validateCoupon(request, username);
        if (response.isValid()) {
            return ResponseEntity.ok(ApiResponse.success(response.getMessage(), response));
        } else {
            return ResponseEntity.ok(ApiResponse.error(400, response.getMessage(), response));
        }
    }
}
