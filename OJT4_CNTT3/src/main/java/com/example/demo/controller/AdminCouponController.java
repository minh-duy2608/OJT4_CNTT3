package com.example.demo.controller;

import com.example.demo.dto.request.CreateCouponRequest;
import com.example.demo.dto.request.UpdateCouponRequest;
import com.example.demo.dto.request.UpdateCouponStatusRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.CouponResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.CouponStatus;
import com.example.demo.service.CouponService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping({"/admin/coupons", "/api/v1/admin/coupons"})
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN', 'SHOP_MANAGER', 'ROLE_SHOP_MANAGER', 'SHOP_OWNER', 'ROLE_SHOP_OWNER')")
public class AdminCouponController {

    private final CouponService couponService;

    /**
     * GET /admin/coupons - Danh sách mã giảm giá quản trị (phân trang, bộ lọc)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CouponResponse>>> getAllCoupons(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) CouponStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<CouponResponse> response = couponService.getAdminCoupons(shopId, status, keyword, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách mã giảm giá thành công", response));
    }

    /**
     * GET /admin/coupons/{id} - Chi tiết mã giảm giá theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CouponResponse>> getCouponById(
            @PathVariable Long id,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse response = couponService.getAdminCouponById(id, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết mã giảm giá thành công", response));
    }

    /**
     * POST /admin/coupons - Tạo mã giảm giá mới
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CouponResponse>> createCoupon(
            @Valid @RequestBody CreateCouponRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse response = couponService.createCoupon(request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo mã giảm giá mới thành công", response));
    }

    /**
     * PUT /admin/coupons/{id} - Cập nhật thông tin mã giảm giá
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CouponResponse>> updateCoupon(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCouponRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse response = couponService.updateCoupon(id, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin mã giảm giá thành công", response));
    }

    /**
     * PATCH /admin/coupons/{id}/status - Thay đổi trạng thái mã giảm giá
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<CouponResponse>> updateCouponStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCouponStatusRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        CouponResponse response = couponService.updateCouponStatus(id, request.getStatus(), username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái mã giảm giá thành công", response));
    }

    /**
     * DELETE /admin/coupons/{id} - Xóa mã giảm giá
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCoupon(
            @PathVariable Long id,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        couponService.deleteCoupon(id, username);
        return ResponseEntity.ok(ApiResponse.success("Xóa mã giảm giá thành công", null));
    }
}
