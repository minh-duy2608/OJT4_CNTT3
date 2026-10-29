package com.example.demo.service.impl;

import com.example.demo.dto.request.ProductFilterCriteria;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ProductDetailResponse;
import com.example.demo.dto.response.ProductImageResponse;
import com.example.demo.dto.response.ProductSummaryResponse;
import com.example.demo.dto.response.ProductVariantResponse;
import com.example.demo.entity.Inventory;
import com.example.demo.entity.Product;
import com.example.demo.entity.ProductImage;
import com.example.demo.entity.ProductStatus;
import com.example.demo.entity.ProductVariant;
import com.example.demo.entity.ProductVariantStatus;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.InventoryRepository;
import com.example.demo.repository.ProductImageRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.ProductVariantRepository;
import com.example.demo.repository.ShopRepository;
import com.example.demo.service.ProductService;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;
    private final InventoryRepository inventoryRepository;
    private final ShopRepository shopRepository;
    private final com.example.demo.repository.CategoryRepository categoryRepository;
    private final com.example.demo.repository.BrandRepository brandRepository;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("id", "name", "createdAt", "updatedAt");

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> getProducts(ProductFilterCriteria criteria) {
        if (criteria == null) {
            criteria = ProductFilterCriteria.builder().build();
        }

        Specification<Product> spec = buildProductSpecification(criteria);

        String sortBy = ALLOWED_SORT_FIELDS.contains(criteria.getSortBy()) ? criteria.getSortBy() : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(criteria.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(0, criteria.getPage()), Math.max(1, criteria.getSize()), Sort.by(direction, sortBy));

        Page<Product> productPage = productRepository.findAll(spec, pageable);

        List<ProductSummaryResponse> content = productPage.getContent().stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());

        return PageResponse.<ProductSummaryResponse>builder()
                .content(content)
                .page(productPage.getNumber())
                .size(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .totalPages(productPage.getTotalPages())
                .first(productPage.isFirst())
                .last(productPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDetailResponse getProductById(Long productId) {
        Product product = productRepository.findByIdAndStatusAndDeletedAtIsNull(productId, ProductStatus.ACTIVE)
                .or(() -> productRepository.findByIdAndDeletedAtIsNull(productId))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId));

        List<ProductVariant> variantEntities = productVariantRepository.findByProductIdAndStatus(productId, ProductVariantStatus.ACTIVE);
        if (variantEntities.isEmpty()) {
            variantEntities = productVariantRepository.findByProductIdOrderByPriceAsc(productId);
        }
        List<Long> variantIds = variantEntities.stream().map(ProductVariant::getId).collect(Collectors.toList());

        Map<Long, Inventory> inventoryMap = inventoryRepository.findByVariantIdIn(variantIds).stream()
                .collect(Collectors.toMap(Inventory::getVariantId, inv -> inv, (a, b) -> a));

        List<ProductVariantResponse> variants = variantEntities.stream()
                .map(v -> {
                    Inventory inv = inventoryMap.get(v.getId());
                    int stock = inv != null ? inv.getQuantity() : 0;
                    int avail = inv != null ? inv.getAvailableQuantity() : 0;
                    return ProductVariantResponse.fromEntity(v, stock, avail);
                })
                .collect(Collectors.toList());

        List<ProductImageResponse> images = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId).stream()
                .map(ProductImageResponse::fromEntity)
                .collect(Collectors.toList());

        BigDecimal minPrice = null;
        BigDecimal maxPrice = null;
        for (ProductVariant v : variantEntities) {
            BigDecimal effective = v.getSalePrice() != null ? v.getSalePrice() : v.getPrice();
            if (minPrice == null || effective.compareTo(minPrice) < 0) minPrice = effective;
            if (maxPrice == null || effective.compareTo(maxPrice) > 0) maxPrice = effective;
        }

        return ProductDetailResponse.fromEntity(product, variants, images, minPrice, maxPrice);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductVariantResponse> getProductVariants(Long productId) {
        findActiveProductById(productId);

        List<ProductVariant> variants = productVariantRepository.findByProductIdAndStatus(productId, ProductVariantStatus.ACTIVE);
        List<Long> variantIds = variants.stream().map(ProductVariant::getId).collect(Collectors.toList());

        Map<Long, Inventory> inventoryMap = inventoryRepository.findByVariantIdIn(variantIds).stream()
                .collect(Collectors.toMap(Inventory::getVariantId, inv -> inv, (a, b) -> a));

        return variants.stream()
                .map(v -> {
                    Inventory inv = inventoryMap.get(v.getId());
                    int stock = inv != null ? inv.getQuantity() : 0;
                    int avail = inv != null ? inv.getAvailableQuantity() : 0;
                    return ProductVariantResponse.fromEntity(v, stock, avail);
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductImageResponse> getProductImages(Long productId) {
        findActiveProductById(productId);

        return productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId).stream()
                .map(ProductImageResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> searchProducts(ProductFilterCriteria criteria) {
        return getProducts(criteria);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> getShopProducts(Long shopId, ProductFilterCriteria criteria) {
        shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng với ID: " + shopId));

        if (criteria == null) {
            criteria = ProductFilterCriteria.builder().build();
        }
        criteria.setShopId(shopId);
        return getProducts(criteria);
    }

    private Product findActiveProductById(Long productId) {
        return productRepository.findByIdAndStatusAndDeletedAtIsNull(productId, ProductStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId));
    }

    private Specification<Product> buildProductSpecification(ProductFilterCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Chỉ lấy sản phẩm ACTIVE và chưa xóa mềm
            predicates.add(cb.equal(root.get("status"), ProductStatus.ACTIVE));
            predicates.add(cb.isNull(root.get("deletedAt")));

            // 2. Lọc theo từ khóa (keyword)
            if (criteria.getKeyword() != null && !criteria.getKeyword().isBlank()) {
                String kw = "%" + criteria.getKeyword().trim().toLowerCase() + "%";
                Predicate namePred = cb.like(cb.lower(root.get("name")), kw);
                Predicate slugPred = cb.like(cb.lower(root.get("slug")), kw);
                Predicate descPred = cb.like(cb.lower(root.get("shortDescription")), kw);
                predicates.add(cb.or(namePred, slugPred, descPred));
            }

            // 3. Lọc theo Danh mục (categoryId)
            if (criteria.getCategoryId() != null) {
                predicates.add(cb.equal(root.get("category").get("id"), criteria.getCategoryId()));
            }

            // 4. Lọc theo Thương hiệu (brandId)
            if (criteria.getBrandId() != null) {
                predicates.add(cb.equal(root.get("brandId"), criteria.getBrandId()));
            }

            // 5. Lọc theo Cửa hàng (shopId)
            if (criteria.getShopId() != null) {
                predicates.add(cb.equal(root.get("shopId"), criteria.getShopId()));
            }

            // 6. Lọc theo Khoảng giá (minPrice, maxPrice)
            if (criteria.getMinPrice() != null || criteria.getMaxPrice() != null) {
                Subquery<Long> priceSubquery = query.subquery(Long.class);
                Root<ProductVariant> variantRoot = priceSubquery.from(ProductVariant.class);
                priceSubquery.select(variantRoot.get("product").get("id"));

                List<Predicate> variantPreds = new ArrayList<>();
                variantPreds.add(cb.equal(variantRoot.get("product").get("id"), root.get("id")));
                variantPreds.add(cb.equal(variantRoot.get("status"), ProductVariantStatus.ACTIVE));

                Expression<BigDecimal> effectivePrice = cb.coalesce(variantRoot.get("salePrice"), variantRoot.get("price"));

                if (criteria.getMinPrice() != null) {
                    variantPreds.add(cb.greaterThanOrEqualTo(effectivePrice, criteria.getMinPrice()));
                }
                if (criteria.getMaxPrice() != null) {
                    variantPreds.add(cb.lessThanOrEqualTo(effectivePrice, criteria.getMaxPrice()));
                }

                priceSubquery.where(variantPreds.toArray(new Predicate[0]));
                predicates.add(cb.exists(priceSubquery));
            }

            // 7. Lọc theo Tình trạng tồn kho (inStock)
            if (Boolean.TRUE.equals(criteria.getInStock())) {
                Subquery<Long> stockSubquery = query.subquery(Long.class);
                Root<Inventory> invRoot = stockSubquery.from(Inventory.class);
                Root<ProductVariant> varRoot = stockSubquery.from(ProductVariant.class);
                stockSubquery.select(varRoot.get("product").get("id"));

                List<Predicate> stockPreds = new ArrayList<>();
                stockPreds.add(cb.equal(varRoot.get("product").get("id"), root.get("id")));
                stockPreds.add(cb.equal(invRoot.get("variantId"), varRoot.get("id")));
                stockPreds.add(cb.greaterThan(invRoot.get("quantity"), invRoot.get("reservedQuantity")));

                stockSubquery.where(stockPreds.toArray(new Predicate[0]));
                predicates.add(cb.exists(stockSubquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private ProductSummaryResponse toSummaryResponse(Product product) {
        List<ProductVariant> variants = productVariantRepository.findByProductIdAndStatus(product.getId(), ProductVariantStatus.ACTIVE);

        BigDecimal minPrice = null;
        BigDecimal maxPrice = null;
        for (ProductVariant v : variants) {
            BigDecimal effective = v.getSalePrice() != null ? v.getSalePrice() : v.getPrice();
            if (minPrice == null || effective.compareTo(minPrice) < 0) minPrice = effective;
            if (maxPrice == null || effective.compareTo(maxPrice) > 0) maxPrice = effective;
        }

        List<ProductImage> images = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(product.getId());
        String primaryImage = images.stream()
                .filter(ProductImage::isPrimary)
                .map(ProductImage::getImageUrl)
                .findFirst()
                .orElse(images.isEmpty() ? null : images.get(0).getImageUrl());

        return ProductSummaryResponse.fromEntity(product, minPrice, maxPrice, primaryImage);
    }

    @Override
    @Transactional
    public ProductDetailResponse createProduct(com.example.demo.dto.request.CreateProductRequest request) {
        com.example.demo.entity.Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục không tồn tại với ID: " + request.getCategoryId()));

        com.example.demo.entity.Brand brand = null;
        if (request.getBrandId() != null) {
            brand = brandRepository.findById(request.getBrandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Thương hiệu không tồn tại với ID: " + request.getBrandId()));
        }

        Long shopId = request.getShopId();
        if (shopId == null) {
            com.example.demo.entity.Shop defaultShop = shopRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng nào trong hệ thống"));
            shopId = defaultShop.getId();
        }

        String slug = request.getSlug();
        if (slug == null || slug.isBlank()) {
            slug = toSlug(request.getName());
        }

        String uniqueSlug = slug;
        int counter = 1;
        while (productRepository.existsByShopIdAndSlug(shopId, uniqueSlug)) {
            uniqueSlug = slug + "-" + counter++;
        }

        Product product = Product.builder()
                .name(request.getName())
                .slug(uniqueSlug)
                .category(category)
                .brand(brand)
                .brandId(brand != null ? brand.getId() : null)
                .shopId(shopId)
                .shortDescription(request.getShortDescription())
                .description(request.getDescription())
                .warrantyMonths(request.getWarrantyMonths())
                .status(request.getStatus() != null ? request.getStatus() : ProductStatus.ACTIVE)
                .build();

        Product savedProduct = productRepository.save(product);

        // Process Variants
        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            for (com.example.demo.dto.request.CreateProductVariantRequest vReq : request.getVariants()) {
                String sku = vReq.getSku();
                if (sku == null || sku.isBlank()) {
                    sku = "SKU-" + savedProduct.getId() + "-" + (System.currentTimeMillis() % 100000) + "-" + (int)(Math.random() * 1000);
                }

                String attributesJson = vReq.getAttributes();
                if (attributesJson == null && (vReq.getColor() != null || vReq.getStorage() != null)) {
                    attributesJson = String.format("{\"color\":\"%s\",\"storage\":\"%s\"}",
                            vReq.getColor() != null ? vReq.getColor() : "",
                            vReq.getStorage() != null ? vReq.getStorage() : "");
                }

                ProductVariant variant = ProductVariant.builder()
                        .product(savedProduct)
                        .variantName(vReq.getVariantName())
                        .sku(sku)
                        .price(vReq.getPrice())
                        .salePrice(vReq.getSalePrice())
                        .weightGrams(vReq.getWeightGrams())
                        .attributes(attributesJson)
                        .status(vReq.getStatus() != null ? vReq.getStatus() : ProductVariantStatus.ACTIVE)
                        .build();

                ProductVariant savedVariant = productVariantRepository.save(variant);

                int qty = vReq.getStockQuantity() != null ? vReq.getStockQuantity() : 100;
                Inventory inventory = Inventory.builder()
                        .variantId(savedVariant.getId())
                        .quantity(qty)
                        .reservedQuantity(0)
                        .build();
                inventoryRepository.save(inventory);
            }
        } else {
            String defaultSku = "SKU-" + savedProduct.getId() + "-STD";
            ProductVariant defaultVariant = ProductVariant.builder()
                    .product(savedProduct)
                    .variantName(savedProduct.getName() + " - Tiêu chuẩn")
                    .sku(defaultSku)
                    .price(BigDecimal.valueOf(1000000))
                    .status(ProductVariantStatus.ACTIVE)
                    .build();
            ProductVariant savedVariant = productVariantRepository.save(defaultVariant);
            inventoryRepository.save(Inventory.builder()
                    .variantId(savedVariant.getId())
                    .quantity(100)
                    .reservedQuantity(0)
                    .build());
        }

        // Process Images
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            boolean hasPrimary = false;
            for (int i = 0; i < request.getImages().size(); i++) {
                com.example.demo.dto.request.CreateProductImageRequest imgReq = request.getImages().get(i);
                boolean isPrimary = Boolean.TRUE.equals(imgReq.getIsPrimary()) || (!hasPrimary && i == 0);
                if (isPrimary) hasPrimary = true;

                ProductImage img = ProductImage.builder()
                        .product(savedProduct)
                        .imageUrl(imgReq.getImageUrl())
                        .altText(imgReq.getAltText() != null ? imgReq.getAltText() : savedProduct.getName())
                        .isPrimary(isPrimary)
                        .sortOrder(imgReq.getSortOrder() != null ? imgReq.getSortOrder() : i)
                        .build();
                productImageRepository.save(img);
            }
        }

        return getProductById(savedProduct.getId());
    }

    @Override
    @Transactional
    public ProductDetailResponse updateProduct(Long productId, com.example.demo.dto.request.UpdateProductRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId));

        if (request.getName() != null && !request.getName().isBlank()) {
            product.setName(request.getName());
        }

        if (request.getSlug() != null && !request.getSlug().isBlank()) {
            product.setSlug(request.getSlug());
        }

        if (request.getCategoryId() != null) {
            com.example.demo.entity.Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Danh mục không tồn tại: " + request.getCategoryId()));
            product.setCategory(category);
        }

        if (request.getBrandId() != null) {
            com.example.demo.entity.Brand brand = brandRepository.findById(request.getBrandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Thương hiệu không tồn tại: " + request.getBrandId()));
            product.setBrand(brand);
            product.setBrandId(brand.getId());
        }

        if (request.getShortDescription() != null) {
            product.setShortDescription(request.getShortDescription());
        }

        if (request.getDescription() != null) {
            product.setDescription(request.getDescription());
        }

        if (request.getWarrantyMonths() != null) {
            product.setWarrantyMonths(request.getWarrantyMonths());
        }

        if (request.getStatus() != null) {
            product.setStatus(request.getStatus());
        }

        Product savedProduct = productRepository.save(product);

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            List<ProductVariant> existingVariants = productVariantRepository.findByProductIdOrderByPriceAsc(productId);
            for (ProductVariant ev : existingVariants) {
                inventoryRepository.deleteById(ev.getId());
                productVariantRepository.delete(ev);
            }

            for (com.example.demo.dto.request.CreateProductVariantRequest vReq : request.getVariants()) {
                String sku = vReq.getSku();
                if (sku == null || sku.isBlank()) {
                    sku = "SKU-" + savedProduct.getId() + "-" + (System.currentTimeMillis() % 100000) + "-" + (int)(Math.random() * 1000);
                }

                String attributesJson = vReq.getAttributes();
                if (attributesJson == null && (vReq.getColor() != null || vReq.getStorage() != null)) {
                    attributesJson = String.format("{\"color\":\"%s\",\"storage\":\"%s\"}",
                            vReq.getColor() != null ? vReq.getColor() : "",
                            vReq.getStorage() != null ? vReq.getStorage() : "");
                }

                ProductVariant variant = ProductVariant.builder()
                        .product(savedProduct)
                        .variantName(vReq.getVariantName())
                        .sku(sku)
                        .price(vReq.getPrice())
                        .salePrice(vReq.getSalePrice())
                        .weightGrams(vReq.getWeightGrams())
                        .attributes(attributesJson)
                        .status(vReq.getStatus() != null ? vReq.getStatus() : ProductVariantStatus.ACTIVE)
                        .build();

                ProductVariant savedVariant = productVariantRepository.save(variant);

                int qty = vReq.getStockQuantity() != null ? vReq.getStockQuantity() : 100;
                inventoryRepository.save(Inventory.builder()
                        .variantId(savedVariant.getId())
                        .quantity(qty)
                        .reservedQuantity(0)
                        .build());
            }
        }

        if (request.getImages() != null) {
            List<ProductImage> oldImages = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId);
            productImageRepository.deleteAll(oldImages);

            boolean hasPrimary = false;
            for (int i = 0; i < request.getImages().size(); i++) {
                com.example.demo.dto.request.CreateProductImageRequest imgReq = request.getImages().get(i);
                boolean isPrimary = Boolean.TRUE.equals(imgReq.getIsPrimary()) || (!hasPrimary && i == 0);
                if (isPrimary) hasPrimary = true;

                ProductImage img = ProductImage.builder()
                        .product(savedProduct)
                        .imageUrl(imgReq.getImageUrl())
                        .altText(imgReq.getAltText() != null ? imgReq.getAltText() : savedProduct.getName())
                        .isPrimary(isPrimary)
                        .sortOrder(imgReq.getSortOrder() != null ? imgReq.getSortOrder() : i)
                        .build();
                productImageRepository.save(img);
            }
        }

        return getProductById(productId);
    }

    @Override
    @Transactional
    public void deleteProduct(Long productId, boolean force) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId));

        if (!force) {
            product.setStatus(ProductStatus.INACTIVE);
            product.setDeletedAt(java.time.LocalDateTime.now());
            productRepository.save(product);
            log.info("Soft-deactivated product #{}", productId);
        } else {
            List<ProductVariant> variants = productVariantRepository.findByProductIdOrderByPriceAsc(productId);
            for (ProductVariant v : variants) {
                inventoryRepository.deleteById(v.getId());
                productVariantRepository.delete(v);
            }
            List<ProductImage> images = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId);
            productImageRepository.deleteAll(images);
            productRepository.delete(product);
            log.info("Permanently deleted product #{}", productId);
        }
    }

    private String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "product-" + System.currentTimeMillis();
        }
        String normalized = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        String slug = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .replaceAll("đ", "d")
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        return slug.isBlank() ? "product-" + System.currentTimeMillis() : slug;
    }
}

