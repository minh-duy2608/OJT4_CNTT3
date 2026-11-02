package com.example.demo.service;

import com.example.demo.dto.request.ValidateCouponRequest;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.ValidateCouponResponse;

import java.util.List;

public interface CouponService {

    /**
     * STT 89: GET /shops/{shopId}/coupons - Danh sách mã giảm giá công khai của cửa hàng (Public)
     */
    List<CouponResponse> getPublicShopCoupons(Long shopId);

    /**
     * STT 90: POST /coupons/validate - Kiểm tra mã giảm giá với giỏ hàng hoặc đơn hàng dự kiến (CLIENT)
     */
    ValidateCouponResponse validateCoupon(ValidateCouponRequest request, String currentUsername);
}
