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
import com.example.demo.entity.Shop;
import com.example.demo.entity.ShopStatus;
import com.example.demo.exception.BadRequestException;
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
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private static final String SHOP_NOT_FOUND_PREFIX = "Không tìm thấy cửa hàng với ID: ";
    private static final String PRODUCT_NOT_FOUND_ID_PREFIX = "Không tìm thấy sản phẩm với ID: ";
    private static final String PRODUCT_NOT_FOUND_PREFIX = "Không tìm thấy sản phẩm #";
    private static final String BELONGS_TO_SHOP_PREFIX = " thuộc cửa hàng #";
    private static final String BELONGS_TO_PRODUCT_PREFIX = " thuộc sản phẩm #";
    private static final String SORT_BY_CREATED_AT = "createdAt";
    private static final String STATUS_FIELD = "status";
    private static final String ENTITY_TYPE_PRODUCT = "product";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;
    private final InventoryRepository inventoryRepository;
    private final ShopRepository shopRepository;
    private final com.example.demo.repository.UserRepository userRepository;
    private final com.example.demo.repository.CategoryRepository categoryRepository;
    private final com.example.demo.repository.BrandRepository brandRepository;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("id", "name", SORT_BY_CREATED_AT, "updatedAt");

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> getProducts(ProductFilterCriteria criteria) {
        return executeProductQuery(criteria);
    }

    private PageResponse<ProductSummaryResponse> executeProductQuery(ProductFilterCriteria criteria) {
        ProductFilterCriteria filter = criteria != null ? criteria : ProductFilterCriteria.builder().build();
        Specification<Product> spec = buildProductSpecification(filter);

        String sortBy = ALLOWED_SORT_FIELDS.contains(filter.getSortBy()) ? filter.getSortBy() : SORT_BY_CREATED_AT;
        Sort.Direction direction = "asc".equalsIgnoreCase(filter.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(0, filter.getPage()), Math.max(1, filter.getSize()), Sort.by(direction, sortBy));

        Page<Product> productPage = productRepository.findAll(spec, pageable);

        List<ProductSummaryResponse> content = productPage.getContent().stream()
                .map(this::toSummaryResponse)
                .toList();

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
    public List<ProductSummaryResponse> getTop5Bestsellers() {
        List<Product> products = productRepository.findTop5Bestsellers();
        return products.stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDetailResponse getProductById(Long productId) {
        return findProductDetailById(productId);
    }

    private ProductDetailResponse findProductDetailById(Long productId) {
        Product product = productRepository.findByIdAndStatusAndDeletedAtIsNull(productId, ProductStatus.ACTIVE)
                .or(() -> productRepository.findByIdAndDeletedAtIsNull(productId))
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_ID_PREFIX + productId));

        List<ProductVariant> variantEntities = productVariantRepository.findByProductIdAndStatus(productId, ProductVariantStatus.ACTIVE);
        if (variantEntities.isEmpty()) {
            variantEntities = productVariantRepository.findByProductIdOrderByPriceAsc(productId);
        }
        List<Long> variantIds = variantEntities.stream().map(ProductVariant::getId).toList();

        Map<Long, Inventory> inventoryMap = inventoryRepository.findByVariantIdIn(variantIds).stream()
                .collect(Collectors.toMap(Inventory::getVariantId, inv -> inv, (a, b) -> a));

        List<ProductVariantResponse> variants = variantEntities.stream()
                .map(v -> {
                    Inventory inv = inventoryMap.get(v.getId());
                    int stock = inv != null ? inv.getQuantity() : 0;
                    int avail = inv != null ? inv.getAvailableQuantity() : 0;
                    return ProductVariantResponse.fromEntity(v, stock, avail);
                })
                .toList();

        List<ProductImageResponse> images = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId).stream()
                .map(ProductImageResponse::fromEntity)
                .toList();

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
        List<Long> variantIds = variants.stream().map(ProductVariant::getId).toList();

        Map<Long, Inventory> inventoryMap = inventoryRepository.findByVariantIdIn(variantIds).stream()
                .collect(Collectors.toMap(Inventory::getVariantId, inv -> inv, (a, b) -> a));

        return variants.stream()
                .map(v -> {
                    Inventory inv = inventoryMap.get(v.getId());
                    int stock = inv != null ? inv.getQuantity() : 0;
                    int avail = inv != null ? inv.getAvailableQuantity() : 0;
                    return ProductVariantResponse.fromEntity(v, stock, avail);
                })
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductImageResponse> getProductImages(Long productId) {
        findActiveProductById(productId);

        return productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId).stream()
                .map(ProductImageResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> searchProducts(ProductFilterCriteria criteria) {
        return executeProductQuery(criteria);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> getShopProducts(Long shopId, ProductFilterCriteria criteria) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(SHOP_NOT_FOUND_PREFIX + shopId));

        ProductFilterCriteria filter = criteria != null ? criteria : ProductFilterCriteria.builder().build();
        filter.setShopId(shop.getId());
        return executeProductQuery(filter);
    }

    private Product findActiveProductById(Long productId) {
        return productRepository.findByIdAndStatusAndDeletedAtIsNull(productId, ProductStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_ID_PREFIX + productId));
    }

    private Specification<Product> buildProductSpecification(ProductFilterCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Chỉ lấy sản phẩm ACTIVE và chưa xóa mềm
            predicates.add(cb.equal(root.get(STATUS_FIELD), ProductStatus.ACTIVE));
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

            addPriceFilter(criteria, root, query, cb, predicates);
            addStockFilter(criteria, root, query, cb, predicates);

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private void addPriceFilter(ProductFilterCriteria criteria, Root<Product> root, jakarta.persistence.criteria.CriteriaQuery<?> query, jakarta.persistence.criteria.CriteriaBuilder cb, List<Predicate> predicates) {
        if (criteria.getMinPrice() != null || criteria.getMaxPrice() != null) {
            Subquery<Long> priceSubquery = query.subquery(Long.class);
            Root<ProductVariant> variantRoot = priceSubquery.from(ProductVariant.class);
            priceSubquery.select(variantRoot.get(ENTITY_TYPE_PRODUCT).get("id"));

            List<Predicate> variantPreds = new ArrayList<>();
            variantPreds.add(cb.equal(variantRoot.get(ENTITY_TYPE_PRODUCT).get("id"), root.get("id")));
            variantPreds.add(cb.equal(variantRoot.get(STATUS_FIELD), ProductVariantStatus.ACTIVE));

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
    }

    private void addStockFilter(ProductFilterCriteria criteria, Root<Product> root, jakarta.persistence.criteria.CriteriaQuery<?> query, jakarta.persistence.criteria.CriteriaBuilder cb, List<Predicate> predicates) {
        if (Boolean.TRUE.equals(criteria.getInStock())) {
            Subquery<Long> stockSubquery = query.subquery(Long.class);
            Root<Inventory> invRoot = stockSubquery.from(Inventory.class);
            Root<ProductVariant> varRoot = stockSubquery.from(ProductVariant.class);
            stockSubquery.select(varRoot.get(ENTITY_TYPE_PRODUCT).get("id"));

            List<Predicate> stockPreds = new ArrayList<>();
            stockPreds.add(cb.equal(varRoot.get(ENTITY_TYPE_PRODUCT).get("id"), root.get("id")));
            stockPreds.add(cb.equal(invRoot.get("variantId"), varRoot.get("id")));
            stockPreds.add(cb.greaterThan(invRoot.get("quantity"), invRoot.get("reservedQuantity")));

            stockSubquery.where(stockPreds.toArray(new Predicate[0]));
            predicates.add(cb.exists(stockSubquery));
        }
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

        List<Long> varIds = variants.stream().map(ProductVariant::getId).collect(Collectors.toList());
        Map<Long, Inventory> invMap = varIds.isEmpty() ? Collections.emptyMap() :
                inventoryRepository.findByVariantIdIn(varIds).stream()
                        .collect(Collectors.toMap(Inventory::getVariantId, i -> i, (a, b) -> a));

        int totalStock = variants.stream()
                .mapToInt(v -> {
                    Inventory inv = invMap.get(v.getId());
                    return inv != null ? inv.getAvailableQuantity() : 0;
                }).sum();

        boolean inStock = product.getStatus() == ProductStatus.ACTIVE && !variants.isEmpty() &&
                variants.stream().anyMatch(v -> {
                    Inventory inv = invMap.get(v.getId());
                    return inv != null && inv.getAvailableQuantity() > 0;
                });

        return ProductSummaryResponse.fromEntity(product, minPrice, maxPrice, primaryImage, inStock, totalStock);
    }

    @Override
    @Transactional
    public ProductDetailResponse createProduct(com.example.demo.dto.request.CreateProductRequest request) {
        return doCreateProduct(request);
    }

    private ProductDetailResponse doCreateProduct(com.example.demo.dto.request.CreateProductRequest request) {
        com.example.demo.entity.Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Danh mục không tồn tại với ID: " + request.getCategoryId()));

        com.example.demo.entity.Brand brand = null;
        if (request.getBrandId() != null) {
            brand = brandRepository.findById(request.getBrandId())
                    .orElseThrow(() -> new ResourceNotFoundException("Thương hiệu không tồn tại với ID: " + request.getBrandId()));
        }

        Long reqShopId = request.getShopId();
        if (reqShopId == null) {
            com.example.demo.entity.Shop defaultShop = shopRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng nào trong hệ thống"));
            reqShopId = defaultShop.getId();
        }
        final Long shopId = reqShopId;

        com.example.demo.entity.Shop targetShop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException(SHOP_NOT_FOUND_PREFIX + shopId));
        if (targetShop.getStatus() != ShopStatus.ACTIVE) {
            throw new BadRequestException("Cửa hàng '" + targetShop.getName() + "' đang ở trạng thái " + targetShop.getStatus() + ", không thể đăng bán sản phẩm mới.");
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
        saveCreatedVariants(savedProduct, request.getVariants());
        saveCreatedImages(savedProduct, request.getImages());

        return findProductDetailById(savedProduct.getId());
    }

    private String resolveVariantAttributesJson(com.example.demo.dto.request.CreateProductVariantRequest vReq) {
        String attributesJson = vReq.getAttributes();
        if (attributesJson == null && (vReq.getColor() != null || vReq.getStorage() != null)) {
            String color = vReq.getColor() != null ? vReq.getColor() : "";
            String storage = vReq.getStorage() != null ? vReq.getStorage() : "";
            return String.format("{\"color\":\"%s\",\"storage\":\"%s\"}", color, storage);
        }
        return attributesJson;
    }

    private String generateVariantSku(Long productId, String requestedSku) {
        if (requestedSku != null && !requestedSku.isBlank()) {
            return requestedSku.trim();
        }
        return "SKU-" + productId + "-" + (System.currentTimeMillis() % 100000) + "-" + (100 + SECURE_RANDOM.nextInt(900));
    }

    private void createSingleVariant(Product savedProduct, com.example.demo.dto.request.CreateProductVariantRequest vReq) {
        String sku = generateVariantSku(savedProduct.getId(), vReq.getSku());
        String attributesJson = resolveVariantAttributesJson(vReq);

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

    private void createDefaultVariant(Product savedProduct) {
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

    private void saveCreatedVariants(Product savedProduct, List<com.example.demo.dto.request.CreateProductVariantRequest> variants) {
        if (variants != null && !variants.isEmpty()) {
            for (com.example.demo.dto.request.CreateProductVariantRequest vReq : variants) {
                createSingleVariant(savedProduct, vReq);
            }
        } else {
            createDefaultVariant(savedProduct);
        }
    }

    private void saveCreatedImages(Product savedProduct, List<com.example.demo.dto.request.CreateProductImageRequest> images) {
        if (images != null && !images.isEmpty()) {
            boolean hasPrimary = false;
            for (int i = 0; i < images.size(); i++) {
                com.example.demo.dto.request.CreateProductImageRequest imgReq = images.get(i);
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
    }

    @Override
    @Transactional
    public ProductDetailResponse updateProduct(Long productId, com.example.demo.dto.request.UpdateProductRequest request) {
        return doUpdateProduct(productId, request);
    }

    private ProductDetailResponse doUpdateProduct(Long productId, com.example.demo.dto.request.UpdateProductRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_ID_PREFIX + productId));

        updateProductBasicFields(product, request);
        Product savedProduct = productRepository.save(product);

        if (request.getVariants() != null && !request.getVariants().isEmpty()) {
            updateProductVariants(savedProduct, request.getVariants());
        }

        if (request.getImages() != null) {
            updateProductImages(savedProduct, request.getImages());
        }

        return findProductDetailById(productId);
    }

    private void updateProductBasicFields(Product product, com.example.demo.dto.request.UpdateProductRequest request) {
        if (request.getName() != null && !request.getName().isBlank()) {
            product.setName(request.getName().trim());
        }
        updateProductSlug(product, request);
        updateCategoryAndBrand(product, request);

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
    }

    private void updateProductSlug(Product product, com.example.demo.dto.request.UpdateProductRequest request) {
        String baseSlug = null;
        if (request.getSlug() != null && !request.getSlug().isBlank()) {
            baseSlug = request.getSlug().trim();
        } else if (request.getName() != null && !request.getName().isBlank()) {
            baseSlug = toSlug(request.getName());
        }

        if (baseSlug != null) {
            String uniqueSlug = baseSlug;
            int counter = 1;
            while (productRepository.existsByShopIdAndSlugAndIdNot(product.getShopId(), uniqueSlug, product.getId())) {
                uniqueSlug = baseSlug + "-" + counter++;
            }
            product.setSlug(uniqueSlug);
        }
    }

    private void updateCategoryAndBrand(Product product, com.example.demo.dto.request.UpdateProductRequest request) {
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
    }

    private ProductVariant findMatchingVariant(
            com.example.demo.dto.request.CreateProductVariantRequest vReq,
            int index,
            Map<Long, ProductVariant> existingById,
            Map<String, ProductVariant> existingBySku,
            List<ProductVariant> existingVariants
    ) {
        if (vReq.getId() != null && existingById.containsKey(vReq.getId())) {
            return existingById.get(vReq.getId());
        }
        if (vReq.getSku() != null && !vReq.getSku().isBlank() && existingBySku.containsKey(vReq.getSku().trim())) {
            return existingBySku.get(vReq.getSku().trim());
        }
        if (index < existingVariants.size() && vReq.getId() == null && (vReq.getSku() == null || vReq.getSku().isBlank())) {
            return existingVariants.get(index);
        }
        return null;
    }

    private void updateExistingVariantSku(
            Long productId,
            ProductVariant variant,
            String requestedSku,
            int index,
            Set<String> usedSkusInBatch
    ) {
        if (requestedSku != null && !requestedSku.isBlank()) {
            String newSku = requestedSku.trim();
            if (!newSku.equals(variant.getSku())) {
                if (!productVariantRepository.existsBySkuAndIdNot(newSku, variant.getId()) && !usedSkusInBatch.contains(newSku)) {
                    variant.setSku(newSku);
                    usedSkusInBatch.add(newSku);
                } else {
                    String fallbackSku = "SKU-" + productId + "-" + System.currentTimeMillis() + "-" + (index + 1);
                    variant.setSku(fallbackSku);
                    usedSkusInBatch.add(fallbackSku);
                }
            } else {
                usedSkusInBatch.add(variant.getSku());
            }
        } else if (variant.getSku() != null) {
            usedSkusInBatch.add(variant.getSku());
        }
    }

    private void updateVariantInventory(Long variantId, int qty) {
        inventoryRepository.findById(variantId).ifPresentOrElse(inv -> {
            inv.setQuantity(qty);
            inventoryRepository.save(inv);
        }, () -> inventoryRepository.save(Inventory.builder()
                .variantId(variantId)
                .quantity(qty)
                .reservedQuantity(0)
                .build()));
    }

    private void updateExistingVariant(
            Product savedProduct,
            ProductVariant variant,
            com.example.demo.dto.request.CreateProductVariantRequest vReq,
            int index,
            Set<String> usedSkusInBatch,
            String attributesJson
    ) {
        variant.setVariantName(vReq.getVariantName());
        variant.setPrice(vReq.getPrice());
        variant.setSalePrice(vReq.getSalePrice());
        variant.setWeightGrams(vReq.getWeightGrams());
        variant.setAttributes(attributesJson);
        if (vReq.getStatus() != null) {
            variant.setStatus(vReq.getStatus());
        }
        updateExistingVariantSku(savedProduct.getId(), variant, vReq.getSku(), index, usedSkusInBatch);

        ProductVariant savedVariant = productVariantRepository.save(variant);
        int qty = vReq.getStockQuantity() != null ? vReq.getStockQuantity() : 100;
        updateVariantInventory(savedVariant.getId(), qty);
    }

    private void createNewVariantInUpdate(
            Product savedProduct,
            com.example.demo.dto.request.CreateProductVariantRequest vReq,
            int index,
            Set<Long> processedVariantIds,
            Set<String> usedSkusInBatch,
            String attributesJson
    ) {
        String sku = vReq.getSku();
        if (sku == null || sku.isBlank() || productVariantRepository.existsBySku(sku.trim()) || usedSkusInBatch.contains(sku.trim())) {
            sku = "SKU-" + savedProduct.getId() + "-" + System.currentTimeMillis() + "-" + (index + 1);
        } else {
            sku = sku.trim();
        }
        usedSkusInBatch.add(sku);

        ProductVariant newVariant = ProductVariant.builder()
                .product(savedProduct)
                .variantName(vReq.getVariantName())
                .sku(sku)
                .price(vReq.getPrice())
                .salePrice(vReq.getSalePrice())
                .weightGrams(vReq.getWeightGrams())
                .attributes(attributesJson)
                .status(vReq.getStatus() != null ? vReq.getStatus() : ProductVariantStatus.ACTIVE)
                .build();

        ProductVariant savedVariant = productVariantRepository.save(newVariant);
        processedVariantIds.add(savedVariant.getId());

        int qty = vReq.getStockQuantity() != null ? vReq.getStockQuantity() : 100;
        inventoryRepository.save(Inventory.builder()
                .variantId(savedVariant.getId())
                .quantity(qty)
                .reservedQuantity(0)
                .build());
    }

    private void cleanupRemovedVariants(List<ProductVariant> existingVariants, Set<Long> processedVariantIds) {
        for (ProductVariant ev : existingVariants) {
            if (!processedVariantIds.contains(ev.getId())) {
                try {
                    inventoryRepository.deleteById(ev.getId());
                    productVariantRepository.delete(ev);
                    productVariantRepository.flush();
                } catch (Exception ex) {
                    log.warn("Không thể xóa biến thể ID {} do có ràng buộc đơn hàng/giỏ hàng, chuyển trạng thái INACTIVE: {}", ev.getId(), ex.getMessage());
                    ev.setStatus(ProductVariantStatus.INACTIVE);
                    productVariantRepository.save(ev);
                }
            }
        }
    }

    private void updateProductVariants(Product savedProduct, List<com.example.demo.dto.request.CreateProductVariantRequest> variantRequests) {
        Long productId = savedProduct.getId();
        List<ProductVariant> existingVariants = productVariantRepository.findByProductIdOrderByPriceAsc(productId);
        Map<Long, ProductVariant> existingById = existingVariants.stream()
                .filter(v -> v.getId() != null)
                .collect(Collectors.toMap(ProductVariant::getId, Function.identity(), (a, b) -> a));
        Map<String, ProductVariant> existingBySku = existingVariants.stream()
                .filter(v -> v.getSku() != null && !v.getSku().isBlank())
                .collect(Collectors.toMap(v -> v.getSku().trim(), Function.identity(), (a, b) -> a));

        Set<Long> processedVariantIds = new HashSet<>();
        Set<String> usedSkusInBatch = new HashSet<>();

        for (int i = 0; i < variantRequests.size(); i++) {
            com.example.demo.dto.request.CreateProductVariantRequest vReq = variantRequests.get(i);
            ProductVariant variant = findMatchingVariant(vReq, i, existingById, existingBySku, existingVariants);
            String attributesJson = resolveVariantAttributesJson(vReq);

            if (variant != null) {
                processedVariantIds.add(variant.getId());
                updateExistingVariant(savedProduct, variant, vReq, i, usedSkusInBatch, attributesJson);
            } else {
                createNewVariantInUpdate(savedProduct, vReq, i, processedVariantIds, usedSkusInBatch, attributesJson);
            }
        }

        cleanupRemovedVariants(existingVariants, processedVariantIds);
    }

    private void updateProductImages(Product savedProduct, List<com.example.demo.dto.request.CreateProductImageRequest> imageRequests) {
        Long productId = savedProduct.getId();
        List<ProductImage> oldImages = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId);
        productImageRepository.deleteAll(oldImages);
        productImageRepository.flush();

        boolean hasPrimary = false;
        for (int i = 0; i < imageRequests.size(); i++) {
            com.example.demo.dto.request.CreateProductImageRequest imgReq = imageRequests.get(i);
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

    @Override
    @Transactional
    public void deleteProduct(Long productId, boolean force) {
        doDeleteProduct(productId, force);
    }

    private void doDeleteProduct(Long productId, boolean force) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_ID_PREFIX + productId));

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

    private ProductDetailResponse mapToDetailResponse(Product product) {
        List<ProductVariant> variantEntities = productVariantRepository.findByProductIdOrderByPriceAsc(product.getId());
        List<Long> variantIds = variantEntities.stream().map(ProductVariant::getId).toList();

        Map<Long, Inventory> inventoryMap = inventoryRepository.findByVariantIdIn(variantIds).stream()
                .collect(Collectors.toMap(Inventory::getVariantId, inv -> inv, (a, b) -> a));

        List<ProductVariantResponse> variants = variantEntities.stream()
                .map(v -> {
                    Inventory inv = inventoryMap.get(v.getId());
                    int stock = inv != null ? inv.getQuantity() : 0;
                    int avail = inv != null ? inv.getAvailableQuantity() : 0;
                    return ProductVariantResponse.fromEntity(v, stock, avail);
                })
                .toList();

        List<ProductImageResponse> images = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(product.getId()).stream()
                .map(ProductImageResponse::fromEntity)
                .toList();

        BigDecimal minPrice = null;
        BigDecimal maxPrice = null;
        for (ProductVariant v : variantEntities) {
            BigDecimal effective = v.getSalePrice() != null ? v.getSalePrice() : v.getPrice();
            if (minPrice == null || effective.compareTo(minPrice) < 0) minPrice = effective;
            if (maxPrice == null || effective.compareTo(maxPrice) > 0) maxPrice = effective;
        }

        return ProductDetailResponse.fromEntity(product, variants, images, minPrice, maxPrice);
    }

    private com.example.demo.entity.Shop verifyShopAccess(Long shopId, String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new com.example.demo.exception.UnauthorizedException("Yêu cầu đăng nhập để thực hiện thao tác");
        }
        com.example.demo.entity.User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản: " + currentUsername));

        com.example.demo.entity.Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cửa hàng với ID: " + shopId));

        boolean isAdmin = user.getRole() == com.example.demo.entity.Role.ADMIN ||
                user.getRole() == com.example.demo.entity.Role.ROLE_ADMIN ||
                (user.getRoles() != null && user.getRoles().stream().anyMatch(r ->
                        "ADMIN".equalsIgnoreCase(r.getCode()) || "ROLE_ADMIN".equalsIgnoreCase(r.getCode())));

        if (isAdmin) {
            return shop;
        }

        if (shop.getStatus() == com.example.demo.entity.ShopStatus.SUSPENDED) {
            throw new com.example.demo.exception.ForbiddenException("Cửa hàng #" + shopId + " đang bị tạm ngừng kinh doanh (SUSPENDED). Mọi thao tác quản lý sản phẩm bị tạm khóa.");
        }
        if (shop.getStatus() == com.example.demo.entity.ShopStatus.REJECTED) {
            throw new com.example.demo.exception.ForbiddenException("Cửa hàng #" + shopId + " đã bị từ chối phê duyệt (REJECTED).");
        }

        boolean isOwner = Objects.equals(shop.getOwnerId(), user.getId());
        if (isOwner) {
            return shop;
        }

        long activeMemberships = shopRepository.countActiveMemberInShop(shopId, user.getId());
        if (activeMemberships > 0) {
            return shop;
        }

        throw new com.example.demo.exception.ForbiddenException("Bạn không có quyền quản lý sản phẩm của cửa hàng #" + shopId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> getShopManagedProducts(Long shopId, ProductFilterCriteria criteria, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        final ProductFilterCriteria finalCriteria = criteria != null ? criteria : ProductFilterCriteria.builder().build();
        finalCriteria.setShopId(shopId);

        int page = Math.max(0, finalCriteria.getPage());
        int size = finalCriteria.getSize() > 0 ? finalCriteria.getSize() : 12;

        String sortBy = SORT_BY_CREATED_AT;
        if (finalCriteria.getSortBy() != null && ALLOWED_SORT_FIELDS.contains(finalCriteria.getSortBy())) {
            sortBy = finalCriteria.getSortBy();
        }

        Sort.Direction direction = "asc".equalsIgnoreCase(finalCriteria.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("shopId"), shopId));

            if (finalCriteria.getStatus() != null) {
                predicates.add(cb.equal(root.get(STATUS_FIELD), finalCriteria.getStatus()));
            } else {
                predicates.add(cb.isNull(root.get("deletedAt")));
            }

            if (finalCriteria.getKeyword() != null && !finalCriteria.getKeyword().isBlank()) {
                String pattern = "%" + finalCriteria.getKeyword().trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("name")), pattern));
            }

            if (finalCriteria.getCategoryId() != null) {
                predicates.add(cb.equal(root.get("category").get("id"), finalCriteria.getCategoryId()));
            }

            if (finalCriteria.getBrandId() != null) {
                predicates.add(cb.equal(root.get("brandId"), finalCriteria.getBrandId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

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
    @Transactional
    public ProductDetailResponse createShopProduct(Long shopId, com.example.demo.dto.request.CreateProductRequest request, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        request.setShopId(shopId);
        return doCreateProduct(request);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDetailResponse getShopProductById(Long shopId, Long productId, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        Product product = productRepository.findByIdAndShopId(productId, shopId)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId));
        return mapToDetailResponse(product);
    }

    @Override
    @Transactional
    public ProductDetailResponse updateShopProduct(Long shopId, Long productId, com.example.demo.dto.request.UpdateProductRequest request, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        if (!productRepository.existsByIdAndShopId(productId, shopId)) {
            throw new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId);
        }
        return doUpdateProduct(productId, request);
    }

    @Override
    @Transactional
    public ProductDetailResponse updateShopProductStatus(Long shopId, Long productId, ProductStatus status, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        Product product = productRepository.findByIdAndShopId(productId, shopId)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId));
        product.setStatus(status != null ? status : ProductStatus.ACTIVE);
        if (product.getStatus() == ProductStatus.INACTIVE && product.getDeletedAt() == null) {
            product.setDeletedAt(java.time.LocalDateTime.now());
        } else if (product.getStatus() == ProductStatus.ACTIVE) {
            product.setDeletedAt(null);
        }
        productRepository.save(product);
        return mapToDetailResponse(product);
    }

    @Override
    @Transactional
    public void deleteShopProduct(Long shopId, Long productId, boolean force, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        Product product = productRepository.findByIdAndShopId(productId, shopId)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId));

        long orderCount = productRepository.countOrderItemsByProductId(productId);
        if (orderCount > 0) {
            product.setStatus(ProductStatus.INACTIVE);
            product.setDeletedAt(java.time.LocalDateTime.now());
            productRepository.save(product);
            log.info("Product #{} in shop #{} has orders (count={}), marked as INACTIVE instead of deleting", productId, shopId, orderCount);
            return;
        }

        doDeleteProduct(productId, force);
    }

    @Override
    @Transactional
    public ProductVariantResponse createShopProductVariant(Long shopId, Long productId, com.example.demo.dto.request.CreateProductVariantRequest request, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        Product product = productRepository.findByIdAndShopId(productId, shopId)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId));

        if (request.getSku() == null || request.getSku().isBlank()) {
            request.setSku("SKU-" + System.currentTimeMillis() + "-" + productId);
        }

        if (productVariantRepository.existsBySku(request.getSku())) {
            throw new com.example.demo.exception.ConflictException("Mã SKU đã tồn tại trên hệ thống: " + request.getSku());
        }

        if (request.getPrice() == null || request.getPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new com.example.demo.exception.BadRequestException("Giá sản phẩm không hợp lệ");
        }

        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku(request.getSku())
                .variantName(request.getVariantName() != null ? request.getVariantName() : product.getName())
                .price(request.getPrice())
                .salePrice(request.getSalePrice())
                .weightGrams(request.getWeightGrams() != null ? request.getWeightGrams() : 300)
                .attributes(request.getAttributes())
                .status(ProductVariantStatus.ACTIVE)
                .build();

        ProductVariant savedVariant = productVariantRepository.save(variant);

        int stockQty = request.getStockQuantity() != null && request.getStockQuantity() >= 0 ? request.getStockQuantity() : 100;
        Inventory inventory = Inventory.builder()
                .variantId(savedVariant.getId())
                .quantity(stockQty)
                .reservedQuantity(0)
                .build();
        inventoryRepository.save(inventory);

        return ProductVariantResponse.fromEntity(savedVariant, stockQty, stockQty);
    }

    @Override
    @Transactional
    public ProductVariantResponse updateShopProductVariant(Long shopId, Long productId, Long variantId, com.example.demo.dto.request.CreateProductVariantRequest request, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        if (!productRepository.existsByIdAndShopId(productId, shopId)) {
            throw new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId);
        }

        ProductVariant variant = productVariantRepository.findByIdAndProductId(variantId, productId)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + variantId + BELONGS_TO_PRODUCT_PREFIX + productId));

        if (request.getSku() != null && !request.getSku().isBlank() && !request.getSku().equalsIgnoreCase(variant.getSku())) {
            if (productVariantRepository.existsBySkuAndIdNot(request.getSku(), variantId)) {
                throw new com.example.demo.exception.ConflictException("Mã SKU đã được sử dụng: " + request.getSku());
            }
            variant.setSku(request.getSku());
        }

        if (request.getVariantName() != null && !request.getVariantName().isBlank()) {
            variant.setVariantName(request.getVariantName());
        }

        if (request.getPrice() != null) {
            if (request.getPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new com.example.demo.exception.BadRequestException("Giá sản phẩm không hợp lệ");
            }
            variant.setPrice(request.getPrice());
        }

        variant.setSalePrice(request.getSalePrice());
        if (request.getWeightGrams() != null) {
            variant.setWeightGrams(request.getWeightGrams());
        }
        if (request.getAttributes() != null) {
            variant.setAttributes(request.getAttributes());
        }

        ProductVariant savedVariant = productVariantRepository.save(variant);

        Inventory inv = inventoryRepository.findById(variantId).orElse(null);
        int currentQty = inv != null ? inv.getQuantity() : 0;
        int reserved = inv != null ? inv.getReservedQuantity() : 0;
        if (request.getStockQuantity() != null && request.getStockQuantity() >= 0) {
            currentQty = request.getStockQuantity();
            if (inv != null) {
                inv.setQuantity(currentQty);
                inventoryRepository.save(inv);
            } else {
                inventoryRepository.save(Inventory.builder().variantId(variantId).quantity(currentQty).reservedQuantity(0).build());
            }
        }

        return ProductVariantResponse.fromEntity(savedVariant, currentQty, Math.max(0, currentQty - reserved));
    }

    @Override
    @Transactional
    public void deleteShopProductVariant(Long shopId, Long productId, Long variantId, boolean force, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        if (!productRepository.existsByIdAndShopId(productId, shopId)) {
            throw new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId);
        }

        ProductVariant variant = productVariantRepository.findByIdAndProductId(variantId, productId)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + variantId + BELONGS_TO_PRODUCT_PREFIX + productId));

        long orderCount = productVariantRepository.countOrderItemsByVariantId(variantId);
        if (orderCount > 0) {
            variant.setStatus(ProductVariantStatus.INACTIVE);
            productVariantRepository.save(variant);
            log.info("Variant #{} has order history, marked as INACTIVE", variantId);
            return;
        }

        if (force) {
            inventoryRepository.deleteById(variantId);
            productVariantRepository.delete(variant);
            log.info("Permanently deleted variant #{}", variantId);
        } else {
            variant.setStatus(ProductVariantStatus.INACTIVE);
            productVariantRepository.save(variant);
            log.info("Deactivated variant #{}", variantId);
        }
    }

    @Override
    @Transactional
    public ProductImageResponse addShopProductImage(Long shopId, Long productId, com.example.demo.dto.request.CreateProductImageRequest request, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        Product product = productRepository.findByIdAndShopId(productId, shopId)
                .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId));

        if (request.getImageUrl() == null || request.getImageUrl().isBlank()) {
            throw new com.example.demo.exception.BadRequestException("URL hình ảnh không được để trống");
        }

        boolean isPrimary = Boolean.TRUE.equals(request.getIsPrimary());
        if (isPrimary) {
            List<ProductImage> existing = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId);
            for (ProductImage img : existing) {
                if (img.isPrimary()) {
                    img.setPrimary(false);
                    productImageRepository.save(img);
                }
            }
        } else {
            long total = productImageRepository.countByProductId(productId);
            if (total == 0) {
                isPrimary = true;
            }
        }

        int sortOrder = request.getSortOrder() != null ? request.getSortOrder() : 0;
        ProductImage image = ProductImage.builder()
                .product(product)
                .imageUrl(request.getImageUrl())
                .altText(request.getAltText() != null ? request.getAltText() : product.getName())
                .isPrimary(isPrimary)
                .sortOrder(sortOrder)
                .build();

        ProductImage saved = productImageRepository.save(image);
        return ProductImageResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public ProductImageResponse updateShopProductImage(Long shopId, Long productId, Long imageId, com.example.demo.dto.request.UpdateProductImageRequest request, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        if (!productRepository.existsByIdAndShopId(productId, shopId)) {
            throw new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId);
        }

        ProductImage image = productImageRepository.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hình ảnh #" + imageId + BELONGS_TO_PRODUCT_PREFIX + productId));

        if (request.getIsPrimary() != null && request.getIsPrimary()) {
            List<ProductImage> existing = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId);
            for (ProductImage other : existing) {
                if (!other.getId().equals(imageId) && other.isPrimary()) {
                    other.setPrimary(false);
                    productImageRepository.save(other);
                }
            }
            image.setPrimary(true);
        } else if (request.getIsPrimary() != null) {
            image.setPrimary(request.getIsPrimary());
        }

        if (request.getSortOrder() != null) {
            image.setSortOrder(request.getSortOrder());
        }
        if (request.getAltText() != null) {
            image.setAltText(request.getAltText());
        }

        ProductImage saved = productImageRepository.save(image);
        return ProductImageResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public void deleteShopProductImage(Long shopId, Long productId, Long imageId, String currentUsername) {
        verifyShopAccess(shopId, currentUsername);
        if (!productRepository.existsByIdAndShopId(productId, shopId)) {
            throw new ResourceNotFoundException(PRODUCT_NOT_FOUND_PREFIX + productId + BELONGS_TO_SHOP_PREFIX + shopId);
        }

        ProductImage image = productImageRepository.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hình ảnh #" + imageId + BELONGS_TO_PRODUCT_PREFIX + productId));

        boolean wasPrimary = image.isPrimary();
        productImageRepository.delete(image);

        if (wasPrimary) {
            List<ProductImage> remaining = productImageRepository.findByProductIdOrderBySortOrderAscIdAsc(productId);
            if (!remaining.isEmpty()) {
                ProductImage newPrimary = remaining.get(0);
                newPrimary.setPrimary(true);
                productImageRepository.save(newPrimary);
            }
        }
    }

    private String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "product-" + System.currentTimeMillis();
        }
        String normalized = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        String slug = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .replace("đ", "d")
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("(^-)|(-$)", "");
        return slug.isBlank() ? "product-" + System.currentTimeMillis() : slug;
    }
}

