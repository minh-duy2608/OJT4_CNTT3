package com.example.demo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;

import com.example.demo.dto.request.CreateProductRequest;
import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.request.UpdateProductRequest;
import com.example.demo.dto.request.UpdateProductStatusRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductDetailResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.entity.ProductStatus;
import com.example.demo.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "08. Admin - Quản lý Sản phẩm sàn", description = "Tạo, sửa, xóa, kiểm duyệt sản phẩm cấp quản trị viên")
@RestController
@RequestMapping({"/admin/products", "/api/v1/admin/products"})
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SHOP_MANAGER', 'SHOP_OWNER')")
public class AdminProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductSummaryResponse>>> getAdminProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long shopId,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        ProductFilterCriteria criteria = ProductFilterCriteria.builder()
                .keyword(keyword)
                .categoryId(categoryId)
                .brandId(brandId)
                .shopId(shopId)
                .status(status)
                .page(page)
                .size(size)
                .sortBy(sort)
                .sortDir(sortDir)
                .build();
        PageResponse<ProductSummaryResponse> response = productService.getAdminProducts(criteria);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm quản trị thành công", response));
    }

    @PatchMapping("/{productId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<ProductDetailResponse>> approveProduct(@PathVariable Long productId) {
        ProductDetailResponse response = productService.approveProduct(productId);
        return ResponseEntity.ok(ApiResponse.success("Phê duyệt sản phẩm lên sàn thành công", response));
    }

    @PatchMapping("/{productId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<ProductDetailResponse>> rejectProduct(
            @PathVariable Long productId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = body != null ? body.get("reason") : null;
        ProductDetailResponse response = productService.rejectProduct(productId, reason);
        return ResponseEntity.ok(ApiResponse.success("Từ chối phê duyệt sản phẩm thành công", response));
    }

    @PatchMapping("/{productId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<ProductDetailResponse>> updateProductStatus(
            @PathVariable Long productId,
            @Valid @RequestBody UpdateProductStatusRequest request
    ) {
        ProductDetailResponse response = productService.updateProductStatus(productId, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái sản phẩm thành công", response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductDetailResponse>> createProduct(@Valid @RequestBody CreateProductRequest request) {
        ProductDetailResponse response = productService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo sản phẩm mới thành công", response));
    }

    @RequestMapping(value = "/{productId}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<ProductDetailResponse>> updateProduct(
            @PathVariable Long productId,
            @Valid @RequestBody UpdateProductRequest request
    ) {
        ProductDetailResponse response = productService.updateProduct(productId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin sản phẩm thành công", response));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "false") boolean force
    ) {
        productService.deleteProduct(productId, force);
        String msg = force ? "Đã xóa vĩnh viễn sản phẩm" : "Đã chuyển sản phẩm sang trạng thái ngừng kinh doanh (INACTIVE)";
        return ResponseEntity.ok(ApiResponse.success(msg, null));
    }
}
