package com.example.demo.controller;

import com.example.demo.dto.request.RegisterShopRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.ShopDetailResponse;
import com.example.demo.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping({"/shops", "/api/v1/shops"})
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    /**
     * Đăng ký mở Cửa hàng mới (Khách hàng trở thành SHOP_MANAGER)
     * POST /shops/register hoặc POST /shops
     */
    @PostMapping({"/register", ""})
    public ResponseEntity<ApiResponse<ShopDetailResponse>> registerShop(
            @Valid @RequestBody RegisterShopRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.registerShop(request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Đăng ký cửa hàng thành công! Bạn đã được cấp quyền Quản lý cửa hàng (SHOP_MANAGER).", response));
    }

    /**
     * Lấy thông tin cửa hàng của người dùng hiện tại
     * GET /shops/my-shop
     */
    @GetMapping("/my-shop")
    public ResponseEntity<ApiResponse<ShopDetailResponse>> getMyShop(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.getMyShop(username);
        if (response != null) {
            return ResponseEntity.ok(ApiResponse.success("Lấy thông tin cửa hàng thành công", response));
        } else {
            return ResponseEntity.ok(ApiResponse.success("Bạn chưa đăng ký cửa hàng nào", null));
        }
    }

    /**
     * Danh sách tất cả các cửa hàng đang hoạt động
     * GET /shops
     */
    @GetMapping({"", "/list"})
    public ResponseEntity<ApiResponse<List<ShopDetailResponse>>> getAllActiveShops() {
        List<ShopDetailResponse> response = shopService.getAllActiveShops();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cửa hàng thành công", response));
    }

    /**
     * Chi tiết cửa hàng theo ID
     * GET /shops/{shopId}
     */
    @GetMapping("/{shopId}")
    public ResponseEntity<ApiResponse<ShopDetailResponse>> getShopById(
            @PathVariable Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.getShopById(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin chi tiết cửa hàng thành công", response));
    }

    /**
     * Cập nhật thông tin cửa hàng
     * PUT /shops/{shopId} hoặc PATCH /shops/{shopId}
     */
    @RequestMapping(value = "/{shopId}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<ShopDetailResponse>> updateShop(
            @PathVariable Long shopId,
            @Valid @RequestBody RegisterShopRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.updateShop(shopId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin cửa hàng thành công", response));
    }
}

