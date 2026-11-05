package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;

import com.example.demo.dto.request.AdjustInventoryRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.InventoryDetailResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@Tag(name = "11. Người bán - Quản lý Kho hàng", description = "Kiểm tra tồn kho, cảnh báo hết hàng và điều chỉnh số lượng")
@RestController
@RequestMapping({"/shops/{shopId}/inventory", "/api/v1/shops/{shopId}/inventory"})
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SHOP_MANAGER', 'SHOP_OWNER')")
public class ShopInventoryController {

    private final InventoryService inventoryService;

    /**
     * STT 70: GET /shops/{shopId}/inventory - Danh sách tồn kho của cửa hàng (Shop permission)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<InventoryDetailResponse>>> getShopInventory(
            @PathVariable Long shopId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<InventoryDetailResponse> response = inventoryService.getShopInventory(shopId, keyword, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tồn kho cửa hàng thành công", response));
    }

    /**
     * STT 73: GET /shops/{shopId}/inventory/low-stock - Danh sách sản phẩm sắp hết hàng (Quyền quản lý kho)
     */
    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<InventoryDetailResponse>>> getLowStockInventory(
            @PathVariable Long shopId,
            @RequestParam(defaultValue = "10") Integer threshold,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        List<InventoryDetailResponse> response = inventoryService.getLowStockInventory(shopId, threshold, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm sắp hết hàng thành công", response));
    }

    /**
     * STT 71: GET /shops/{shopId}/inventory/{inventoryId} - Chi tiết tồn kho (Shop permission)
     */
    @GetMapping("/{inventoryId}")
    public ResponseEntity<ApiResponse<InventoryDetailResponse>> getInventoryDetail(
            @PathVariable Long shopId,
            @PathVariable Long inventoryId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        InventoryDetailResponse response = inventoryService.getInventoryDetail(shopId, inventoryId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết tồn kho thành công", response));
    }

    /**
     * STT 72: PATCH /shops/{shopId}/inventory/{inventoryId} - Điều chỉnh tồn kho theo nghiệp vụ (Quyền quản lý kho)
     */
    @PatchMapping("/{inventoryId}")
    public ResponseEntity<ApiResponse<InventoryDetailResponse>> adjustInventory(
            @PathVariable Long shopId,
            @PathVariable Long inventoryId,
            @Valid @RequestBody AdjustInventoryRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        InventoryDetailResponse response = inventoryService.adjustInventory(shopId, inventoryId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Điều chỉnh tồn kho thành công", response));
    }
}

