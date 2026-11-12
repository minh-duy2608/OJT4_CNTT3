package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.CreateShipmentRequest;
import com.example.demo.dto.request.UpdateShipmentRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ShipmentResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.AuditLogService;
import com.example.demo.service.NotificationService;
import com.example.demo.service.impl.ShipmentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Shipment Service Unit Tests")
class ShipmentServiceTest extends BaseUnitTest {

    @Mock
    private ShipmentRepository shipmentRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ShopMemberRepository shopMemberRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private ShipmentServiceImpl shipmentService;

    private User shopOwner;
    private User buyer;
    private User outsider;
    private Shop shop;
    private Order order;
    private Shipment shipment;

    @BeforeEach
    void setUp() {
        shopOwner = User.builder().id(1L).username("owner").role(Role.SHOP_MANAGER).build();
        buyer = User.builder().id(2L).username("buyer").role(Role.ROLE_USER).build();
        outsider = User.builder().id(3L).username("outsider").role(Role.ROLE_USER).build();

        shop = Shop.builder().id(10L).name("Gadget Shop").ownerId(1L).status(ShopStatus.ACTIVE).build();

        order = Order.builder()
                .id(100L)
                .orderCode("ORD-100")
                .shopId(10L)
                .userId(2L)
                .status(OrderStatus.CONFIRMED)
                .shippingFee(BigDecimal.valueOf(30000))
                .build();

        shipment = Shipment.builder()
                .id(50L)
                .orderId(100L)
                .carrier("Giao Hang Nhanh")
                .trackingCode("GHN-123456")
                .status(ShipmentStatus.IN_TRANSIT)
                .shippingFee(BigDecimal.valueOf(30000))
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("getOrderShipments: order not found throws ResourceNotFoundException")
    void getOrderShipments_orderNotFound() {
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> shipmentService.getOrderShipments(999L, "buyer"));
    }

    @Test
    @DisplayName("getOrderShipments: outsider user throws ForbiddenException")
    void getOrderShipments_forbidden() {
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(userRepository.findByUsername("outsider")).thenReturn(Optional.of(outsider));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(10L, 3L, ShopMemberStatus.ACTIVE)).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> shipmentService.getOrderShipments(100L, "outsider"));
    }

    @Test
    @DisplayName("getOrderShipments: buyer can view shipments")
    void getOrderShipments_buyerSuccess() {
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(userRepository.findByUsername("buyer")).thenReturn(Optional.of(buyer));
        when(shipmentRepository.findByOrderIdOrderByCreatedAtDesc(100L)).thenReturn(List.of(shipment));

        List<ShipmentResponse> responses = shipmentService.getOrderShipments(100L, "buyer");

        assertNotNull(responses);
        assertEquals(1, responses.size());
        assertEquals("GHN-123456", responses.get(0).getTrackingCode());
    }

    @Test
    @DisplayName("getShopShipments: without permission throws ForbiddenException")
    void getShopShipments_forbidden() {
        when(userRepository.findByUsername("outsider")).thenReturn(Optional.of(outsider));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopMemberRepository.existsByIdShopIdAndIdUserIdAndStatus(10L, 3L, ShopMemberStatus.ACTIVE)).thenReturn(false);

        assertThrows(ForbiddenException.class, () -> shipmentService.getShopShipments(10L, null, 0, 10, "outsider"));
    }

    @Test
    @DisplayName("getShopShipments: shop owner gets paged shipments")
    void getShopShipments_ownerSuccess() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        Page<Shipment> page = new PageImpl<>(List.of(shipment));
        when(shipmentRepository.findByShopIdAndStatus(eq(10L), isNull(), any(Pageable.class))).thenReturn(page);
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        PageResponse<ShipmentResponse> response = shipmentService.getShopShipments(10L, null, 0, 10, "owner");

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
    }

    @Test
    @DisplayName("createShopShipment: cancelled order throws BadRequestException")
    void createShopShipment_cancelledOrder() {
        order.setStatus(OrderStatus.CANCELLED);
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        CreateShipmentRequest req = CreateShipmentRequest.builder().carrier("VNPost").build();
        assertThrows(BadRequestException.class, () -> shipmentService.createShopShipment(10L, 100L, req, "owner"));
    }

    @Test
    @DisplayName("createShopShipment: success creates shipment and updates order to SHIPPED")
    void createShopShipment_success() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(shipmentRepository.save(any(Shipment.class))).thenReturn(shipment);

        CreateShipmentRequest req = CreateShipmentRequest.builder()
                .carrier("Giao Hang Nhanh")
                .trackingCode("GHN-123456")
                .shippingFee(BigDecimal.valueOf(30000))
                .build();

        ShipmentResponse res = shipmentService.createShopShipment(10L, 100L, req, "owner");

        assertNotNull(res);
        assertEquals(OrderStatus.SHIPPED, order.getStatus());
        verify(orderRepository).save(order);
        verify(notificationService).createNotification(any(), any(), any(), any(), any(), any());
        verify(auditLogService).log(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("updateShopShipment: wrong shop throws BadRequestException")
    void updateShopShipment_wrongShop() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shipmentRepository.findById(50L)).thenReturn(Optional.of(shipment));
        Order otherShopOrder = Order.builder().id(100L).shopId(99L).build();
        when(orderRepository.findById(100L)).thenReturn(Optional.of(otherShopOrder));

        UpdateShipmentRequest req = UpdateShipmentRequest.builder().status(ShipmentStatus.DELIVERED).build();
        assertThrows(BadRequestException.class, () -> shipmentService.updateShopShipment(10L, 50L, req, "owner"));
    }

    @Test
    @DisplayName("updateShopShipment: delivered status updates shipment and order")
    void updateShopShipment_delivered() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shipmentRepository.findById(50L)).thenReturn(Optional.of(shipment));
        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(shipmentRepository.save(any(Shipment.class))).thenReturn(shipment);

        UpdateShipmentRequest req = UpdateShipmentRequest.builder()
                .status(ShipmentStatus.DELIVERED)
                .note("Delivered to customer")
                .build();

        ShipmentResponse res = shipmentService.updateShopShipment(10L, 50L, req, "owner");

        assertNotNull(res);
        assertEquals(OrderStatus.DELIVERED, order.getStatus());
        verify(orderRepository).save(order);
    }
}

