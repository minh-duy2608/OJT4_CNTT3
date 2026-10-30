package com.example.demo.controller;

import com.example.demo.dto.request.CreateProductImageRequest;
import com.example.demo.dto.request.CreateProductRequest;
import com.example.demo.dto.request.CreateProductVariantRequest;
import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.request.UpdateProductImageRequest;
import com.example.demo.dto.request.UpdateProductRequest;
import com.example.demo.dto.request.UpdateProductStatusRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductDetailResponse;
import com.example.demo.dto.response.ProductImageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.dto.response.ProductVariantResponse;
import com.example.demo.entity.ProductStatus;
import com.example.demo.service.ProductService;
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

@RestController
@RequestMapping({"/shops", "/api/v1/shops"})
@RequiredArgsConstructor
public class ShopProductController {

    private final ProductService productService;

    /**
     * STT 44: GET /shops/{shopId}/products - Sản phẩm công khai của cửa hàng (Public)
     */
    @GetMapping("/{shopId}/products")
    public ResponseEntity<ApiResponse<PageResponse<ProductSummaryResponse>>> getShopProducts(
            @PathVariable Long shopId,
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

        PageResponse<ProductSummaryResponse> response = productService.getShopProducts(shopId, criteria);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm cửa hàng thành công", response));
    }

    /**
     * STT 45: GET /shops/{shopId}/manage/products - Danh sách sản phẩm trong phạm vi quản lý (Shop permission)
     */
    @GetMapping("/{shopId}/manage/products")
    public ResponseEntity<ApiResponse<PageResponse<ProductSummaryResponse>>> getShopManagedProducts(
            @PathVariable Long shopId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String sortDir,
            Principal principal
    ) {
        ProductFilterCriteria criteria = ProductFilterCriteria.builder()
                .keyword(keyword)
                .categoryId(categoryId)
                .brandId(brandId)
                .status(status)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .inStock(inStock)
                .page(page)
                .size(size)
                .sortBy(sort)
                .sortDir(sortDir)
                .build();

        String username = principal != null ? principal.getName() : null;
        PageResponse<ProductSummaryResponse> response = productService.getShopManagedProducts(shopId, criteria, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm quản lý thành công", response));
    }

    /**
     * STT 46: POST /shops/{shopId}/products - Tạo sản phẩm (Shop permission)
     */
    @PostMapping("/{shopId}/products")
    public ResponseEntity<ApiResponse<ProductDetailResponse>> createShopProduct(
            @PathVariable Long shopId,
            @Valid @RequestBody CreateProductRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductDetailResponse response = productService.createShopProduct(shopId, request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo sản phẩm cho cửa hàng thành công", response));
    }

    /**
     * STT 47: GET /shops/{shopId}/products/{productId} - Chi tiết sản phẩm trong phạm vi quản lý (Shop permission)
     */
    @GetMapping("/{shopId}/products/{productId}")
    public ResponseEntity<ApiResponse<ProductDetailResponse>> getShopProductById(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductDetailResponse response = productService.getShopProductById(shopId, productId, username);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết sản phẩm cửa hàng thành công", response));
    }

    /**
     * STT 48: PATCH /shops/{shopId}/products/{productId} - Cập nhật thông tin sản phẩm (Shop permission)
     */
    @RequestMapping(value = "/{shopId}/products/{productId}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<ProductDetailResponse>> updateShopProduct(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @Valid @RequestBody UpdateProductRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductDetailResponse response = productService.updateShopProduct(shopId, productId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật sản phẩm cửa hàng thành công", response));
    }

    /**
     * STT 49: PATCH /shops/{shopId}/products/{productId}/status - Thay đổi trạng thái sản phẩm (Shop permission)
     */
    @PatchMapping("/{shopId}/products/{productId}/status")
    public ResponseEntity<ApiResponse<ProductDetailResponse>> updateShopProductStatus(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @Valid @RequestBody UpdateProductStatusRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductDetailResponse response = productService.updateShopProductStatus(shopId, productId, request.getStatus(), username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái sản phẩm thành công", response));
    }

    /**
     * STT 50: DELETE /shops/{shopId}/products/{productId} - Ngừng kinh doanh hoặc xóa theo chính sách (Shop permission)
     */
    @DeleteMapping("/{shopId}/products/{productId}")
    public ResponseEntity<ApiResponse<Void>> deleteShopProduct(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @RequestParam(defaultValue = "false") boolean force,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        productService.deleteShopProduct(shopId, productId, force, username);
        return ResponseEntity.ok(ApiResponse.success(force ? "Đã xóa vĩnh viễn sản phẩm" : "Đã ngừng kinh doanh sản phẩm", null));
    }

    /**
     * STT 51: POST /shops/{shopId}/products/{productId}/variants - Tạo biến thể sản phẩm (Shop permission)
     */
    @PostMapping("/{shopId}/products/{productId}/variants")
    public ResponseEntity<ApiResponse<ProductVariantResponse>> createShopProductVariant(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @Valid @RequestBody CreateProductVariantRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductVariantResponse response = productService.createShopProductVariant(shopId, productId, request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo biến thể sản phẩm thành công", response));
    }

    /**
     * STT 52: PATCH /shops/{shopId}/products/{productId}/variants/{variantId} - Cập nhật biến thể (Shop permission)
     */
    @RequestMapping(value = "/{shopId}/products/{productId}/variants/{variantId}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<ProductVariantResponse>> updateShopProductVariant(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @Valid @RequestBody CreateProductVariantRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductVariantResponse response = productService.updateShopProductVariant(shopId, productId, variantId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật biến thể sản phẩm thành công", response));
    }

    /**
     * STT 53: DELETE /shops/{shopId}/products/{productId}/variants/{variantId} - Xóa hoặc vô hiệu hóa biến thể (Shop permission)
     */
    @DeleteMapping("/{shopId}/products/{productId}/variants/{variantId}")
    public ResponseEntity<ApiResponse<Void>> deleteShopProductVariant(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @PathVariable Long variantId,
            @RequestParam(defaultValue = "false") boolean force,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        productService.deleteShopProductVariant(shopId, productId, variantId, force, username);
        return ResponseEntity.ok(ApiResponse.success(force ? "Đã xóa biến thể sản phẩm" : "Đã vô hiệu hóa biến thể", null));
    }

    /**
     * STT 54: POST /shops/{shopId}/products/{productId}/images - Thêm hình ảnh sản phẩm (Shop permission)
     */
    @PostMapping("/{shopId}/products/{productId}/images")
    public ResponseEntity<ApiResponse<ProductImageResponse>> addShopProductImage(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @Valid @RequestBody CreateProductImageRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductImageResponse response = productService.addShopProductImage(shopId, productId, request, username);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm hình ảnh sản phẩm thành công", response));
    }

    /**
     * STT 55: PATCH /shops/{shopId}/products/{productId}/images/{imageId} - Cập nhật thứ tự hoặc thuộc tính hình ảnh (Shop permission)
     */
    @RequestMapping(value = "/{shopId}/products/{productId}/images/{imageId}", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<ProductImageResponse>> updateShopProductImage(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @PathVariable Long imageId,
            @Valid @RequestBody UpdateProductImageRequest request,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        ProductImageResponse response = productService.updateShopProductImage(shopId, productId, imageId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật hình ảnh sản phẩm thành công", response));
    }

    /**
     * STT 56: DELETE /shops/{shopId}/products/{productId}/images/{imageId} - Xóa hình ảnh sản phẩm (Shop permission)
     */
    @DeleteMapping("/{shopId}/products/{productId}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteShopProductImage(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @PathVariable Long imageId,
            Principal principal
    ) {
        String username = principal != null ? principal.getName() : null;
        productService.deleteShopProductImage(shopId, productId, imageId, username);
        return ResponseEntity.ok(ApiResponse.success("Xóa hình ảnh sản phẩm thành công", null));
    }
}


