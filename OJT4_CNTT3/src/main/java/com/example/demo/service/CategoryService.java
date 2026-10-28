package com.example.demo.service;

import com.example.demo.dto.request.CreateCategoryRequest;
import com.example.demo.dto.request.UpdateCategoryRequest;
import com.example.demo.dto.response.CategoryResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.entity.CategoryStatus;

import java.util.List;

public interface CategoryService {

    /**
     * STT 27: GET /categories - Danh sách danh mục (Public)
     */
    List<CategoryResponse> getCategories(CategoryStatus status, boolean onlyRoots);

    /**
     * STT 28: GET /categories/{categoryId} - Chi tiết danh mục (Public)
     */
    CategoryResponse getCategoryById(Long categoryId);

    /**
     * STT 29: GET /categories/{categoryId}/products - Sản phẩm thuộc danh mục (Public, chỉ lấy ACTIVE)
     */
    PageResponse<ProductSummaryResponse> getCategoryProducts(
            Long categoryId, int page, int size, String sortBy, String sortDir
    );

    /**
     * STT 30: POST /admin/categories - Tạo danh mục mới (ADMIN)
     */
    CategoryResponse createCategory(CreateCategoryRequest request);

    /**
     * STT 31: PATCH /admin/categories/{categoryId} - Cập nhật danh mục (ADMIN)
     */
    CategoryResponse updateCategory(Long categoryId, UpdateCategoryRequest request);

    /**
     * STT 32: DELETE /admin/categories/{categoryId} - Xóa hoặc ngừng sử dụng danh mục (ADMIN)
     */
    void deleteCategory(Long categoryId, boolean force);
}
