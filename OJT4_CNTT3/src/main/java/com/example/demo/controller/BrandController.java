package com.example.demo.controller;

import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.BrandResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.entity.BrandStatus;
import com.example.demo.service.BrandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/brands", "/api/v1/brands"})
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    /**
     * STT 33: GET /brands - Danh sách thương hiệu (Public)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<BrandResponse>>> getBrands(
            @RequestParam(required = false) BrandStatus status
    ) {
        List<BrandResponse> brands = brandService.getBrands(status);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thương hiệu thành công", brands));
    }

    /**
     * STT 34: GET /brands/{brandId} - Chi tiết thương hiệu (Public)
     */
    @GetMapping("/{brandId}")
    public ResponseEntity<ApiResponse<BrandResponse>> getBrandById(@PathVariable Long brandId) {
        BrandResponse brand = brandService.getBrandById(brandId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin thương hiệu thành công", brand));
    }

    /**
     * STT 35: GET /brands/{brandId}/products - Sản phẩm thuộc thương hiệu (Public)
     */
    @GetMapping("/{brandId}/products")
    public ResponseEntity<ApiResponse<PageResponse<ProductSummaryResponse>>> getBrandProducts(
            @PathVariable Long brandId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        PageResponse<ProductSummaryResponse> products = brandService.getBrandProducts(brandId, page, size, sortBy, sortDir);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm thuộc thương hiệu thành công", products));
    }
}

