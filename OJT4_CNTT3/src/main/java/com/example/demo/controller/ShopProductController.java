package com.example.demo.controller;

import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

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
}
