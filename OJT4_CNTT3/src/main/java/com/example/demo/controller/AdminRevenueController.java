package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.demo.dto.response.AdminRevenueResponse;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.service.RevenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@Tag(name = "18. Admin - Quản lý Doanh thu Hệ thống", description = "Thống kê doanh thu toàn sàn, phân tích theo từng cửa hàng và trạng thái đơn hàng")
@RestController
@RequestMapping({"/admin/revenue", "/api/v1/admin/revenue"})
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN')")
public class AdminRevenueController {

    private final RevenueService revenueService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminRevenueResponse>> getPlatformRevenue(
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) String timeRange,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        AdminRevenueResponse response = revenueService.getPlatformRevenue(shopId, timeRange, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy báo cáo doanh thu toàn hệ thống thành công", response));
    }
}
