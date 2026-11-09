package com.example.demo.service;

import com.example.demo.dto.request.CreateCouponRequest;
import com.example.demo.dto.request.UpdateCouponRequest;
import com.example.demo.dto.request.ValidateCouponRequest;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ValidateCouponResponse;
import com.example.demo.entity.CouponStatus;

import java.util.List;

public interface CouponService {

    /**
     * STT 89: GET /shops/{shopId}/coupons - Danh sách mã giảm giá công khai của cửa hàng (Public)
     */
    List<CouponResponse> getPublicShopCoupons(Long shopId);

    /**
     * Lấy danh sách mã giảm giá công khai của cửa hàng có kèm trạng thái đã lưu vào ví của user
     */
    List<CouponResponse> getPublicShopCoupons(Long shopId, String currentUsername);

    /**
     * Storefront hiển thị danh sách coupon còn hiệu lực của shop hoặc toàn sàn
     */
    List<CouponResponse> getStorefrontCoupons(Long shopId, String currentUsername);

    /**
     * Lưu coupon vào ví của người dùng (Idempotent: lưu lặp không lỗi, không trùng)
     */
    CouponResponse saveCouponToWallet(Long couponId, String currentUsername);

    /**
     * Lưu coupon vào ví bằng mã code (Idempotent: lưu lặp không lỗi, không trùng)
     */
    CouponResponse saveCouponCodeToWallet(String code, String currentUsername);

    /**
     * Lấy danh sách coupon trong ví của người dùng kèm trạng thái hiệu lực hiện tại
     */
    List<CouponResponse> getUserWalletCoupons(String currentUsername);

    /**
     * Gỡ mã giảm giá khỏi ví của người dùng
     */
    void removeCouponFromWallet(Long couponId, String currentUsername);

    /**
     * STT 90: POST /coupons/validate - Kiểm tra mã giảm giá với giỏ hàng hoặc đơn hàng dự kiến (CLIENT)
     */
    ValidateCouponResponse validateCoupon(ValidateCouponRequest request, String currentUsername);

    /**
     * Quản trị: Lấy danh sách mã giảm giá (Phân trang, tìm kiếm, lọc theo shop và trạng thái)
     */
    PageResponse<CouponResponse> getAdminCoupons(Long shopId, CouponStatus status, String keyword, int page, int size, String currentUsername);

    /**
     * Quản trị: Lấy chi tiết mã giảm giá
     */
    CouponResponse getAdminCouponById(Long id, String currentUsername);

    /**
     * Quản trị: Tạo mã giảm giá mới
     */
    CouponResponse createCoupon(CreateCouponRequest request, String currentUsername);

    /**
     * Quản trị: Cập nhật thông tin mã giảm giá
     */
    CouponResponse updateCoupon(Long id, UpdateCouponRequest request, String currentUsername);

    /**
     * Quản trị: Thay đổi trạng thái mã giảm giá (ACTIVE, INACTIVE, DRAFT, EXPIRED)
     */
    CouponResponse updateCouponStatus(Long id, CouponStatus status, String currentUsername);

    /**
     * Quản trị: Xóa mã giảm giá
     */
    void deleteCoupon(Long id, String currentUsername);

    /**
     * STT 97: PUT /shops/{shopId}/coupons/{couponId}/products - Cập nhật danh sách sản phẩm áp dụng (Quyền quản lý coupon)
     */
    CouponResponse updateCouponProducts(Long shopId, Long couponId, List<Long> productIds, String currentUsername);
}
