package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;

import com.example.demo.dto.request.AdminUpdateShopStatusRequest;
import com.example.demo.dto.request.RegisterShopRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShopDetailResponse;
import com.example.demo.entity.ShopStatus;
import com.example.demo.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@Tag(name = "05. Admin - Kiểm duyệt Cửa hàng", description = "Kiểm duyệt và quản lý trạng thái hoạt động của Shop")
@RestController
@RequestMapping({"/admin/shops", "/api/v1/admin/shops"})
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN')")
public class AdminShopController {

    private final ShopService shopService;

    /**
     * STT 67: GET /admin/shops - Danh sách tất cả cửa hàng (ADMIN)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ShopDetailResponse>>> getAllShops(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) ShopStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResponse<ShopDetailResponse> response = shopService.getAdminShops(keyword, status, page, size);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tất cả cửa hàng thành công", response));
    }

    /**
     * STT 68: GET /admin/shops/{shopId} - Chi tiết cửa hàng phục vụ quản trị (ADMIN)
     */
    @GetMapping("/{shopId}")
    public ResponseEntity<ApiResponse<ShopDetailResponse>> getShopById(@PathVariable Long shopId) {
        ShopDetailResponse response = shopService.getAdminShopById(shopId);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết cửa hàng quản trị thành công", response));
    }

    /**
     * STT 69: PATCH /admin/shops/{shopId}/status - Duyệt, từ chối, tạm ngừng hoặc mở lại cửa hàng (ADMIN)
     */
    @PatchMapping("/{shopId}/status")
    public ResponseEntity<ApiResponse<ShopDetailResponse>> updateShopStatus(
            @PathVariable Long shopId,
            @Valid @RequestBody AdminUpdateShopStatusRequest request,
            Principal principal
    ) {
        String adminUsername = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.updateShopStatus(shopId, request, adminUsername);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái cửa hàng thành công", response));
    }

    /**
     * PUT /admin/shops/{shopId} - Cập nhật thông tin cửa hàng (ADMIN)
     */
    @PutMapping("/{shopId}")
    public ResponseEntity<ApiResponse<ShopDetailResponse>> updateShop(
            @PathVariable Long shopId,
            @Valid @RequestBody RegisterShopRequest request,
            Principal principal
    ) {
        String adminUsername = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.updateShop(shopId, request, adminUsername);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin cửa hàng thành công", response));
    }

    /**
     * POST /admin/shops - Tạo cửa hàng mới (ADMIN)
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ShopDetailResponse>> createShop(
            @Valid @RequestBody RegisterShopRequest request,
            Principal principal
    ) {
        String adminUsername = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.registerShop(request, adminUsername);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo cửa hàng mới thành công", response));
    }
}
