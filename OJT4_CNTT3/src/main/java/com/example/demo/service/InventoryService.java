package com.example.demo.service;

import com.example.demo.dto.request.AdjustInventoryRequest;
import com.example.demo.dto.response.InventoryDetailResponse;
import com.example.demo.dto.response.PageResponse;

import java.util.List;

public interface InventoryService {

    /**
     * STT 70: GET /shops/{shopId}/inventory - Danh sách tồn kho của cửa hàng (Shop permission)
     */
    PageResponse<InventoryDetailResponse> getShopInventory(Long shopId, String keyword, int page, int size, String username);

    /**
     * STT 71: GET /shops/{shopId}/inventory/{inventoryId} - Chi tiết tồn kho (Shop permission)
     */
    InventoryDetailResponse getInventoryDetail(Long shopId, Long inventoryId, String username);

    /**
     * STT 72: PATCH /shops/{shopId}/inventory/{inventoryId} - Điều chỉnh tồn kho theo nghiệp vụ (Quyền quản lý kho)
     */
    InventoryDetailResponse adjustInventory(Long shopId, Long inventoryId, AdjustInventoryRequest request, String username);

    /**
     * STT 73: GET /shops/{shopId}/inventory/low-stock - Danh sách sản phẩm sắp hết hàng (Quyền quản lý kho)
     */
    List<InventoryDetailResponse> getLowStockInventory(Long shopId, Integer threshold, String username);
}

