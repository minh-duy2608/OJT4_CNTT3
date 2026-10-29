package com.example.demo.service;

import com.example.demo.common.BaseUnitTest;
import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductDetailResponse;
import com.example.demo.dto.response.ProductImageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.dto.response.ProductVariantResponse;
import com.example.demo.entity.Category;
import com.example.demo.entity.Inventory;
import com.example.demo.entity.Product;
import com.example.demo.entity.ProductImage;
import com.example.demo.entity.ProductStatus;
import com.example.demo.entity.ProductVariant;
import com.example.demo.entity.ProductVariantStatus;
import com.example.demo.entity.Shop;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.InventoryRepository;
import com.example.demo.repository.ProductImageRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ProductVariantRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.service.impl.ProductServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Product Service Unit Tests (STT 39 - 44)")
class ProductServiceTest extends BaseUnitTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductVariantRepository productVariantRepository;

    @Mock
    private ProductImageRepository productImageRepository;

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private com.example.demo.repository.CategoryRepository categoryRepository;

    @Mock
    private com.example.demo.repository.BrandRepository brandRepository;

    @InjectMocks
    private ProductServiceImpl productService;

    private Product product1;
    private ProductVariant variant1;
    private ProductImage image1;
    private Inventory inventory1;

    @BeforeEach
    void setUp() {
        Category category = Category.builder().id(1L).name("Điện thoại").slug("dien-thoai").build();

        product1 = Product.builder()
                .id(100L)
                .shopId(1L)
                .category(category)
                .name("iPhone 15 Pro Max")
                .slug("iphone-15-pro-max")
                .shortDescription("Flagship Apple")
                .status(ProductStatus.ACTIVE)
                .build();

        variant1 = ProductVariant.builder()
                .id(200L)
                .product(product1)
                .sku("IP15PM-256")
                .variantName("Titan Tự Nhiên 256GB")
                .price(new BigDecimal("29990000"))
                .salePrice(new BigDecimal("28490000"))
                .status(ProductVariantStatus.ACTIVE)
                .build();

        image1 = ProductImage.builder()
                .id(300L)
                .product(product1)
                .imageUrl("https://image.apple.com/iphone15.jpg")
                .isPrimary(true)
                .sortOrder(0)
                .build();

        inventory1 = Inventory.builder()
                .variantId(200L)
                .quantity(50)
                .reservedQuantity(5)
                .build();
    }

    @Test
    @DisplayName("STT 39: getProducts should return paged product summary list")
    void getProducts_success() {
        Page<Product> page = new PageImpl<>(List.of(product1));
        when(productRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(productVariantRepository.findByProductIdAndStatus(100L, ProductVariantStatus.ACTIVE))
                .thenReturn(List.of(variant1));
        when(productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(100L))
                .thenReturn(List.of(image1));

        ProductFilterCriteria criteria = ProductFilterCriteria.builder()
                .keyword("iphone")
                .page(0)
                .size(10)
                .build();

        PageResponse<ProductSummaryResponse> response = productService.getProducts(criteria);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        ProductSummaryResponse item = response.getContent().get(0);
        assertEquals("iPhone 15 Pro Max", item.getName());
        assertEquals(new BigDecimal("28490000"), item.getMinPrice());
    }

    @Test
    @DisplayName("STT 40: getProductById should return full detail including variants and images")
    void getProductById_success() {
        when(productRepository.findByIdAndStatusAndDeletedAtIsNull(100L, ProductStatus.ACTIVE))
                .thenReturn(Optional.of(product1));
        when(productVariantRepository.findByProductIdAndStatus(100L, ProductVariantStatus.ACTIVE))
                .thenReturn(List.of(variant1));
        when(inventoryRepository.findByVariantIdIn(anyList()))
                .thenReturn(List.of(inventory1));
        when(productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(100L))
                .thenReturn(List.of(image1));

        ProductDetailResponse res = productService.getProductById(100L);

        assertNotNull(res);
        assertEquals(100L, res.getId());
        assertEquals(1, res.getVariants().size());
        assertEquals(1, res.getImages().size());
        assertEquals(45, res.getVariants().get(0).getAvailableQuantity());
    }

    @Test
    @DisplayName("STT 40: getProductById with non-existent id should throw ResourceNotFoundException")
    void getProductById_notFound() {
        when(productRepository.findByIdAndStatusAndDeletedAtIsNull(999L, ProductStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductById(999L));
    }

    @Test
    @DisplayName("STT 41: getProductVariants should return variants with stock info")
    void getProductVariants_success() {
        when(productRepository.findByIdAndStatusAndDeletedAtIsNull(100L, ProductStatus.ACTIVE))
                .thenReturn(Optional.of(product1));
        when(productVariantRepository.findByProductIdAndStatus(100L, ProductVariantStatus.ACTIVE))
                .thenReturn(List.of(variant1));
        when(inventoryRepository.findByVariantIdIn(anyList()))
                .thenReturn(List.of(inventory1));

        List<ProductVariantResponse> variants = productService.getProductVariants(100L);

        assertNotNull(variants);
        assertEquals(1, variants.size());
        assertEquals("IP15PM-256", variants.get(0).getSku());
        assertEquals(50, variants.get(0).getStockQuantity());
        assertEquals(45, variants.get(0).getAvailableQuantity());
    }

    @Test
    @DisplayName("STT 42: getProductImages should return images ordered by sortOrder")
    void getProductImages_success() {
        when(productRepository.findByIdAndStatusAndDeletedAtIsNull(100L, ProductStatus.ACTIVE))
                .thenReturn(Optional.of(product1));
        when(productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(100L))
                .thenReturn(List.of(image1));

        List<ProductImageResponse> images = productService.getProductImages(100L);

        assertNotNull(images);
        assertEquals(1, images.size());
        assertTrue(images.get(0).isPrimary());
    }

    @Test
    @DisplayName("STT 43: searchProducts should delegate to getProducts with search criteria")
    void searchProducts_success() {
        Page<Product> page = new PageImpl<>(List.of(product1));
        when(productRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(productVariantRepository.findByProductIdAndStatus(100L, ProductVariantStatus.ACTIVE))
                .thenReturn(List.of(variant1));
        when(productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(100L))
                .thenReturn(List.of(image1));

        ProductFilterCriteria criteria = ProductFilterCriteria.builder().keyword("Apple").build();
        PageResponse<ProductSummaryResponse> response = productService.searchProducts(criteria);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
    }

    @Test
    @DisplayName("STT 44: getShopProducts should filter products by shopId")
    void getShopProducts_success() {
        when(shopRepository.findById(1L)).thenReturn(Optional.of(Shop.builder().id(1L).name("Cyber Store").build()));
        Page<Product> page = new PageImpl<>(List.of(product1));
        when(productRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(productVariantRepository.findByProductIdAndStatus(100L, ProductVariantStatus.ACTIVE))
                .thenReturn(List.of(variant1));
        when(productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(100L))
                .thenReturn(List.of(image1));

        PageResponse<ProductSummaryResponse> response = productService.getShopProducts(1L, null);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
    }

    @Test
    @DisplayName("STT 44: getShopProducts with non-existent shop should throw ResourceNotFoundException")
    void getShopProducts_shopNotFound() {
        when(shopRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getShopProducts(999L, null));
    }

    @Test
    @DisplayName("Admin: createProduct should save product, variants and images")
    void createProduct_success() {
        Category cat = Category.builder().id(1L).name("Điện thoại").build();
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(cat));
        when(shopRepository.findAll()).thenReturn(List.of(Shop.builder().id(1L).name("Cyber Store").build()));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product p = invocation.getArgument(0);
            p.setId(101L);
            return p;
        });
        when(productVariantRepository.save(any(ProductVariant.class))).thenAnswer(invocation -> {
            ProductVariant v = invocation.getArgument(0);
            v.setId(201L);
            return v;
        });
        when(productRepository.findByIdAndStatusAndDeletedAtIsNull(101L, ProductStatus.ACTIVE)).thenReturn(Optional.of(product1));
        when(productVariantRepository.findByProductIdAndStatus(101L, ProductVariantStatus.ACTIVE)).thenReturn(List.of(variant1));
        when(productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(101L)).thenReturn(List.of(image1));

        com.example.demo.dto.request.CreateProductRequest req = com.example.demo.dto.request.CreateProductRequest.builder()
                .name("MacBook Pro M3")
                .categoryId(1L)
                .variants(List.of(
                        com.example.demo.dto.request.CreateProductVariantRequest.builder()
                                .variantName("M3 16GB 512GB")
                                .sku("MBP-M3-16-512")
                                .price(new BigDecimal("45000000"))
                                .build()
                ))
                .images(List.of(
                        com.example.demo.dto.request.CreateProductImageRequest.builder()
                                .imageUrl("https://image.apple.com/mbp.jpg")
                                .isPrimary(true)
                                .build()
                ))
                .build();

        ProductDetailResponse response = productService.createProduct(req);

        assertNotNull(response);
        verify(productRepository, times(1)).save(any(Product.class));
        verify(productVariantRepository, times(1)).save(any(ProductVariant.class));
        verify(inventoryRepository, times(1)).save(any(Inventory.class));
        verify(productImageRepository, times(1)).save(any(ProductImage.class));
    }

    @Test
    @DisplayName("Admin: deleteProduct with force=false should soft-delete product")
    void deleteProduct_softDelete() {
        when(productRepository.findById(100L)).thenReturn(Optional.of(product1));

        productService.deleteProduct(100L, false);

        assertEquals(ProductStatus.INACTIVE, product1.getStatus());
        assertNotNull(product1.getDeletedAt());
        verify(productRepository, times(1)).save(product1);
    }
}

