package com.example.demo.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import com.example.demo.dto.request.AddShopMemberRequest;
import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.request.RegisterShopRequest;
import com.example.demo.dto.request.UpdateShopMemberRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PublicShopDetailResponse;
import com.example.demo.dto.response.ShopDetailResponse;
import com.example.demo.dto.response.ShopManageResponse;
import com.example.demo.dto.response.ShopMemberResponse;
import com.example.demo.dto.response.ShopRevenueDashboardResponse;
import com.example.demo.service.ShopMemberService;
import com.example.demo.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;

@Tag(name = "09. Người bán - Đăng ký & Hồ sơ Shop", description = "Đăng ký mở shop, xem và sửa thông tin cửa hàng")
@RestController
@RequestMapping({"/shops", "/api/v1/shops"})
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;
    private final ShopMemberService shopMemberService;

    /**
     * Đăng ký mở Cửa hàng mới (Khách hàng trở thành SHOP_MANAGER)
     * POST /shops/register hoặc POST /shops
     */
    @PostMapping({"/register", ""})
    public ResponseEntity<ApiResponse<ShopDetailResponse>> registerShop(
            @Valid @RequestBody RegisterShopRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.registerShop(request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Đăng ký cửa hàng thành công! Bạn đã được cấp quyền Quản lý cửa hàng (SHOP_MANAGER).", response));
    }

    /**
     * Lấy thông tin cửa hàng của người dùng hiện tại
     * GET /shops/my-shop
     */
    @GetMapping("/my-shop")
    public ResponseEntity<ApiResponse<ShopDetailResponse>> getMyShop(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.getMyShop(username);
        if (response != null) {
            return ResponseEntity.ok(ApiResponse.success("Lấy thông tin cửa hàng thành công", response));
        } else {
            return ResponseEntity.ok(ApiResponse.success("Bạn chưa đăng ký cửa hàng nào", null));
        }
    }

    /**
     * STT 60: GET /shops/my - Danh sách cửa hàng người dùng quản lý (Authenticated)
     */
    @GetMapping({"/my", "/my-shops"})
    public ResponseEntity<ApiResponse<List<ShopDetailResponse>>> getMyShops(Principal principal) {
        String username = principal != null ? principal.getName() : null;
        List<ShopDetailResponse> response = shopService.getMyShops(username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cửa hàng quản lý thành công", response));
    }

    /**
     * STT 61: GET /shops/{shopId}/manage - Thông tin quản lý cửa hàng (Shop permission)
     */
    @GetMapping("/{shopId}/manage")
    public ResponseEntity<ApiResponse<ShopManageResponse>> getShopManageInfo(
            @PathVariable Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopManageResponse response = shopService.getShopManageInfo(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin quản lý cửa hàng thành công", response));
    }

    /**
     * Danh sách tất cả các cửa hàng đang hoạt động
     * GET /shops
     */
    @GetMapping({"", "/list"})
    public ResponseEntity<ApiResponse<List<ShopDetailResponse>>> getAllActiveShops() {
        List<ShopDetailResponse> response = shopService.getAllActiveShops();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách cửa hàng thành công", response));
    }

    /**
     * Chi tiết cửa hàng theo ID
     * GET /shops/{shopId}
     */
    @GetMapping("/{shopId}")
    public ResponseEntity<ApiResponse<ShopDetailResponse>> getShopById(
            @PathVariable Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.getShopById(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin chi tiết cửa hàng thành công", response));
    }

    /**
     * Dashboard doanh thu cửa hàng (Chủ shop / Thành viên quản lý / ADMIN)
     */
    @Operation(summary = "Dashboard doanh thu shop",
            description = "Tổng hợp doanh thu theo đơn hợp lệ; thống nhất doanh thu tính từ DELIVERED hay RETURNED trừ hoàn; tránh tính đơn CANCELLED; lọc thời gian. Đối chiếu query/đơn và quy tắc doanh thu.")
    @GetMapping({"/{shopId}/revenue/dashboard", "/{shopId}/dashboard/revenue", "/{shopId}/revenue"})
    public ResponseEntity<ApiResponse<ShopRevenueDashboardResponse>> getShopRevenueDashboard(
            @PathVariable Long shopId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "day") String groupBy,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopRevenueDashboardResponse response = shopService.getShopRevenueDashboard(shopId, from, to, groupBy, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu dashboard doanh thu cửa hàng thành công", response));
    }

    /**
     * Trang cửa hàng công khai: thông tin shop, toàn bộ sản phẩm đang bán, phân trang; lọc category và brand giống catalog
     */
    @Operation(summary = "Trang cửa hàng công khai & sản phẩm",
            description = "Theo shopId/slug: thông tin shop, toàn bộ sản phẩm đang bán, phân trang; lọc category và brand giống catalog. Chỉ sản phẩm active/public.")
    @GetMapping({"/{shopIdentifier}/public", "/public/{shopIdentifier}"})
    public ResponseEntity<ApiResponse<PublicShopDetailResponse>> getPublicShopPage(
            @PathVariable String shopIdentifier,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        ProductFilterCriteria criteria = ProductFilterCriteria.builder()
                .keyword(keyword)
                .categoryId(categoryId)
                .brandId(brandId)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .inStock(inStock)
                .page(page)
                .size(size)
                .sortBy(sort)
                .sortDir(sortDir)
                .build();

        PublicShopDetailResponse response = shopService.getPublicShopPage(shopIdentifier, criteria);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin trang cửa hàng công khai thành công", response));
    }

    /**
     * Cập nhật thông tin cửa hàng
     * PUT /shops/{shopId} hoặc PATCH /shops/{shopId}
     */
    @RequestMapping(value = "/{shopId}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<ShopDetailResponse>> updateShop(
            @PathVariable Long shopId,
            @Valid @RequestBody RegisterShopRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopDetailResponse response = shopService.updateShop(shopId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin cửa hàng thành công", response));
    }

    /**
     * STT 63: GET /shops/{shopId}/members - Danh sách thành viên (Shop permission)
     */
    @GetMapping("/{shopId}/members")
    public ResponseEntity<ApiResponse<List<ShopMemberResponse>>> getShopMembers(
            @PathVariable Long shopId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        List<ShopMemberResponse> response = shopMemberService.getShopMembers(shopId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thành viên cửa hàng thành công", response));
    }

    /**
     * STT 64: POST /shops/{shopId}/members - Thêm thành viên (Quyền quản lý thành viên)
     */
    @PostMapping("/{shopId}/members")
    public ResponseEntity<ApiResponse<ShopMemberResponse>> addShopMember(
            @PathVariable Long shopId,
            @Valid @RequestBody AddShopMemberRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopMemberResponse response = shopMemberService.addShopMember(shopId, request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm thành viên vào cửa hàng thành công", response));
    }

    /**
     * STT 65: PATCH /shops/{shopId}/members/{memberId} - Thay đổi vai trò hoặc trạng thái thành viên (Quyền quản lý thành viên)
     */
    @PatchMapping("/{shopId}/members/{memberId}")
    public ResponseEntity<ApiResponse<ShopMemberResponse>> updateShopMember(
            @PathVariable Long shopId,
            @PathVariable Long memberId,
            @Valid @RequestBody UpdateShopMemberRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ShopMemberResponse response = shopMemberService.updateShopMember(shopId, memberId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin thành viên thành công", response));
    }

    /**
     * STT 66: DELETE /shops/{shopId}/members/{memberId} - Xóa thành viên khỏi cửa hàng (Quyền quản lý thành viên)
     */
    @DeleteMapping("/{shopId}/members/{memberId}")
    public ResponseEntity<ApiResponse<Void>> deleteShopMember(
            @PathVariable Long shopId,
            @PathVariable Long memberId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        shopMemberService.deleteShopMember(shopId, memberId, username);
        return ResponseEntity.ok(ApiResponse.success("Xóa thành viên khỏi cửa hàng thành công", null));
    }
}

