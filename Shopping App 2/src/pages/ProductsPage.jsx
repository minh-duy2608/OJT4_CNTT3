import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, PackageSearch, Filter, Tag } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { INITIAL_PRODUCTS } from '../data/products';
import { productApi } from '../services/productApi';
import { brandApi } from '../services/brandApi';
import './ProductsPage.css';

const ITEMS_PER_PAGE = 8; // 8 sản phẩm mỗi trang (2 hàng x 4 cột chuẩn Figma)

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
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
  const [brands, setBrands] = useState([]);

  // Fetch available brands for quick filter
  useEffect(() => {
    let isMounted = true;
    brandApi.getBrands({ status: 'ACTIVE' })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setBrands(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load brands for filter:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
      if (brandParam) {
        // If brandParam is numeric, pass as brandId, otherwise pass as keyword
        if (/^\d+$/.test(brandParam)) {
          params.brandId = brandParam;
        } else {
          params.keyword = brandParam;
        }
      }
      if (categoryParam) {
        if (/^\d+$/.test(categoryParam)) {
          params.categoryId = categoryParam;
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
      } else if (res && Array.isArray(res.content) && res.content.length === 0 && (searchKeyword.trim() || brandParam)) {
        // Explicit search with 0 matches
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
  }, [currentPage, searchKeyword, brandParam, categoryParam, activeTab]);

  useEffect(() => {
    fetchBackendProducts();
  }, [fetchBackendProducts]);

  // Đổi tab hoặc từ khóa tìm kiếm trên Header thì quay lại trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, categoryParam, brandParam, activeTab]);

  // Xóa từ khóa tìm kiếm khi người dùng bấm nút "Xóa tìm kiếm"
  const handleClearSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    newParams.delete('brandId');
    newParams.delete('brand');
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  };

  const handleSelectBrand = (brandId) => {
    const newParams = new URLSearchParams(searchParams);
    if (!brandId || brandParam === String(brandId)) {
      newParams.delete('brandId');
      newParams.delete('brand');
    } else {
      newParams.set('brandId', String(brandId));
    }
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  };

  // Chuyển Tab danh mục sản phẩm (New Arrival / Bestseller / Featured Products)
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
  };

  // 1. Lọc danh sách sản phẩm fallback nếu không có dữ liệu từ backend
  const fallbackFilteredProducts = useMemo(() => {
    let list = [...INITIAL_PRODUCTS];

    const query = searchKeyword.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (categoryParam) {
      list = list.filter((p) => p.category === categoryParam);
    }

    if (brandParam) {
      const selectedBrandObj = brands.find((b) => String(b.id) === String(brandParam) || b.slug === brandParam);
      const brandName = selectedBrandObj ? selectedBrandObj.name.toLowerCase() : brandParam.toLowerCase();
      list = list.filter((p) => (p.brand && p.brand.toLowerCase().includes(brandName)) || p.name.toLowerCase().includes(brandName));
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
  }, [searchKeyword, categoryParam, brandParam, activeTab, brands]);

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
      {/* 1. TABS CHỌN CHUẨN FIGMA: New Arrival | Bestseller | Featured Products */}
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

      {/* 2. BRAND QUICK FILTER PILLS (STT 33-35 Brand API) */}
      {brands.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Tag size={15} /> Thương hiệu:
          </span>
          <button
            type="button"
            onClick={() => handleSelectBrand('')}
            style={{
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: !brandParam ? '1px solid #000000' : '1px solid #e4e4e7',
              backgroundColor: !brandParam ? '#000000' : '#ffffff',
              color: !brandParam ? '#ffffff' : '#52525b',
              transition: 'all 0.15s ease'
            }}
          >
            Tất cả
          </button>
          {brands.map((b) => {
            const isSelected = String(b.id) === String(brandParam) || b.slug === brandParam;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBrand(b.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #000000' : '1px solid #e4e4e7',
                  backgroundColor: isSelected ? '#000000' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#52525b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                {b.logoUrl && (
                  <img
                    src={b.logoUrl}
                    alt={b.name}
                    style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <span>{b.name}</span>
                {b.productCount != null && (
                  <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>({b.productCount})</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. DÒNG THÔNG BÁO KẾT QUẢ TÌM KIẾM (CHỈ HIỆN KHI CÓ TỪ KHÓA TỪ HEADER HOẶC BỘ LỌC) */}
      {(searchKeyword.trim() || brandParam) && (
        <div className="products-results-info">
          <div>
            Kết quả {searchKeyword.trim() ? <>cho từ khóa <strong className="search-query-tag">"{searchKeyword.trim()}"</strong></> : null}
            {brandParam ? <> theo thương hiệu <strong className="search-query-tag">{brands.find(b => String(b.id) === String(brandParam))?.name || brandParam}</strong></> : null}
            : Tìm thấy <strong>{totalItems}</strong> sản phẩm
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

      {/* 4. LƯỚI SẢN PHẨM (CARD GRID) */}
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
            {searchKeyword || brandParam
              ? 'Không có thiết bị công nghệ nào phù hợp với điều kiện lọc hiện tại. Hãy thử chọn thương hiệu khác hoặc xóa bộ lọc!'
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

      {/* 5. THANH PHÂN TRANG (PAGINATION CONTROLS) */}
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
