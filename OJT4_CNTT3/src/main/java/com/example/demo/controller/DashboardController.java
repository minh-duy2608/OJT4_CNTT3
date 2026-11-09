package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.demo.dto.response.*;
import com.example.demo.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Tag(name = "19. Revenue & Dashboard API - Báo cáo và thống kê", description = "Dashboard tổng quan, báo cáo doanh thu, đơn hàng, người dùng và top sản phẩm/cửa hàng")
@RestController
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // =========================================================================
    // 19.1. DASHBOARD QUẢN TRỊ (ADMIN)
    // =========================================================================

    /**
     * STT 147: GET /admin/dashboard/summary - Tổng quan hệ thống (ADMIN)
     */
    @GetMapping({"/admin/dashboard/summary", "/api/v1/admin/dashboard/summary"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getAdminSummary() {
        DashboardSummaryResponse response = dashboardService.getAdminSummary();
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu tổng quan hệ thống thành công", response));
    }

    /**
     * STT 148: GET /admin/dashboard/revenue - Thống kê doanh thu toàn hệ thống (ADMIN)
     */
    @GetMapping({"/admin/dashboard/revenue", "/api/v1/admin/dashboard/revenue"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminRevenueResponse>> getAdminRevenue() {
        AdminRevenueResponse response = dashboardService.getAdminRevenue();
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê doanh thu toàn hệ thống thành công", response));
    }

    /**
     * STT 149: GET /admin/dashboard/orders - Thống kê đơn hàng (ADMIN)
     */
    @GetMapping({"/admin/dashboard/orders", "/api/v1/admin/dashboard/orders"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<OrderStatsResponse>> getAdminOrderStats() {
        OrderStatsResponse response = dashboardService.getAdminOrderStats();
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê đơn hàng thành công", response));
    }

    /**
     * STT 150: GET /admin/dashboard/users - Thống kê người dùng (ADMIN)
     */
    @GetMapping({"/admin/dashboard/users", "/api/v1/admin/dashboard/users"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserStatsResponse>> getAdminUserStats() {
        UserStatsResponse response = dashboardService.getAdminUserStats();
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê người dùng thành công", response));
    }

    /**
     * STT 151: GET /admin/dashboard/shops - Thống kê cửa hàng (ADMIN)
     */
    @GetMapping({"/admin/dashboard/shops", "/api/v1/admin/dashboard/shops"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<ShopStatsResponse>> getAdminShopStats() {
        ShopStatsResponse response = dashboardService.getAdminShopStats();
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê cửa hàng thành công", response));
    }

    /**
     * STT 152: GET /admin/reports/revenue - Báo cáo doanh thu theo khoảng thời gian (ADMIN)
     */
    @GetMapping({"/admin/reports/revenue", "/api/v1/admin/reports/revenue"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<RevenueReportResponse>> getAdminRevenueReport(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "day") String groupBy
    ) {
        RevenueReportResponse response = dashboardService.getAdminRevenueReport(from, to, groupBy);
        return ResponseEntity.ok(ApiResponse.success("Lấy báo cáo doanh thu thành công", response));
    }

    /**
     * STT 153: GET /admin/reports/top-products - Sản phẩm bán chạy toàn hệ thống (ADMIN)
     */
    @GetMapping({"/admin/reports/top-products", "/api/v1/admin/reports/top-products"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<TopProductResponse>>> getAdminTopProducts(
            @RequestParam(defaultValue = "10") int limit
    ) {
        List<TopProductResponse> response = dashboardService.getAdminTopProducts(limit);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm bán chạy thành công", response));
    }

    /**
     * STT 154: GET /admin/reports/top-shops - Cửa hàng có doanh số cao (ADMIN)
     */
    @GetMapping({"/admin/reports/top-shops", "/api/v1/admin/reports/top-shops"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<TopShopResponse>>> getAdminTopShops(
            @RequestParam(defaultValue = "10") int limit
    ) {
        List<TopShopResponse> response = dashboardService.getAdminTopShops(limit);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cửa hàng doanh số cao thành công", response));
    }

    // =========================================================================
    // 19.2. DASHBOARD CỬA HÀNG (SHOP PERMISSION)
    // =========================================================================

    /**
     * STT 155: GET /shops/{shopId}/dashboard/summary - Tổng quan cửa hàng (Shop permission)
     */
    @GetMapping({"/shops/{shopId}/dashboard/summary", "/api/v1/shops/{shopId}/dashboard/summary"})
    public ResponseEntity<ApiResponse<ShopDashboardSummaryResponse>> getShopSummary(
            @PathVariable Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopDashboardSummaryResponse response = dashboardService.getShopSummary(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu tổng quan cửa hàng thành công", response));
    }

    /**
     * STT 156: GET /shops/{shopId}/dashboard/revenue - Thống kê doanh thu cửa hàng (Quyền xem báo cáo)
     */
    @GetMapping({"/shops/{shopId}/dashboard/revenue", "/api/v1/shops/{shopId}/dashboard/revenue"})
    public ResponseEntity<ApiResponse<AdminRevenueResponse>> getShopRevenue(
            @PathVariable Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        AdminRevenueResponse response = dashboardService.getShopRevenue(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê doanh thu cửa hàng thành công", response));
    }

    /**
     * STT 157: GET /shops/{shopId}/dashboard/orders - Thống kê đơn hàng (Shop permission)
     */
    @GetMapping({"/shops/{shopId}/dashboard/orders", "/api/v1/shops/{shopId}/dashboard/orders"})
    public ResponseEntity<ApiResponse<OrderStatsResponse>> getShopOrderStats(
            @PathVariable Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        OrderStatsResponse response = dashboardService.getShopOrderStats(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê đơn hàng của cửa hàng thành công", response));
    }

    /**
     * STT 158: GET /shops/{shopId}/reports/top-products - Sản phẩm bán chạy của cửa hàng (Quyền xem báo cáo)
     */
    @GetMapping({"/shops/{shopId}/reports/top-products", "/api/v1/shops/{shopId}/reports/top-products"})
    public ResponseEntity<ApiResponse<List<TopProductResponse>>> getShopTopProducts(
            @PathVariable Long shopId,
            @RequestParam(defaultValue = "10") int limit,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        List<TopProductResponse> response = dashboardService.getShopTopProducts(shopId, limit, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm bán chạy của cửa hàng thành công", response));
    }

    /**
     * STT 159: GET /shops/{shopId}/reports/revenue - Báo cáo doanh thu theo thời gian (Quyền xem báo cáo)
     */
    @GetMapping({"/shops/{shopId}/reports/revenue", "/api/v1/shops/{shopId}/reports/revenue"})
    public ResponseEntity<ApiResponse<RevenueReportResponse>> getShopRevenueReport(
            @PathVariable Long shopId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "day") String groupBy,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        RevenueReportResponse response = dashboardService.getShopRevenueReport(shopId, from, to, groupBy, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy báo cáo doanh thu của cửa hàng thành công", response));
    }
}
