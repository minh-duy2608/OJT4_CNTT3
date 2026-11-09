package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.demo.dto.request.CreateReturnRequest;
import com.example.demo.dto.request.ProcessReturnRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ReturnResponse;
import com.example.demo.entity.ReturnStatus;
import com.example.demo.service.ReturnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@Tag(name = "17. Return API - Trả hàng & hoàn tiền", description = "Quản lý yêu cầu trả hàng, xử lý đổi trả và hoàn tiền đơn hàng")
@RestController
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;

    /**
     * STT 135: POST /orders/{orderId}/returns - Yêu cầu trả hàng (Chủ đơn hàng)
     */
    @PostMapping({"/orders/{orderId}/returns", "/api/v1/orders/{orderId}/returns"})
    public ResponseEntity<ApiResponse<ReturnResponse>> createReturnRequest(
            @PathVariable Long orderId,
            @Valid @RequestBody CreateReturnRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ReturnResponse response = returnService.createReturnRequest(orderId, request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Gửi yêu cầu trả hàng thành công", response));
    }

    /**
     * STT 136: GET /returns/my - Danh sách yêu cầu trả hàng của khách hàng (CLIENT)
     */
    @GetMapping({"/returns/my", "/api/v1/returns/my"})
    public ResponseEntity<ApiResponse<PageResponse<ReturnResponse>>> getMyReturns(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<ReturnResponse> response = returnService.getMyReturns(page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu trả hàng thành công", response));
    }

    /**
     * STT 137: GET /returns/{returnId} - Chi tiết yêu cầu trả hàng (Người có quyền truy cập)
     */
    @GetMapping({"/returns/{returnId}", "/api/v1/returns/{returnId}"})
    public ResponseEntity<ApiResponse<ReturnResponse>> getReturnDetail(
            @PathVariable Long returnId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ReturnResponse response = returnService.getReturnDetail(returnId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết yêu cầu trả hàng thành công", response));
    }

    /**
     * STT 138: GET /shops/{shopId}/returns - Danh sách yêu cầu trả hàng của cửa hàng (Shop permission)
     */
    @GetMapping({"/shops/{shopId}/returns", "/api/v1/shops/{shopId}/returns"})
    public ResponseEntity<ApiResponse<PageResponse<ReturnResponse>>> getShopReturns(
            @PathVariable Long shopId,
            @RequestParam(required = false) ReturnStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<ReturnResponse> response = returnService.getShopReturns(shopId, status, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu trả hàng của cửa hàng thành công", response));
    }

    /**
     * STT 139: PATCH /shops/{shopId}/returns/{returnId}/status - Xử lý trạng thái yêu cầu trả hàng (Quyền xử lý trả hàng)
     */
    @PatchMapping({"/shops/{shopId}/returns/{returnId}/status", "/api/v1/shops/{shopId}/returns/{returnId}/status"})
    public ResponseEntity<ApiResponse<ReturnResponse>> processShopReturn(
            @PathVariable Long shopId,
            @PathVariable Long returnId,
            @Valid @RequestBody ProcessReturnRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ReturnResponse response = returnService.processShopReturn(shopId, returnId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Xử lý yêu cầu trả hàng thành công", response));
    }

    /**
     * STT 140: GET /admin/returns - Danh sách yêu cầu trả hàng toàn hệ thống (ADMIN)
     */
    @GetMapping({"/admin/returns", "/api/v1/admin/returns"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ReturnResponse>>> getAdminReturns(
            @RequestParam(required = false) ReturnStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<ReturnResponse> response = returnService.getAdminReturns(status, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu trả hàng toàn hệ thống thành công", response));
    }

    /**
     * STT 141: PATCH /admin/returns/{returnId}/status - Xử lý hoặc can thiệp yêu cầu trả hàng (ADMIN)
     */
    @PatchMapping({"/admin/returns/{returnId}/status", "/api/v1/admin/returns/{returnId}/status"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<ReturnResponse>> adminProcessReturn(
            @PathVariable Long returnId,
            @Valid @RequestBody ProcessReturnRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ReturnResponse response = returnService.adminProcessReturn(returnId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Quản trị viên xử lý yêu cầu trả hàng thành công", response));
    }
}

