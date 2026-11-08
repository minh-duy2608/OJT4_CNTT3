package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;

import com.example.demo.dto.request.CreateCouponRequest;
import com.example.demo.dto.request.UpdateCouponProductsRequest;
import com.example.demo.dto.request.UpdateCouponRequest;
import com.example.demo.dto.request.UpdateCouponStatusRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.CouponStatus;
import com.example.demo.exception.BadRequestException;
import com.example.demo.service.CouponService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Objects;

@Tag(name = "17.1. Người bán - Quản lý Mã giảm giá", description = "Quản lý chương trình khuyến mãi và mã giảm giá của từng shop")
@RestController
@RequestMapping({"/shops/{shopId}/coupons", "/api/v1/shops/{shopId}/coupons"})
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SHOP_MANAGER', 'SHOP_OWNER')")
public class ShopCouponController {

    private final CouponService couponService;

    /**
     * STT 91: GET /shops/{shopId}/coupons/manage - Danh sách coupon của cửa hàng (Shop permission)
     */
    @GetMapping("/manage")
    public ResponseEntity<ApiResponse<PageResponse<CouponResponse>>> getShopCoupons(
            @PathVariable Long shopId,
            @RequestParam(required = false) CouponStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<CouponResponse> response = couponService.getAdminCoupons(shopId, status, keyword, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã giảm giá cửa hàng thành công", response));
    }

    /**
     * STT 92: POST /shops/{shopId}/coupons - Tạo coupon (Quyền quản lý coupon)
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CouponResponse>> createShopCoupon(
            @PathVariable Long shopId,
            @Valid @RequestBody CreateCouponRequest request,
            Principal principal
    ) {
        if (request.getShopId() == null) {
            request.setShopId(shopId);
        } else if (!Objects.equals(request.getShopId(), shopId)) {
            throw new BadRequestException("Shop ID trong request (" + request.getShopId() + ") không khớp với URL (" + shopId + ")");
        }
        String username = principal != null ? principal.getName() : null;
        CouponResponse response = couponService.createCoupon(request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo mã giảm giá cho cửa hàng thành công", response));
    }

    /**
     * STT 93: GET /shops/{shopId}/coupons/{couponId} - Chi tiết coupon (Shop permission)
     */
    @GetMapping("/{couponId}")
    public ResponseEntity<ApiResponse<CouponResponse>> getShopCouponById(
            @PathVariable Long shopId,
            @PathVariable Long couponId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse response = couponService.getAdminCouponById(couponId, username);
        if (!Objects.equals(response.getShopId(), shopId)) {
            throw new BadRequestException("Mã giảm giá #" + couponId + " không thuộc cửa hàng #" + shopId);
        }
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết mã giảm giá thành công", response));
    }

    /**
     * STT 94: PATCH /shops/{shopId}/coupons/{couponId} - Cập nhật coupon (Quyền quản lý coupon)
     */
    @RequestMapping(value = "/{couponId}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<CouponResponse>> updateShopCoupon(
            @PathVariable Long shopId,
            @PathVariable Long couponId,
            @Valid @RequestBody UpdateCouponRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse existing = couponService.getAdminCouponById(couponId, username);
        if (!Objects.equals(existing.getShopId(), shopId)) {
            throw new BadRequestException("Mã giảm giá #" + couponId + " không thuộc cửa hàng #" + shopId);
        }
        CouponResponse response = couponService.updateCoupon(couponId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin mã giảm giá thành công", response));
    }

    /**
     * STT 95: PATCH /shops/{shopId}/coupons/{couponId}/status - Bật hoặc tắt coupon (Quyền quản lý coupon)
     */
    @PatchMapping("/{couponId}/status")
    public ResponseEntity<ApiResponse<CouponResponse>> updateShopCouponStatus(
            @PathVariable Long shopId,
            @PathVariable Long couponId,
            @Valid @RequestBody UpdateCouponStatusRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse existing = couponService.getAdminCouponById(couponId, username);
        if (!Objects.equals(existing.getShopId(), shopId)) {
            throw new BadRequestException("Mã giảm giá #" + couponId + " không thuộc cửa hàng #" + shopId);
        }
        CouponResponse response = couponService.updateCouponStatus(couponId, request.getStatus(), username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái mã giảm giá thành công", response));
    }

    /**
     * STT 96: DELETE /shops/{shopId}/coupons/{couponId} - Xóa hoặc ngừng sử dụng coupon (Quyền quản lý coupon)
     */
    @DeleteMapping("/{couponId}")
    public ResponseEntity<ApiResponse<Void>> deleteShopCoupon(
            @PathVariable Long shopId,
            @PathVariable Long couponId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse existing = couponService.getAdminCouponById(couponId, username);
        if (!Objects.equals(existing.getShopId(), shopId)) {
            throw new BadRequestException("Mã giảm giá #" + couponId + " không thuộc cửa hàng #" + shopId);
        }
        couponService.deleteCoupon(couponId, username);
        return ResponseEntity.ok(ApiResponse.success("Xóa mã giảm giá cửa hàng thành công", null));
    }

    /**
     * STT 97: PUT /shops/{shopId}/coupons/{couponId}/products - Cập nhật danh sách sản phẩm áp dụng (Quyền quản lý coupon)
     */
    @PutMapping("/{couponId}/products")
    public ResponseEntity<ApiResponse<CouponResponse>> updateShopCouponProducts(
            @PathVariable Long shopId,
            @PathVariable Long couponId,
            @RequestBody UpdateCouponProductsRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse response = couponService.updateCouponProducts(shopId, couponId, request != null ? request.getProductIds() : null, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật phạm vi sản phẩm áp dụng mã giảm giá thành công", response));
    }
}

