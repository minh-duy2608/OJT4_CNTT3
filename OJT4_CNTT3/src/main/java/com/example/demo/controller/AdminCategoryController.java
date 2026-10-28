package com.example.demo.controller;

import com.example.demo.dto.request.CreateCategoryRequest;
import com.example.demo.dto.request.UpdateCategoryRequest;
import com.example.demo.dto.response.ApiResponse;
import com.example.demo.dto.response.CategoryResponse;
import com.example.demo.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/admin/categories", "/api/v1/admin/categories"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCategoryController {

    private final CategoryService categoryService;

    /**
     * STT 30: POST /admin/categories - Tạo danh mục sản phẩm mới (ADMIN)
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CreateCategoryRequest request
    ) {
        CategoryResponse response = categoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo danh mục sản phẩm mới thành công", response));
    }

    /**
     * STT 31: PATCH /admin/categories/{categoryId} - Cập nhật danh mục sản phẩm (ADMIN)
     */
    @PatchMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @PathVariable Long categoryId,
            @Valid @RequestBody UpdateCategoryRequest request
    ) {
        CategoryResponse response = categoryService.updateCategory(categoryId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật danh mục sản phẩm thành công", response));
    }

    /**
     * STT 32: DELETE /admin/categories/{categoryId} - Xóa hoặc ngừng sử dụng danh mục (ADMIN)
     */
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @PathVariable Long categoryId,
            @RequestParam(defaultValue = "false") boolean force
    ) {
        categoryService.deleteCategory(categoryId, force);
        String message = force
                ? "Đã ngừng sử dụng / vô hiệu hóa danh mục an toàn"
                : "Đã xóa danh mục sản phẩm thành công";
        return ResponseEntity.ok(ApiResponse.success(message, null));
    }
}
