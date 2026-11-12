package com.example.demo.service.impl;

import com.example.demo.dto.request.AdjustInventoryRequest;
import com.example.demo.dto.response.InventoryDetailResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.entity.*;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ForbiddenException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.exception.UnauthorizedException;
import com.example.demo.repository.*;
import com.example.demo.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductRepository productRepository;
    private final ShopRepository shopRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InventoryDetailResponse> getShopInventory(Long shopId, String keyword, int page, int size, String username) {
        verifyShopInventoryAccess(shopId, username);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "updatedAt"));
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;

        Page<Inventory> inventoryPage = inventoryRepository.findByShopIdAndKeyword(shopId, kw, pageable);
        List<InventoryDetailResponse> content = inventoryPage.getContent().stream()
                .map(this::mapToDetailResponse)
                .toList();

        return PageResponse.<InventoryDetailResponse>builder()
                .content(content)
                .page(inventoryPage.getNumber())
                .size(inventoryPage.getSize())
                .totalElements(inventoryPage.getTotalElements())
                .totalPages(inventoryPage.getTotalPages())
                .first(inventoryPage.isFirst())
                .last(inventoryPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryDetailResponse getInventoryDetail(Long shopId, Long inventoryId, String username) {
        verifyShopInventoryAccess(shopId, username);
        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tồn kho #" + inventoryId));

        ProductVariant variant = productVariantRepository.findById(inventory.getVariantId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy biến thể #" + inventory.getVariantId()));

        if (!Objects.equals(variant.getProduct().getShopId(), shopId)) {
            throw new BadRequestException("Biến thể #" + inventory.getVariantId() + " không thuộc cửa hàng #" + shopId);
        }

        return mapToDetailResponse(inventory);
    }

    @Override
    @Transactional
    public InventoryDetailResponse adjustInventory(Long shopId, Long inventoryId, AdjustInventoryRequest request, String username) {
        verifyShopInventoryAccess(shopId, username);

        ProductVariant variant = productVariantRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy biến thể #" + inventoryId));

        if (!Objects.equals(variant.getProduct().getShopId(), shopId)) {
            throw new BadRequestException("Biến thể #" + inventoryId + " không thuộc cửa hàng #" + shopId);
        }

        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseGet(() -> Inventory.builder()
                        .variantId(inventoryId)
                        .quantity(0)
                        .reservedQuantity(0)
                        .updatedAt(LocalDateTime.now())
                        .build());

        int currentQty = inventory.getQuantity() != null ? inventory.getQuantity() : 0;
        int currentReserved = inventory.getReservedQuantity() != null ? inventory.getReservedQuantity() : 0;

        Integer change = request.getChangeQuantity() != null ? request.getChangeQuantity() : request.getAdjustment();
        String op = request.getOperation() != null ? request.getOperation().trim().toUpperCase() : null;

        if (op == null) {
            if (change != null) {
                op = "ADJUST";
            } else if (request.getQuantity() != null) {
                op = "SET";
            } else {
                op = "SET";
            }
        }

        int targetQty = currentQty;
        if ("SET".equals(op)) {
            if (request.getQuantity() != null) {
                targetQty = request.getQuantity();
            } else if (change != null) {
                targetQty = currentQty + change;
            }
        } else if ("INCREMENT".equals(op) || "ADD".equals(op)) {
            int adj = change != null ? change : (request.getQuantity() != null ? request.getQuantity() : 0);
            targetQty = currentQty + adj;
        } else if ("DECREMENT".equals(op) || "SUBTRACT".equals(op)) {
            int adj = change != null ? change : (request.getQuantity() != null ? request.getQuantity() : 0);
            targetQty = currentQty - Math.abs(adj);
        } else if ("ADJUST".equals(op)) {
            int adj = change != null ? change : 0;
            targetQty = currentQty + adj;
        }

        int targetReserved = currentReserved;
        if (request.getReservedQuantity() != null) {
            targetReserved = request.getReservedQuantity();
        }

        if (targetQty < 0) {
            throw new BadRequestException("Số lượng tồn kho không được âm: " + targetQty);
        }
        if (targetReserved > targetQty) {
            throw new BadRequestException("Số lượng tạm giữ (" + targetReserved + ") không được vượt quá số lượng tồn kho (" + targetQty + ")");
        }

        inventory.setQuantity(targetQty);
        inventory.setReservedQuantity(targetReserved);
        inventory.setUpdatedAt(LocalDateTime.now());
        Inventory saved = inventoryRepository.save(inventory);

        log.info("User {} adjusted inventory for variant #{}: qty {} -> {}, reserved {} -> {}, reason: {}",
                username, inventoryId, currentQty, targetQty, currentReserved, targetReserved, request.getReason());

        return mapToDetailResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryDetailResponse> getLowStockInventory(Long shopId, Integer threshold, String username) {
        verifyShopInventoryAccess(shopId, username);
        int limit = threshold != null && threshold >= 0 ? threshold : 10;
        List<Inventory> list = inventoryRepository.findLowStockByShopId(shopId, limit);
        return list.stream().map(this::mapToDetailResponse).toList();
    }

    private InventoryDetailResponse mapToDetailResponse(Inventory inv) {
        ProductVariant variant = productVariantRepository.findById(inv.getVariantId()).orElse(null);
        Product product = variant != null ? variant.getProduct() : null;
        Shop shop = product != null && product.getShopId() != null ? shopRepository.findById(product.getShopId()).orElse(null) : null;

        int q = inv.getQuantity() != null ? inv.getQuantity() : 0;
        int rq = inv.getReservedQuantity() != null ? inv.getReservedQuantity() : 0;
        int avail = Math.max(0, q - rq);

        return InventoryDetailResponse.builder()
                .inventoryId(inv.getVariantId())
                .variantId(inv.getVariantId())
                .productId(product != null ? product.getId() : null)
                .productName(product != null ? product.getName() : "Sản phẩm #" + inv.getVariantId())
                .variantName(variant != null ? variant.getVariantName() : "Phiên bản")
                .sku(variant != null ? variant.getSku() : null)
                .price(variant != null ? variant.getPrice() : null)
                .salePrice(variant != null ? variant.getSalePrice() : null)
                .shopId(product != null ? product.getShopId() : null)
                .shopName(shop != null ? shop.getName() : null)
                .quantity(q)
                .reservedQuantity(rq)
                .availableQuantity(avail)
                .variantStatus(variant != null && variant.getStatus() != null ? variant.getStatus().name() : "ACTIVE")
                .updatedAt(inv.getUpdatedAt())
                .build();
    }

    private Shop verifyShopInventoryAccess(Long shopId, String username) {
        if (username == null || username.isBlank()) {
            throw new UnauthorizedException("Yêu cầu đăng nhập");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản: " + username));

        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng #" + shopId));

        boolean isAdmin = user.getRole() == Role.ADMIN || user.getRole() == Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode())));

        if (isAdmin) {
            return shop;
        }

        if (shop.getStatus() == ShopStatus.SUSPENDED) {
            throw new ForbiddenException("Cửa hàng #" + shopId + " đang bị tạm ngừng kinh doanh (SUSPENDED).");
        }

        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        if (isOwner) {
            return shop;
        }

        long activeMembers = shopRepository.countActiveMemberInShop(shopId, user.getId());
        if (activeMembers > 0) {
            return shop;
        }

        throw new ForbiddenException("Bạn không có quyền quản lý kho của cửa hàng #" + shopId);
    }
}

