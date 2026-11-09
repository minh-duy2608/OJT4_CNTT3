package com.example.demo.service;

import com.example.demo.dto.response.*;

import java.util.List;

public interface DashboardService {

    // 19.1 Admin Dashboard
    DashboardSummaryResponse getAdminSummary();

    AdminRevenueResponse getAdminRevenue();

    OrderStatsResponse getAdminOrderStats();

    UserStatsResponse getAdminUserStats();

    ShopStatsResponse getAdminShopStats();

    RevenueReportResponse getAdminRevenueReport(String from, String to, String groupBy);

    List<TopProductResponse> getAdminTopProducts(int limit);

    List<TopShopResponse> getAdminTopShops(int limit);

    // 19.2 Shop Dashboard
    ShopDashboardSummaryResponse getShopSummary(Long shopId, String currentUsername);

    AdminRevenueResponse getShopRevenue(Long shopId, String currentUsername);

    OrderStatsResponse getShopOrderStats(Long shopId, String currentUsername);

    List<TopProductResponse> getShopTopProducts(Long shopId, int limit, String currentUsername);

    RevenueReportResponse getShopRevenueReport(Long shopId, String from, String to, String groupBy, String currentUsername);
}

