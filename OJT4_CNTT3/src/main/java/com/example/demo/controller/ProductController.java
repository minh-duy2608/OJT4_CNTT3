package com.example.demo.controller;

import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductDetailResponse;
import com.example.demo.dto.response.ProductImageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.dto.response.ProductVariantResponse;
import com.example.demo.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping({"/products", "/api/v1/products"})
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * STT 39: GET /products - Danh sách sản phẩm, có phân trang và lọc đa tham số (Public)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductSummaryResponse>>> getProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long shopId,
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
                .shopId(shopId)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .inStock(inStock)
                .page(page)
                .size(size)
                .sortBy(sort)
                .sortDir(sortDir)
                .build();

        PageResponse<ProductSummaryResponse> response = productService.getProducts(criteria);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm thành công", response));
    }

    /**
     * STT 40: GET /products/{productId} - Chi tiết sản phẩm (Public)
     */
    @GetMapping("/{productId}")
    public ResponseEntity<ApiResponse<ProductDetailResponse>> getProductById(@PathVariable Long productId) {
        ProductDetailResponse response = productService.getProductById(productId);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết sản phẩm thành công", response));
    }

    /**
     * STT 41: GET /products/{productId}/variants - Danh sách biến thể sản phẩm (Public)
     */
    @GetMapping("/{productId}/variants")
    public ResponseEntity<ApiResponse<List<ProductVariantResponse>>> getProductVariants(@PathVariable Long productId) {
        List<ProductVariantResponse> response = productService.getProductVariants(productId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách biến thể sản phẩm thành công", response));
    }

    /**
     * STT 42: GET /products/{productId}/images - Danh sách hình ảnh sản phẩm (Public)
     */
    @GetMapping("/{productId}/images")
    public ResponseEntity<ApiResponse<List<ProductImageResponse>>> getProductImages(@PathVariable Long productId) {
        List<ProductImageResponse> response = productService.getProductImages(productId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách hình ảnh sản phẩm thành công", response));
    }

    /**
     * STT 43: GET /products/search - Tìm kiếm sản phẩm (Public)
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<ProductSummaryResponse>>> searchProducts(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long shopId,
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
                .shopId(shopId)
                .minPrice(minPrice)
                .maxPrice(maxPrice)
                .inStock(inStock)
                .page(page)
                .size(size)
                .sortBy(sort)
                .sortDir(sortDir)
                .build();

        PageResponse<ProductSummaryResponse> response = productService.searchProducts(criteria);
        return ResponseEntity.ok(ApiResponse.success("Tìm kiếm sản phẩm thành công", response));
    }
}
