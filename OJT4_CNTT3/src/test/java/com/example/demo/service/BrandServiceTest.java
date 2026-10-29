package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.CreateBrandRequest;
import com.example.demo.dto.request.UpdateBrandRequest;
import com.example.demo.dto.response.BrandResponse;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.entity.Brand;
import com.example.demo.entity.BrandStatus;
import com.example.demo.entity.Product;
import com.example.demo.entity.ProductStatus;
import com.example.demo.exception.BadRequestException;
import com.example.demo.exception.ConflictException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.BrandRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.service.impl.BrandServiceImpl;
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

@DisplayName("Brand Service Unit Tests (STT 33 - 38)")
class BrandServiceTest extends BaseUnitTest {

    @Mock
    private BrandRepository brandRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private BrandServiceImpl brandService;

    private Brand appleBrand;
    private Brand samsungBrand;

    @BeforeEach
    void setUp() {
        appleBrand = Brand.builder()
                .id(1L)
                .name("Apple")
                .slug("apple")
                .logoUrl("https://logo.apple.com")
                .description("Apple Inc.")
                .status(BrandStatus.ACTIVE)
                .build();

        samsungBrand = Brand.builder()
                .id(2L)
                .name("Samsung")
                .slug("samsung")
                .status(BrandStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("STT 33: getBrands with null status should return all brands")
    void getBrands_all_success() {
        when(brandRepository.findAllByOrderByNameAsc()).thenReturn(List.of(appleBrand, samsungBrand));
        when(productRepository.countByBrandId(anyLong())).thenReturn(5L);

        List<BrandResponse> result = brandService.getBrands(null);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals("Apple", result.get(0).getName());
        verify(brandRepository, times(1)).findAllByOrderByNameAsc();
    }

    @Test
    @DisplayName("STT 33: getBrands with ACTIVE status should filter by status")
    void getBrands_active_success() {
        when(brandRepository.findByStatusOrderByNameAsc(BrandStatus.ACTIVE)).thenReturn(List.of(appleBrand));
        when(productRepository.countByBrandId(1L)).thenReturn(10L);

        List<BrandResponse> result = brandService.getBrands(BrandStatus.ACTIVE);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(brandRepository, times(1)).findByStatusOrderByNameAsc(BrandStatus.ACTIVE);
    }

    @Test
    @DisplayName("STT 34: getBrandById should return brand detail")
    void getBrandById_success() {
        when(brandRepository.findById(1L)).thenReturn(Optional.of(appleBrand));
        when(productRepository.countByBrandId(1L)).thenReturn(12L);

        BrandResponse res = brandService.getBrandById(1L);

        assertNotNull(res);
        assertEquals("Apple", res.getName());
        assertEquals(12L, res.getProductCount());
    }

    @Test
    @DisplayName("STT 34: getBrandById with invalid id should throw ResourceNotFoundException")
    void getBrandById_notFound() {
        when(brandRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> brandService.getBrandById(99L));
    }

    @Test
    @DisplayName("STT 35: getBrandProducts should return products of the brand")
    void getBrandProducts_success() {
        Product p = Product.builder().id(10L).name("iPhone 15").status(ProductStatus.ACTIVE).build();
        Page<Product> page = new PageImpl<>(List.of(p));

        when(brandRepository.findById(1L)).thenReturn(Optional.of(appleBrand));
        when(productRepository.findByBrandIdAndStatusAndDeletedAtIsNull(eq(1L), eq(ProductStatus.ACTIVE), any(Pageable.class)))
                .thenReturn(page);

        PageResponse<ProductSummaryResponse> result = brandService.getBrandProducts(1L, 0, 10, "createdAt", "desc");

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("iPhone 15", result.getContent().get(0).getName());
    }

    @Test
    @DisplayName("STT 36: createBrand should create brand with slug generation")
    void createBrand_success() {
        when(brandRepository.existsByName("Sony")).thenReturn(false);
        when(brandRepository.existsBySlug("sony")).thenReturn(false);
        when(brandRepository.save(any(Brand.class))).thenAnswer(inv -> {
            Brand b = inv.getArgument(0);
            b.setId(3L);
            return b;
        });

        CreateBrandRequest req = CreateBrandRequest.builder()
                .name("Sony")
                .description("Sony Audio")
                .build();

        BrandResponse res = brandService.createBrand(req);

        assertNotNull(res);
        assertEquals("Sony", res.getName());
        assertEquals("sony", res.getSlug());
    }

    @Test
    @DisplayName("STT 36: createBrand with existing name should throw ConflictException")
    void createBrand_duplicateName_throwsConflict() {
        when(brandRepository.existsByName("Apple")).thenReturn(true);

        CreateBrandRequest req = CreateBrandRequest.builder().name("Apple").build();

        assertThrows(ConflictException.class, () -> brandService.createBrand(req));
    }

    @Test
    @DisplayName("STT 37: updateBrand should update name and slug")
    void updateBrand_success() {
        when(brandRepository.findById(1L)).thenReturn(Optional.of(appleBrand));
        when(brandRepository.existsByNameAndIdNot("Apple Inc", 1L)).thenReturn(false);
        when(brandRepository.save(any(Brand.class))).thenAnswer(inv -> inv.getArgument(0));
        when(productRepository.countByBrandId(1L)).thenReturn(15L);

        UpdateBrandRequest req = UpdateBrandRequest.builder()
                .name("Apple Inc")
                .build();

        BrandResponse res = brandService.updateBrand(1L, req);

        assertNotNull(res);
        assertEquals("Apple Inc", res.getName());
    }

    @Test
    @DisplayName("STT 38: deleteBrand without force when having products should throw BadRequestException")
    void deleteBrand_hasProducts_noForce_throwsBadRequest() {
        when(brandRepository.findById(1L)).thenReturn(Optional.of(appleBrand));
        when(productRepository.countByBrandId(1L)).thenReturn(5L);

        assertThrows(BadRequestException.class, () -> brandService.deleteBrand(1L, false));
    }

    @Test
    @DisplayName("STT 38: deleteBrand with force=true should deactivate brand to INACTIVE")
    void deleteBrand_hasProducts_withForce_deactivates() {
        when(brandRepository.findById(1L)).thenReturn(Optional.of(appleBrand));
        when(productRepository.countByBrandId(1L)).thenReturn(5L);

        brandService.deleteBrand(1L, true);

        assertEquals(BrandStatus.INACTIVE, appleBrand.getStatus());
        verify(brandRepository, times(1)).save(appleBrand);
        verify(brandRepository, never()).delete(any());
    }

    @Test
    @DisplayName("STT 38: deleteBrand with 0 products should delete hard")
    void deleteBrand_noProducts_deletesHard() {
        when(brandRepository.findById(1L)).thenReturn(Optional.of(appleBrand));
        when(productRepository.countByBrandId(1L)).thenReturn(0L);

        brandService.deleteBrand(1L, false);

        verify(brandRepository, times(1)).delete(appleBrand);
    }
}
