package com.example.demo.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.example.demo.dto.request.SaveCouponRequest;
import com.example.demo.dto.request.ValidateCouponRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.ValidateCouponResponse;
import com.example.demo.service.CouponService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Tag(name = "17. Khách hàng - Mã giảm giá", description = "Lấy danh sách mã giảm giá của shop, ví voucher của khách và kiểm tra tính hợp lệ của mã")
@RestController
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    /**
     * STT 89: GET /shops/{shopId}/coupons - Danh sách mã giảm giá công khai của cửa hàng (Public/Client)
     */
    @Operation(summary = "Lấy danh sách mã giảm giá công khai của cửa hàng")
    @GetMapping({"/shops/{shopId}/coupons", "/api/v1/shops/{shopId}/coupons"})
    public ResponseEntity<ApiResponse<List<CouponResponse>>> getPublicShopCoupons(
            @PathVariable Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        List<CouponResponse> coupons = couponService.getPublicShopCoupons(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã giảm giá của cửa hàng thành công", coupons));
    }

    /**
     * Storefront: Hiển thị danh sách coupon còn hiệu lực trên storefront (có thể lọc theo shopId)
     */
    @Operation(summary = "Hiển thị coupon hợp lệ trên storefront")
    @GetMapping({"/coupons/storefront", "/api/v1/coupons/storefront"})
    public ResponseEntity<ApiResponse<List<CouponResponse>>> getStorefrontCoupons(
            @RequestParam(required = false) Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        List<CouponResponse> coupons = couponService.getStorefrontCoupons(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã giảm giá storefront thành công", coupons));
    }

    /**
     * Khách hàng lưu mã giảm giá vào ví theo coupon ID (Idempotent)
     */
    @Operation(summary = "Lưu mã giảm giá vào ví theo ID (Idempotent)")
    @PostMapping({"/coupons/{id}/save", "/api/v1/coupons/{id}/save"})
    public ResponseEntity<ApiResponse<CouponResponse>> saveCouponToWallet(
            @PathVariable Long id,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse saved = couponService.saveCouponToWallet(id, username);
        return ResponseEntity.ok(ApiResponse.success("Lưu mã giảm giá vào ví thành công", saved));
    }

    /**
     * Khách hàng lưu mã giảm giá vào ví qua body (couponId hoặc code) (Idempotent)
     */
    @Operation(summary = "Lưu mã giảm giá vào ví qua body (couponId hoặc code)")
    @PostMapping({"/coupons/save", "/api/v1/coupons/save"})
    public ResponseEntity<ApiResponse<CouponResponse>> saveCouponByBody(
            @RequestBody SaveCouponRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse saved;
        if (request != null && request.getCouponId() != null) {
            saved = couponService.saveCouponToWallet(request.getCouponId(), username);
        } else if (request != null && request.getCode() != null && !request.getCode().isBlank()) {
            saved = couponService.saveCouponCodeToWallet(request.getCode(), username);
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "Vui lòng cung cấp couponId hoặc code"));
        }
        return ResponseEntity.ok(ApiResponse.success("Lưu mã giảm giá vào ví thành công", saved));
    }

    /**
     * Khách hàng xem danh sách mã giảm giá đã lưu trong ví (kèm trạng thái hiệu lực hiện tại)
     */
    @Operation(summary = "Xem danh sách mã giảm giá trong ví cá nhân")
    @GetMapping({"/user/coupons", "/api/v1/user/coupons", "/coupons/wallet", "/api/v1/coupons/wallet"})
    public ResponseEntity<ApiResponse<List<CouponResponse>>> getUserWalletCoupons(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        List<CouponResponse> coupons = couponService.getUserWalletCoupons(username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách ví voucher thành công", coupons));
    }

    /**
     * Khách hàng gỡ mã giảm giá khỏi ví cá nhân
     */
    @Operation(summary = "Gỡ mã giảm giá khỏi ví cá nhân")
    @DeleteMapping({"/user/coupons/{id}", "/api/v1/user/coupons/{id}", "/coupons/{id}/save", "/api/v1/coupons/{id}/save"})
    public ResponseEntity<ApiResponse<Void>> removeCouponFromWallet(
            @PathVariable Long id,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        couponService.removeCouponFromWallet(id, username);
        return ResponseEntity.ok(ApiResponse.success("Đã gỡ mã giảm giá khỏi ví", null));
    }

    /**
     * STT 90: POST /coupons/validate - Kiểm tra mã giảm giá với giỏ hàng hoặc đơn hàng dự kiến (CLIENT)
     */
    @Operation(summary = "Kiểm tra tính hợp lệ của mã giảm giá khi đặt hàng")
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
