import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  PackageSearch, 
  Tag, 
  Smartphone, 
  Laptop, 
  Watch, 
  Headphones, 
  Camera, 
  Gamepad2, 
  Grid 
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { INITIAL_PRODUCTS } from '../data/products';
import { productApi } from '../services/productApi';
import { brandApi } from '../services/brandApi';
import { 
  CATEGORY_DEFINITIONS, 
  findCategoryBySlugOrId, 
  getCategoryBrands 
} from '../data/categories';
import './ProductsPage.css';

const ITEMS_PER_PAGE = 8; // 8 sản phẩm mỗi trang (2 hàng x 4 cột chuẩn Figma)

const getCategoryIcon = (iconName) => {
  switch (iconName) {
    case 'Smartphone':
      return <Smartphone size={16} />;
    case 'Laptop':
      return <Laptop size={16} />;
    case 'Watch':
      return <Watch size={16} />;
    case 'Headphones':
      return <Headphones size={16} />;
    case 'Camera':
      return <Camera size={16} />;
    case 'Gamepad2':
      return <Gamepad2 size={16} />;
    default:
      return <Grid size={16} />;
  }
};

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const searchKeyword = searchParams.get('search') || '';
  const brandParam = searchParams.get('brandId') || searchParams.get('brand') || '';

  // Trạng thái Tab & Phân trang
  const [activeTab, setActiveTab] = useState('new');
  const [currentPage, setCurrentPage] = useState(1);
  const sectionRef = useRef(null);

  // Live data from backend APIs
  const [apiProducts, setApiProducts] = useState(null);
  const [apiTotalElements, setApiTotalElements] = useState(0);
  const [apiTotalPages, setApiTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [allBrands, setAllBrands] = useState([]);

  // Fetch available brands for quick filter
  useEffect(() => {
    let isMounted = true;
    brandApi.getBrands({ status: 'ACTIVE' })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setAllBrands(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load brands for filter:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Phân tích cấu hình danh mục hiện tại (nếu có chọn)
  const currentCategoryDef = useMemo(() => {
    return findCategoryBySlugOrId(categoryParam);
  }, [categoryParam]);

  // 2. Danh sách thương hiệu được phân tách nghiêm ngặt theo từng Danh mục
  // - Khi chọn Điện thoại: chỉ hiện Apple, Samsung, Xiaomi, OPPO
  // - Khi chọn Laptop: chỉ hiện MacBook (Apple), Asus, MSI, Acer, Dell, Lenovo, HP
  // - Khi chọn Tất cả: hiện tất cả các thương hiệu
  const categoryBrands = useMemo(() => {
    return getCategoryBrands(categoryParam, allBrands);
  }, [categoryParam, allBrands]);

  // Fetch products from backend API (STT 39)
  const fetchBackendProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage - 1,
        size: ITEMS_PER_PAGE
      };

      if (searchKeyword.trim()) {
        params.keyword = searchKeyword.trim();
      }

      // Map Category to backend categoryId
      if (currentCategoryDef) {
        params.categoryId = currentCategoryDef.id;
      } else if (categoryParam && /^\d+$/.test(categoryParam)) {
        params.categoryId = categoryParam;
      }

      // Map Brand to backend brandId or keyword
      if (brandParam) {
        if (/^\d+$/.test(brandParam)) {
          params.brandId = brandParam;
        } else {
          // Look up matching brand in allBrands by slug or name
          const foundBrand = allBrands.find(
            (b) =>
              b.slug?.toLowerCase() === brandParam.toLowerCase() ||
              b.name?.toLowerCase() === brandParam.toLowerCase()
          );
          if (foundBrand && foundBrand.id) {
            params.brandId = foundBrand.id;
          } else {
            params.keyword = brandParam;
          }
        }
      }

      if (activeTab === 'bestseller') {
        params.sort = 'price';
        params.sortDir = 'desc';
      } else if (activeTab === 'new') {
        params.sort = 'createdAt';
        params.sortDir = 'desc';
      }

      const res = await productApi.getProducts(params);
      if (res && Array.isArray(res.content) && res.content.length > 0) {
        setApiProducts(res.content);
        setApiTotalElements(res.totalElements || res.content.length);
        setApiTotalPages(res.totalPages || Math.ceil((res.totalElements || res.content.length) / ITEMS_PER_PAGE));
      } else if (res && Array.isArray(res.content) && res.content.length === 0 && (searchKeyword.trim() || brandParam || categoryParam)) {
        // Explicit search or category with 0 matches
        setApiProducts([]);
        setApiTotalElements(0);
        setApiTotalPages(1);
      } else {
        // Fallback to static mock products if backend has no catalog yet
        setApiProducts(null);
      }
    } catch (err) {
      console.warn('API getProducts fallback to mock data:', err);
      setApiProducts(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchKeyword, brandParam, categoryParam, activeTab, currentCategoryDef, allBrands]);

  useEffect(() => {
    fetchBackendProducts();
  }, [fetchBackendProducts]);

  // Đổi tab hoặc từ khóa tìm kiếm trên Header thì quay lại trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, categoryParam, brandParam, activeTab]);

  // Xóa toàn bộ bộ lọc
  const handleClearSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    newParams.delete('brandId');
    newParams.delete('brand');
    newParams.delete('category');
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  };

  // Chọn Danh mục (Tự động lọc lại thương hiệu tương ứng)
  const handleSelectCategory = (catKey) => {
    const newParams = new URLSearchParams(searchParams);
    const currentCat = searchParams.get('category') || '';
    if (!catKey || currentCat === catKey) {
      newParams.delete('category');
    } else {
      newParams.set('category', catKey);
    }
    // Khi đổi danh mục, reset bộ lọc thương hiệu để tránh không khớp
    newParams.delete('brand');
    newParams.delete('brandId');
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  };

  // Chọn Thương hiệu
  const handleSelectBrand = (brandIdOrSlug) => {
    const newParams = new URLSearchParams(searchParams);
    const currentVal = searchParams.get('brandId') || searchParams.get('brand') || '';
    if (!brandIdOrSlug || currentVal === String(brandIdOrSlug)) {
      newParams.delete('brandId');
      newParams.delete('brand');
    } else {
      newParams.set('brand', String(brandIdOrSlug));
      if (/^\d+$/.test(String(brandIdOrSlug))) {
        newParams.set('brandId', String(brandIdOrSlug));
      } else {
        newParams.delete('brandId');
      }
    }
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  };

  // Chuyển Tab danh mục sản phẩm (New Arrival / Bestseller / Featured Products)
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
  };

  // Lọc danh sách sản phẩm fallback nếu không có dữ liệu từ backend
  const fallbackFilteredProducts = useMemo(() => {
    let list = [...INITIAL_PRODUCTS];

    const query = searchKeyword.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (categoryParam) {
      if (currentCategoryDef) {
        list = list.filter(
          (p) =>
            p.category === currentCategoryDef.key ||
            p.category === currentCategoryDef.slug ||
            currentCategoryDef.aliases.includes(p.category) ||
            String(p.categoryId) === String(currentCategoryDef.id)
        );
      } else {
        list = list.filter((p) => p.category === categoryParam);
      }
    }

    if (brandParam) {
      const selectedBrandObj = allBrands.find(
        (b) => String(b.id) === String(brandParam) || b.slug === brandParam || b.name.toLowerCase() === brandParam.toLowerCase()
      );
      const brandName = selectedBrandObj ? selectedBrandObj.name.toLowerCase() : brandParam.toLowerCase();
      list = list.filter(
        (p) =>
          (p.brand && p.brand.toLowerCase().includes(brandName)) ||
          p.name.toLowerCase().includes(brandName)
      );
    }

    if (!query && !categoryParam && !brandParam) {
      if (activeTab === 'new') {
        list = [...INITIAL_PRODUCTS];
      } else if (activeTab === 'bestseller') {
        list = list.filter((p) => p.tag === 'bestseller' || p.price > 10000000);
      } else if (activeTab === 'featured') {
        list = list.filter((p) => p.tag === 'featured' || p.isLiked);
      }
    }

    return list;
  }, [searchKeyword, categoryParam, brandParam, activeTab, currentCategoryDef, allBrands]);

  // Determine current active product list
  const isUsingApi = apiProducts !== null;
  const currentProducts = isUsingApi ? apiProducts : fallbackFilteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalItems = isUsingApi ? apiTotalElements : fallbackFilteredProducts.length;
  const totalPages = isUsingApi ? apiTotalPages : Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  // Đổi trang & cuộn mượt về đầu danh sách sản phẩm
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      if (sectionRef.current) {
        sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <section ref={sectionRef} className="container cyber-products-container" id="products-section">
      {/* 1. THANH CHỌN DANH MỤC CÔNG NGHỆ (CATEGORY PILL BAR) */}
      <div className="category-filter-bar" role="tablist" aria-label="Danh mục công nghệ">
        <button
          type="button"
          className={`category-pill-btn ${!categoryParam ? 'is-active' : ''}`}
          onClick={() => handleSelectCategory('')}
        >
          <Grid size={15} />
          <span>Tất cả sản phẩm</span>
        </button>
        {CATEGORY_DEFINITIONS.map((cat) => {
          const isActive = currentCategoryDef?.id === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`category-pill-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => handleSelectCategory(cat.key)}
            >
              {getCategoryIcon(cat.icon)}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* 2. BRAND QUICK FILTER PILLS (TÁCH BIỆT THEO DANH MỤC HIỆN TẠI) */}
      <div className="brand-filter-bar">
        <span className="brand-filter-label">
          <Tag size={15} />
          {currentCategoryDef ? `Hãng ${currentCategoryDef.name}:` : 'Thương hiệu:'}
        </span>
        <button
          type="button"
          onClick={() => handleSelectBrand('')}
          className={`brand-pill-btn ${!brandParam ? 'is-active' : ''}`}
        >
          {currentCategoryDef ? `Tất cả hãng ${currentCategoryDef.name}` : 'Tất cả thương hiệu'}
        </button>
        {categoryBrands.map((b) => {
          const isSelected =
            String(b.id) === String(brandParam) ||
            b.slug === brandParam ||
            (brandParam && b.name.toLowerCase() === brandParam.toLowerCase());

          return (
            <button
              key={b.slug || b.id}
              type="button"
              onClick={() => handleSelectBrand(b.id || b.slug)}
              className={`brand-pill-btn ${isSelected ? 'is-active' : ''}`}
            >
              {b.logoUrl && (
                <img
                  src={b.logoUrl}
                  alt={b.name}
                  style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <span>{b.displayName || b.name}</span>
              {b.productCount != null && b.productCount > 0 && (
                <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>({b.productCount})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. TABS CHỌN CHUẨN FIGMA: New Arrival | Bestseller | Featured Products */}
      <div className="products-tab-header">
        <button
          type="button"
          className={`products-tab-btn ${activeTab === 'new' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('new')}
        >
          New Arrival
        </button>
        <button
          type="button"
          className={`products-tab-btn ${activeTab === 'bestseller' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('bestseller')}
        >
          Bestseller
        </button>
        <button
          type="button"
          className={`products-tab-btn ${activeTab === 'featured' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('featured')}
        >
          Featured Products
        </button>
      </div>

      {/* 4. DÒNG THÔNG BÁO KẾT QUẢ TÌM KIẾM (CHỈ HIỆN KHI CÓ TỪ KHÓA TỪ HEADER HOẶC BỘ LỌC) */}
      {(searchKeyword.trim() || brandParam || categoryParam) && (
        <div className="products-results-info">
          <div>
            {currentCategoryDef ? <>Danh mục <strong className="search-query-tag">{currentCategoryDef.fullName}</strong>. </> : null}
            {brandParam ? <>Thương hiệu <strong className="search-query-tag">{categoryBrands.find(b => String(b.id) === String(brandParam) || b.slug === brandParam)?.displayName || brandParam}</strong>. </> : null}
            {searchKeyword.trim() ? <>Từ khóa <strong className="search-query-tag">"{searchKeyword.trim()}"</strong>. </> : null}
            Tìm thấy <strong>{totalItems}</strong> sản phẩm
          </div>
          <button
            type="button"
            onClick={handleClearSearch}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'underline'
            }}
          >
            <X size={15} /> Xóa bộ lọc
          </button>
        </div>
      )}

      {/* 5. LƯỚI SẢN PHẨM (CARD GRID) */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#71717a' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e4e4e7', borderTopColor: '#000000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>Đang tải danh sách sản phẩm...</p>
        </div>
      ) : currentProducts.length > 0 ? (
        <div className="products-card-grid">
          {currentProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* Trạng thái không có sản phẩm khớp */
        <div style={{ textAlign: 'center', padding: '4.5rem 1.5rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e4e4e7' }}>
          <PackageSearch size={48} color="#a1a1aa" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000000', marginBottom: '0.5rem' }}>
            Không tìm thấy sản phẩm nào
          </h3>
          <p style={{ color: '#71717a', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            {searchKeyword || brandParam || categoryParam
              ? 'Không có thiết bị công nghệ nào phù hợp với điều kiện lọc hiện tại. Hãy thử chọn thương hiệu khác hoặc chuyển danh mục!'
              : 'Hiện không có sản phẩm nào trong mục này.'}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              handleClearSearch();
              setActiveTab('new');
            }}
          >
            Xem tất cả sản phẩm
          </button>
        </div>
      )}

      {/* 6. THANH PHÂN TRANG (PAGINATION CONTROLS) */}
      {totalPages > 1 && (
        <div className="pagination-container" aria-label="Phân trang sản phẩm">
          <div className="pagination-status-text">
            Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> (Tổng {totalItems} sản phẩm)
          </div>

          <div className="pagination-controls">
            {/* Nút Trước */}
            <button
              type="button"
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Trang trước"
            >
              <ChevronLeft size={16} />
              <span>Trước</span>
            </button>

            {/* Các nút số trang */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`page-number-btn ${currentPage === pageNum ? 'is-active' : ''}`}
                onClick={() => handlePageChange(pageNum)}
                aria-label={`Đến trang ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            ))}

            {/* Nút Sau */}
            <button
              type="button"
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Trang sau"
            >
              <span>Sau</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
