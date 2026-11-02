package com.example.demo.service;

import com.example.demo.dto.request.AdminUpdateShopStatusRequest;
import com.example.demo.dto.request.RegisterShopRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShopDetailResponse;
import com.example.demo.entity.ShopStatus;

import java.util.List;

public interface ShopService {

    ShopDetailResponse registerShop(RegisterShopRequest request, String currentUsername);

    ShopDetailResponse getMyShop(String currentUsername);

    List<ShopDetailResponse> getAllActiveShops();

    ShopDetailResponse getShopById(Long shopId, String currentUsername);

    ShopDetailResponse updateShop(Long shopId, RegisterShopRequest request, String currentUsername);

    // Admin shop management
    PageResponse<ShopDetailResponse> getAdminShops(String keyword, ShopStatus status, int page, int size);

    ShopDetailResponse getAdminShopById(Long shopId);

    ShopDetailResponse updateShopStatus(Long shopId, AdminUpdateShopStatusRequest request, String adminUsername);
}

