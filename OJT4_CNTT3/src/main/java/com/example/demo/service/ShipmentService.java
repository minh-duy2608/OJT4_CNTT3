package com.example.demo.service;

import com.example.demo.dto.request.CreateShipmentRequest;
import com.example.demo.dto.request.UpdateShipmentRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShipmentResponse;
import com.example.demo.entity.ShipmentStatus;

import java.util.List;

public interface ShipmentService {

    List<ShipmentResponse> getOrderShipments(Long orderId, String currentUsername);

    PageResponse<ShipmentResponse> getShopShipments(Long shopId, ShipmentStatus status, int page, int size, String currentUsername);

    ShipmentResponse createShopShipment(Long shopId, Long orderId, CreateShipmentRequest request, String currentUsername);

    ShipmentResponse updateShopShipment(Long shopId, Long shipmentId, UpdateShipmentRequest request, String currentUsername);

    PageResponse<ShipmentResponse> getAdminShipments(ShipmentStatus status, int page, int size, String currentUsername);

    ShipmentResponse adminUpdateShipment(Long shipmentId, UpdateShipmentRequest request, String currentUsername);
}

