package com.example.demo.service;

import com.example.demo.dto.request.RegisterShopRequest;
import com.example.demo.dto.response.ShopDetailResponse;

import java.util.List;

public interface ShopService {

    ShopDetailResponse registerShop(RegisterShopRequest request, String currentUsername);

    ShopDetailResponse getMyShop(String currentUsername);

    List<ShopDetailResponse> getAllActiveShops();

    ShopDetailResponse getShopById(Long shopId, String currentUsername);

    ShopDetailResponse updateShop(Long shopId, RegisterShopRequest request, String currentUsername);
}
