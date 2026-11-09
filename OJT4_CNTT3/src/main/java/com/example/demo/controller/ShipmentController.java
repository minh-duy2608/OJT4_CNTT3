package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.example.demo.dto.request.CreateShipmentRequest;
import com.example.demo.dto.request.UpdateShipmentRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShipmentResponse;
import com.example.demo.entity.ShipmentStatus;
import com.example.demo.service.ShipmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Tag(name = "15. Shipment API - Quản lý giao hàng", description = "Quản lý vận đơn, tra cứu lộ trình giao hàng theo đơn và theo cửa hàng")
@RestController
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;

    /**
     * STT 118: GET /orders/{orderId}/shipments - Xem thông tin giao hàng của đơn hàng (Chủ đơn hàng)
     */
    @GetMapping({"/orders/{orderId}/shipments", "/api/v1/orders/{orderId}/shipments"})
    public ResponseEntity<ApiResponse<List<ShipmentResponse>>> getOrderShipments(
            @PathVariable Long orderId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        List<ShipmentResponse> response = shipmentService.getOrderShipments(orderId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin vận chuyển của đơn hàng thành công", response));
    }

    /**
     * STT 119: GET /shops/{shopId}/shipments - Danh sách giao hàng của cửa hàng (Shop permission)
     */
    @GetMapping({"/shops/{shopId}/shipments", "/api/v1/shops/{shopId}/shipments"})
    public ResponseEntity<ApiResponse<PageResponse<ShipmentResponse>>> getShopShipments(
            @PathVariable Long shopId,
            @RequestParam(required = false) ShipmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<ShipmentResponse> response = shipmentService.getShopShipments(shopId, status, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách vận đơn của cửa hàng thành công", response));
    }

    /**
     * STT 120: POST /shops/{shopId}/orders/{orderId}/shipments - Tạo thông tin giao hàng (Quyền quản lý đơn hàng)
     */
    @PostMapping({"/shops/{shopId}/orders/{orderId}/shipments", "/api/v1/shops/{shopId}/orders/{orderId}/shipments"})
    public ResponseEntity<ApiResponse<ShipmentResponse>> createShopShipment(
            @PathVariable Long shopId,
            @PathVariable Long orderId,
            @Valid @RequestBody CreateShipmentRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShipmentResponse response = shipmentService.createShopShipment(shopId, orderId, request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo vận đơn giao hàng thành công", response));
    }

    /**
     * STT 121: PATCH /shops/{shopId}/shipments/{shipmentId} - Cập nhật thông tin vận chuyển (Quyền quản lý giao hàng)
     */
    @PatchMapping({"/shops/{shopId}/shipments/{shipmentId}", "/api/v1/shops/{shopId}/shipments/{shipmentId}"})
    public ResponseEntity<ApiResponse<ShipmentResponse>> updateShopShipment(
            @PathVariable Long shopId,
            @PathVariable Long shipmentId,
            @Valid @RequestBody UpdateShipmentRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShipmentResponse response = shipmentService.updateShopShipment(shopId, shipmentId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin vận đơn thành công", response));
    }

    /**
     * STT 122: GET /admin/shipments - Theo dõi giao hàng toàn hệ thống (ADMIN)
     */
    @GetMapping({"/admin/shipments", "/api/v1/admin/shipments"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ShipmentResponse>>> getAdminShipments(
            @RequestParam(required = false) ShipmentStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        PageResponse<ShipmentResponse> response = shipmentService.getAdminShipments(status, page, size, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách giao hàng toàn hệ thống thành công", response));
    }

    /**
     * STT 123: PATCH /admin/shipments/{shipmentId} - Can thiệp thông tin giao hàng khi cần (ADMIN)
     */
    @PatchMapping({"/admin/shipments/{shipmentId}", "/api/v1/admin/shipments/{shipmentId}"})
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<ShipmentResponse>> adminUpdateShipment(
            @PathVariable Long shipmentId,
            @Valid @RequestBody UpdateShipmentRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShipmentResponse response = shipmentService.adminUpdateShipment(shipmentId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Quản trị viên can thiệp thông tin vận đơn thành công", response));
    }
}

