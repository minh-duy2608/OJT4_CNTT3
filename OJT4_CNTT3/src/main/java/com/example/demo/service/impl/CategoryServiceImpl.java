package com.example.demo.service.impl;

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
import com.example.demo.exception.ConflictException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.service.CategoryService;
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
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    private static final Pattern NON_LATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories(CategoryStatus status, boolean onlyRoots) {
        if (onlyRoots) {
            List<Category> list = (status != null)
                    ? categoryRepository.findByParentIsNullAndStatusOrderBySortOrderAscNameAsc(status)
                    : categoryRepository.findByParentIsNullOrderBySortOrderAscNameAsc();
            return list.stream()
                    .map(c -> CategoryResponse.fromEntity(c, true))
                    .collect(Collectors.toList());
        }

        List<Category> list = (status != null)
                ? categoryRepository.findByStatusOrderBySortOrderAscNameAsc(status)
                : categoryRepository.findAllByOrderBySortOrderAscNameAsc();
        return list.stream()
                .map(c -> CategoryResponse.fromEntity(c, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long categoryId) {
        Category category = findCategoryById(categoryId);
        return CategoryResponse.fromEntity(category, true);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> getCategoryProducts(
            Long categoryId, int page, int size, String sortBy, String sortDir
    ) {
        // Kiểm tra danh mục có tồn tại không
        findCategoryById(categoryId);

        String cleanSortBy = (sortBy != null && (sortBy.equals("name") || sortBy.equals("createdAt") || sortBy.equals("id")))
                ? sortBy : "createdAt";
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(direction, cleanSortBy));

        // Chỉ lấy sản phẩm ACTIVE và chưa bị xóa mềm
        Page<Product> productPage = productRepository.findByCategoryIdAndStatusAndDeletedAtIsNull(
                categoryId, ProductStatus.ACTIVE, pageable
        );

        return PageResponse.from(productPage.map(ProductSummaryResponse::fromEntity));
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest request) {
        String slug = (request.getSlug() != null && !request.getSlug().trim().isEmpty())
                ? toSlug(request.getSlug())
                : toSlug(request.getName());

        if (categoryRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis();
        }

        Category parent = null;
        if (request.getParentId() != null) {
            parent = findCategoryById(request.getParentId());
        }

        Category category = Category.builder()
                .name(request.getName().trim())
                .slug(slug)
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .imageUrl(request.getImageUrl() != null ? request.getImageUrl().trim() : null)
                .parent(parent)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .status(request.getStatus() != null ? request.getStatus() : CategoryStatus.ACTIVE)
                .build();

        Category saved = categoryRepository.save(category);
        log.info("Created category: ID {} - '{}' (slug: {})", saved.getId(), saved.getName(), saved.getSlug());
        return CategoryResponse.fromEntity(saved, true);
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long categoryId, UpdateCategoryRequest request) {
        Category category = findCategoryById(categoryId);

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            category.setName(request.getName().trim());
        }

        if (request.getSlug() != null && !request.getSlug().trim().isEmpty()) {
            String newSlug = toSlug(request.getSlug());
            if (categoryRepository.existsBySlugAndIdNot(newSlug, categoryId)) {
                throw new ConflictException("Slug '" + newSlug + "' đã được sử dụng bởi danh mục khác!");
            }
            category.setSlug(newSlug);
        }

        if (request.getDescription() != null) {
            category.setDescription(request.getDescription().trim());
        }

        if (request.getImageUrl() != null) {
            category.setImageUrl(request.getImageUrl().trim());
        }

        if (request.getSortOrder() != null) {
            category.setSortOrder(request.getSortOrder());
        }

        if (request.getStatus() != null) {
            category.setStatus(request.getStatus());
        }

        if (request.getParentId() != null) {
            if (request.getParentId().equals(categoryId)) {
                throw new BadRequestException("Danh mục không thể làm danh mục cha của chính nó!");
            }
            Category parent = findCategoryById(request.getParentId());
            Category ancestor = parent;
            while (ancestor != null) {
                if (ancestor.getId().equals(categoryId)) {
                    throw new BadRequestException("Không thể chọn danh mục con làm danh mục cha!");
                }
                ancestor = ancestor.getParent();
            }
            category.setParent(parent);
        } else {
            category.setParent(null);
        }

        Category updated = categoryRepository.save(category);
        log.info("Updated category ID {}: {}", categoryId, updated.getName());
        return CategoryResponse.fromEntity(updated, true);
    }

    @Override
    @Transactional
    public void deleteCategory(Long categoryId, boolean force) {
        Category category = findCategoryById(categoryId);

        long productCount = productRepository.countByCategoryId(categoryId);
        long subCategoryCount = categoryRepository.countByParentId(categoryId);

        // Nếu danh mục đang chứa sản phẩm hoặc có danh mục con
        if (productCount > 0 || subCategoryCount > 0) {
            if (force) {
                // Ngừng sử dụng an toàn (chuyển sang INACTIVE)
                category.setStatus(CategoryStatus.INACTIVE);
                categoryRepository.save(category);
                log.info("Category ID {} deactivated to INACTIVE due to existing {} products / {} subcategories",
                        categoryId, productCount, subCategoryCount);
                return;
            } else {
                throw new BadRequestException("Danh mục đang có " + productCount + " sản phẩm và " +
                        subCategoryCount + " danh mục con liên kết. Vui lòng chuyển trạng thái sang INACTIVE hoặc thêm tham số '?force=true' để ngừng sử dụng an toàn!");
            }
        }

        categoryRepository.delete(category);
        log.info("Deleted empty category ID {}: {}", categoryId, category.getName());
    }

    private Category findCategoryById(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + categoryId));
    }

    private String toSlug(String input) {
        if (input == null || input.isBlank()) return "category-" + System.currentTimeMillis();
        String text = input.trim().replace("đ", "d").replace("Đ", "D");
        String nowhitespace = WHITESPACE.matcher(text.toLowerCase(Locale.ROOT)).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NON_LATIN.matcher(normalized).replaceAll("");
        slug = slug.replaceAll("-+", "-").replaceAll("^-|-$", "");
        return slug.isEmpty() ? "category-" + System.currentTimeMillis() : slug;
    }
}
