package com.example.demo.service;

import com.example.demo.dto.request.AdminUpdateShopStatusRequest;
import com.example.demo.dto.request.RegisterShopRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShopDetailResponse;
import com.example.demo.dto.response.ShopManageResponse;
import com.example.demo.entity.ShopStatus;

import java.util.List;

public interface ShopService {

    ShopDetailResponse registerShop(RegisterShopRequest request, String currentUsername);

    ShopDetailResponse getMyShop(String currentUsername);

    List<ShopDetailResponse> getMyShops(String currentUsername);

    ShopManageResponse getShopManageInfo(Long shopId, String currentUsername);

    List<ShopDetailResponse> getAllActiveShops();

    ShopDetailResponse getShopById(Long shopId, String currentUsername);

    ShopDetailResponse updateShop(Long shopId, RegisterShopRequest request, String currentUsername);

    /**
     * Dashboard doanh thu cửa hàng: Thống kê doanh thu theo đơn hợp lệ (DELIVERED, RETURNED trừ hoàn, bỏ CANCELLED), đối chiếu chi tiết và lọc thời gian
     */
    com.example.demo.dto.response.ShopRevenueDashboardResponse getShopRevenueDashboard(Long shopId, String from, String to, String groupBy, String currentUsername);

    /**
     * Trang cửa hàng công khai & sản phẩm theo shopId hoặc slug (chỉ sản phẩm active, lọc category & brand, phân trang)
     */
    com.example.demo.dto.response.PublicShopDetailResponse getPublicShopPage(String shopIdentifier, com.example.demo.dto.request.ProductFilterCriteria criteria);

    /**
     * Danh sách sản phẩm công khai của cửa hàng theo shopId hoặc slug
     */
    com.example.demo.dto.response.PageResponse<com.example.demo.dto.response.ProductSummaryResponse> getPublicShopProducts(String shopIdentifier, com.example.demo.dto.request.ProductFilterCriteria criteria);

    // Admin shop management
    PageResponse<ShopDetailResponse> getAdminShops(String keyword, ShopStatus status, int page, int size);

    ShopDetailResponse getAdminShopById(Long shopId);

    ShopDetailResponse updateShopStatus(Long shopId, AdminUpdateShopStatusRequest request, String adminUsername);
}

