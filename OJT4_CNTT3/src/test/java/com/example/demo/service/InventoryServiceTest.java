package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.AdjustInventoryRequest;
import com.example.demo.dto.response.InventoryDetailResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.impl.InventoryServiceImpl;
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
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Inventory Service Unit Tests")
class InventoryServiceTest extends BaseUnitTest {

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private InventoryServiceImpl inventoryService;

    private User admin;
    private User shopOwner;
    private Shop shop;
    private Product product;
    private ProductVariant variant;
    private Inventory inventory;

    @BeforeEach
    void setUp() {
        admin = User.builder().id(1L).username("admin").role(Role.ADMIN).build();
        shopOwner = User.builder().id(2L).username("owner").role(Role.SHOP_OWNER).build();
        shop = Shop.builder().id(10L).name("Tech Shop").ownerId(2L).status(ShopStatus.ACTIVE).build();
        product = Product.builder().id(100L).name("Laptop Cyber").shopId(10L).status(ProductStatus.ACTIVE).build();
        variant = ProductVariant.builder().id(200L).variantName("Core i7").sku("CYBER-I7").price(BigDecimal.valueOf(20000000)).product(product).build();
        inventory = Inventory.builder().variantId(200L).quantity(50).reservedQuantity(5).updatedAt(LocalDateTime.now()).build();
    }

    @Test
    @DisplayName("getShopInventory: requires login")
    void getShopInventory_unauthorized() {
        assertThrows(UnauthorizedException.class, () -> inventoryService.getShopInventory(10L, null, 0, 10, null));
    }

    @Test
    @DisplayName("getShopInventory: non-owner throws ForbiddenException")
    void getShopInventory_forbidden() {
        User other = User.builder().id(3L).username("other").role(Role.ROLE_USER).build();
        when(userRepository.findByUsername("other")).thenReturn(Optional.of(other));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(shopRepository.countActiveMemberInShop(10L, 3L)).thenReturn(0L);

        assertThrows(ForbiddenException.class, () -> inventoryService.getShopInventory(10L, null, 0, 10, "other"));
    }

    @Test
    @DisplayName("getShopInventory: owner successfully fetches inventory page")
    void getShopInventory_success() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        Page<Inventory> page = new PageImpl<>(List.of(inventory));
        when(inventoryRepository.findByShopIdAndKeyword(eq(10L), any(), any(Pageable.class))).thenReturn(page);
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));

        PageResponse<InventoryDetailResponse> res = inventoryService.getShopInventory(10L, null, 0, 10, "owner");
        assertNotNull(res);
        assertEquals(1, res.getContent().size());
        assertEquals(200L, res.getContent().get(0).getVariantId());
        assertEquals(50, res.getContent().get(0).getQuantity());
        assertEquals(45, res.getContent().get(0).getAvailableQuantity());
    }

    @Test
    @DisplayName("getInventoryDetail: successfully fetches single inventory")
    void getInventoryDetail_success() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(inventory));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));

        InventoryDetailResponse detail = inventoryService.getInventoryDetail(10L, 200L, "owner");
        assertNotNull(detail);
        assertEquals(200L, detail.getVariantId());
        assertEquals(50, detail.getQuantity());
    }

    @Test
    @DisplayName("adjustInventory: ADJUST with changeQuantity increases stock")
    void adjustInventory_changeQuantity_positive() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(i -> i.getArgument(0));

        AdjustInventoryRequest req = AdjustInventoryRequest.builder()
                .changeQuantity(20)
                .reason("Nhập hàng mới")
                .build();

        InventoryDetailResponse res = inventoryService.adjustInventory(10L, 200L, req, "owner");
        assertNotNull(res);
        assertEquals(70, res.getQuantity()); // 50 + 20
        assertEquals(65, res.getAvailableQuantity()); // 70 - 5
    }

    @Test
    @DisplayName("adjustInventory: ADJUST with changeQuantity decreases stock")
    void adjustInventory_changeQuantity_negative() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(i -> i.getArgument(0));

        AdjustInventoryRequest req = AdjustInventoryRequest.builder()
                .changeQuantity(-10)
                .reason("Xuất hàng hỏng")
                .build();

        InventoryDetailResponse res = inventoryService.adjustInventory(10L, 200L, req, "owner");
        assertNotNull(res);
        assertEquals(40, res.getQuantity()); // 50 - 10
        assertEquals(35, res.getAvailableQuantity()); // 40 - 5
    }

    @Test
    @DisplayName("adjustInventory: SET operation sets exact stock")
    void adjustInventory_set_exact() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(i -> i.getArgument(0));

        AdjustInventoryRequest req = AdjustInventoryRequest.builder()
                .operation("SET")
                .quantity(100)
                .reason("Kiểm kê")
                .build();

        InventoryDetailResponse res = inventoryService.adjustInventory(10L, 200L, req, "owner");
        assertNotNull(res);
        assertEquals(100, res.getQuantity());
        assertEquals(95, res.getAvailableQuantity()); // 100 - 5
    }

    @Test
    @DisplayName("adjustInventory: target quantity negative throws BadRequestException")
    void adjustInventory_negativeStock_throwsException() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));
        when(inventoryRepository.findById(200L)).thenReturn(Optional.of(inventory));

        AdjustInventoryRequest req = AdjustInventoryRequest.builder()
                .changeQuantity(-60) // 50 - 60 = -10
                .reason("Lỗi")
                .build();

        assertThrows(BadRequestException.class, () -> inventoryService.adjustInventory(10L, 200L, req, "owner"));
    }

    @Test
    @DisplayName("getLowStockInventory: returns list of low stock items")
    void getLowStockInventory_success() {
        when(userRepository.findByUsername("owner")).thenReturn(Optional.of(shopOwner));
        when(shopRepository.findById(10L)).thenReturn(Optional.of(shop));
        when(inventoryRepository.findLowStockByShopId(10L, 10)).thenReturn(List.of(inventory));
        when(productVariantRepository.findById(200L)).thenReturn(Optional.of(variant));

        List<InventoryDetailResponse> res = inventoryService.getLowStockInventory(10L, 10, "owner");
        assertNotNull(res);
        assertEquals(1, res.size());
        assertEquals(50, res.get(0).getQuantity());
    }
}
