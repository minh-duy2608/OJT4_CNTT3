package com.example.demo.service;

import com.example.demo.dto.response.AdminRevenueResponse;

public interface RevenueService {
    AdminRevenueResponse getPlatformRevenue(Long targetShopId, String timeRange, String currentUsername);
}
