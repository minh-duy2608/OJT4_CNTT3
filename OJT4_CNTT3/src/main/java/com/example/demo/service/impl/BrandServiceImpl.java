package com.example.demo.service.impl;

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
import com.example.demo.service.BrandService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BrandServiceImpl implements BrandService {

    private final BrandRepository brandRepository;
    private final ProductRepository productRepository;

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    @Override
    @Transactional(readOnly = true)
    public List<BrandResponse> getBrands(BrandStatus status) {
        List<Brand> brands = (status != null)
                ? brandRepository.findByStatusOrderByNameAsc(status)
                : brandRepository.findAllByOrderByNameAsc();

        return brands.stream()
                .map(b -> BrandResponse.fromEntity(b, productRepository.countByBrandId(b.getId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BrandResponse getBrandById(Long brandId) {
        Brand brand = findBrandById(brandId);
        long productCount = productRepository.countByBrandId(brandId);
        return BrandResponse.fromEntity(brand, productCount);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> getBrandProducts(
            Long brandId, int page, int size, String sortBy, String sortDir
    ) {
        findBrandById(brandId);

        String cleanSortBy = (sortBy != null && (sortBy.equals("name") || sortBy.equals("createdAt") || sortBy.equals("id")))
                ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(direction, cleanSortBy));

        Page<Product> productPage = productRepository.findByBrandIdAndStatusAndDeletedAtIsNull(
                brandId, ProductStatus.ACTIVE, pageable
        );

        return PageResponse.from(productPage.map(ProductSummaryResponse::fromEntity));
    }

    @Override
    @Transactional
    public BrandResponse createBrand(CreateBrandRequest request) {
        String trimmedName = request.getName().trim();
        if (brandRepository.existsByName(trimmedName)) {
            throw new ConflictException("Tên thương hiệu '" + trimmedName + "' đã tồn tại!");
        }

        String slug = (request.getSlug() != null && !request.getSlug().trim().isEmpty())
                ? toSlug(request.getSlug())
                : toSlug(trimmedName);

        if (brandRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis();
        }

        Brand brand = Brand.builder()
                .name(trimmedName)
                .slug(slug)
                .logoUrl(request.getLogoUrl() != null ? request.getLogoUrl().trim() : null)
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .status(request.getStatus() != null ? request.getStatus() : BrandStatus.ACTIVE)
                .build();

        Brand saved = brandRepository.save(brand);
        log.info("Created new brand: ID {} - '{}' (slug: {})", saved.getId(), saved.getName(), saved.getSlug());
        return BrandResponse.fromEntity(saved, 0L);
    }

    @Override
    @Transactional
    public BrandResponse updateBrand(Long brandId, UpdateBrandRequest request) {
        Brand brand = findBrandById(brandId);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            String newName = request.getName().trim();
            if (brandRepository.existsByNameAndIdNot(newName, brandId)) {
                throw new ConflictException("Tên thương hiệu '" + newName + "' đã được sử dụng bởi thương hiệu khác!");
            }
            brand.setName(newName);
        }

        if (request.getSlug() != null && !request.getSlug().trim().isEmpty()) {
            String newSlug = toSlug(request.getSlug());
            if (brandRepository.existsBySlugAndIdNot(newSlug, brandId)) {
                throw new ConflictException("Slug '" + newSlug + "' đã được sử dụng bởi thương hiệu khác!");
            }
            brand.setSlug(newSlug);
        }

        if (request.getLogoUrl() != null) {
            brand.setLogoUrl(request.getLogoUrl().trim());
        }

        if (request.getDescription() != null) {
            brand.setDescription(request.getDescription().trim());
        }

        if (request.getStatus() != null) {
            brand.setStatus(request.getStatus());
        }

        Brand updated = brandRepository.save(brand);
        log.info("Updated brand ID {}: {}", brandId, updated.getName());
        long count = productRepository.countByBrandId(brandId);
        return BrandResponse.fromEntity(updated, count);
    }

    @Override
    @Transactional
    public void deleteBrand(Long brandId, boolean force) {
        Brand brand = findBrandById(brandId);
        long productCount = productRepository.countByBrandId(brandId);

        if (productCount > 0) {
            if (force) {
                brand.setStatus(BrandStatus.INACTIVE);
                brandRepository.save(brand);
                log.info("Brand ID {} deactivated to INACTIVE due to existing {} products", brandId, productCount);
                return;
            } else {
                throw new BadRequestException("Thương hiệu đang có " + productCount +
                        " sản phẩm liên kết. Vui lòng chuyển trạng thái sang INACTIVE hoặc thêm tham số '?force=true' để ngừng sử dụng an toàn!");
            }
        }

        brandRepository.delete(brand);
        log.info("Deleted brand ID {}: {}", brandId, brand.getName());
    }

    private Brand findBrandById(Long brandId) {
        return brandRepository.findById(brandId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thương hiệu với ID: " + brandId));
    }

    private String toSlug(String input) {
        if (input == null || input.isBlank()) return "brand-" + System.currentTimeMillis();
        String text = input.trim().replace("đ", "d").replace("Đ", "D");
        String nowhitespace = WHITESPACE.matcher(text.toLowerCase(Locale.ROOT)).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NON_LATIN.matcher(normalized).replaceAll("");
        return slug.replaceAll("-+", "-").replaceAll("^-|-$", "");
    }
}
