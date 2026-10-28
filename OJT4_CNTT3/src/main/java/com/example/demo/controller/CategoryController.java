package com.example.demo.controller;

import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.CategoryResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.entity.CategoryStatus;
import com.example.demo.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/categories", "/api/v1/categories"})
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * STT 27: GET /categories - Danh sách danh mục sản phẩm (Public)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategories(
            @RequestParam(required = false) CategoryStatus status,
            @RequestParam(defaultValue = "false") boolean onlyRoots
    ) {
        List<CategoryResponse> categories = categoryService.getCategories(status, onlyRoots);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách danh mục thành công", categories));
    }

    /**
     * STT 28: GET /categories/{categoryId} - Chi tiết danh mục sản phẩm (Public)
     */
    @GetMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategoryById(@PathVariable Long categoryId) {
        CategoryResponse category = categoryService.getCategoryById(categoryId);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết danh mục thành công", category));
    }

    /**
     * STT 29: GET /categories/{categoryId}/products - Danh sách sản phẩm thuộc danh mục (Public, chỉ lấy ACTIVE)
     */
    @GetMapping("/{categoryId}/products")
    public ResponseEntity<ApiResponse<PageResponse<ProductSummaryResponse>>> getCategoryProducts(
            @PathVariable Long categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        PageResponse<ProductSummaryResponse> products = categoryService.getCategoryProducts(
                categoryId, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách sản phẩm thuộc danh mục thành công", products));
    }
}
