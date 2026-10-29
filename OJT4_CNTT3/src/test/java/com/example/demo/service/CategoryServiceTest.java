package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.CreateCategoryRequest;
import com.example.demo.dto.request.UpdateCategoryRequest;
import com.example.demo.dto.response.CategoryResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.entity.Category;
import com.example.demo.entity.CategoryStatus;
import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import com.example.demo.exception.BadRequestException;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.service.impl.CategoryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Category Service Unit Tests (STT 27 - 32)")
class CategoryServiceTest extends BaseUnitTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    private Category rootCategory;
    private Category subCategory;

    @BeforeEach
    void setUp() {
        rootCategory = Category.builder()
                .id(1L)
                .name("Điện thoại")
                .slug("dien-thoai")
                .status(CategoryStatus.ACTIVE)
                .sortOrder(1)
                .build();

        subCategory = Category.builder()
                .id(2L)
                .parent(rootCategory)
                .name("iPhone")
                .slug("iphone")
                .status(CategoryStatus.ACTIVE)
                .sortOrder(1)
                .build();
    }

    @Test
    @DisplayName("STT 27: getCategories should return list of active categories")
    void getCategories_success() {
        when(categoryRepository.findByStatusOrderBySortOrderAscNameAsc(CategoryStatus.ACTIVE))
                .thenReturn(List.of(rootCategory, subCategory));

        List<CategoryResponse> list = categoryService.getCategories(CategoryStatus.ACTIVE, false);

        assertNotNull(list);
        assertEquals(2, list.size());
    }

    @Test
    @DisplayName("STT 27: getCategories with null status should return all categories")
    void getCategories_allStatuses_success() {
        when(categoryRepository.findAllByOrderBySortOrderAscNameAsc())
                .thenReturn(List.of(rootCategory, subCategory));

        List<CategoryResponse> list = categoryService.getCategories(null, false);

        assertNotNull(list);
        assertEquals(2, list.size());
        verify(categoryRepository, times(1)).findAllByOrderBySortOrderAscNameAsc();
    }

    @Test
    @DisplayName("STT 28: getCategoryById should return category detail")
    void getCategoryById_success() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(rootCategory));

        CategoryResponse res = categoryService.getCategoryById(1L);

        assertNotNull(res);
        assertEquals("dien-thoai", res.getSlug());
    }

    @Test
    @DisplayName("STT 29: getCategoryProducts should return only ACTIVE non-deleted products")
    void getCategoryProducts_success() {
        Product product = Product.builder()
                .id(100L)
                .shopId(5L)
                .category(rootCategory)
                .name("iPhone 15 Pro Max")
                .slug("iphone-15-pro-max")
                .status(ProductStatus.ACTIVE)
                .build();

        Page<Product> page = new PageImpl<>(List.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(rootCategory));
        when(productRepository.findByCategoryIdAndStatusAndDeletedAtIsNull(eq(1L), eq(ProductStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<ProductSummaryResponse> result = categoryService.getCategoryProducts(1L, 0, 10, "createdAt", "desc");

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("iPhone 15 Pro Max", result.getContent().get(0).getName());
    }

    @Test
    @DisplayName("STT 30: createCategory should auto generate slug if not provided")
    void createCategory_autoSlug_success() {
        when(categoryRepository.existsBySlug("dong-ho-thong-minh")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> {
            Category c = inv.getArgument(0);
            c.setId(10L);
            return c;
        });

        CreateCategoryRequest request = CreateCategoryRequest.builder()
                .name("Đồng hồ thông minh")
                .build();

        CategoryResponse res = categoryService.createCategory(request);

        assertNotNull(res);
        assertEquals("dong-ho-thong-minh", res.getSlug());
    }

    @Test
    @DisplayName("STT 31: updateCategory should disallow setting category as own parent")
    void updateCategory_selfParent_throwsBadRequest() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(rootCategory));

        UpdateCategoryRequest request = UpdateCategoryRequest.builder()
                .parentId(1L)
                .build();

        assertThrows(BadRequestException.class, () -> categoryService.updateCategory(1L, request));
    }

    @Test
    @DisplayName("STT 32: deleteCategory without force should fail if has products")
    void deleteCategory_hasProducts_noForce_throwsBadRequest() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(rootCategory));
        when(productRepository.countByCategoryId(1L)).thenReturn(5L);

        assertThrows(BadRequestException.class, () -> categoryService.deleteCategory(1L, false));
    }

    @Test
    @DisplayName("STT 32: deleteCategory with force=true should deactivate category to INACTIVE")
    void deleteCategory_hasProducts_withForce_deactivates() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(rootCategory));
        when(productRepository.countByCategoryId(1L)).thenReturn(5L);

        categoryService.deleteCategory(1L, true);

        assertEquals(CategoryStatus.INACTIVE, rootCategory.getStatus());
        verify(categoryRepository, times(1)).save(rootCategory);
        verify(categoryRepository, never()).delete(any());
    }
}
