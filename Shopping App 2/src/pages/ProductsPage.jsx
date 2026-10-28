import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { INITIAL_PRODUCTS } from '../data/products';
import './ProductsPage.css';

const ITEMS_PER_PAGE = 8; // 8 sản phẩm mỗi trang (2 hàng x 4 cột chuẩn Figma)

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const searchKeyword = searchParams.get('search') || '';

  // Trạng thái Tab & Phân trang
  const [activeTab, setActiveTab] = useState('new');
  const [currentPage, setCurrentPage] = useState(1);
  const sectionRef = useRef(null);

  // Đổi tab hoặc từ khóa tìm kiếm trên Header thì quay lại trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, categoryParam]);

  // Xóa từ khóa tìm kiếm khi người dùng bấm nút "Xóa tìm kiếm"
  const handleClearSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
  };

  // Chuyển Tab danh mục sản phẩm (New Arrival / Bestseller / Featured Products)
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
  };

  // 1. Lọc danh sách sản phẩm theo Tìm kiếm (từ Header), Danh mục & Tab
  const filteredProducts = useMemo(() => {
    let list = [...INITIAL_PRODUCTS];

    // Lọc theo từ khóa tìm kiếm từ Header
    const query = searchKeyword.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Lọc theo danh mục nếu có
    if (categoryParam) {
      list = list.filter((p) => p.category === categoryParam);
    }

    // Phân loại theo Tab (nếu không có từ khóa tìm kiếm và chưa chọn danh mục)
    if (!query && !categoryParam) {
      if (activeTab === 'new') {
        // Tab New Arrival: Toàn bộ danh sách chuẩn theo thứ tự Figma
        list = [...INITIAL_PRODUCTS];
      } else if (activeTab === 'bestseller') {
        list = list.filter((p) => p.tag === 'bestseller' || p.price > 10000000);
      } else if (activeTab === 'featured') {
        list = list.filter((p) => p.tag === 'featured' || p.isLiked);
      }
    }

    return list;
  }, [searchKeyword, categoryParam, activeTab]);

  // 2. Phân trang sản phẩm
  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  // Đảm bảo currentPage luôn hợp lệ khi bộ lọc thay đổi
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

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

      {/* 2. DÒNG THÔNG BÁO KẾT QUẢ TÌM KIẾM (CHỈ HIỆN KHI CÓ TỪ KHÓA TỪ HEADER) */}
      {searchKeyword.trim() && (
        <div className="products-results-info">
          <div>
            Kết quả tìm kiếm cho <strong className="search-query-tag">"{searchKeyword.trim()}"</strong>: Tìm thấy <strong>{totalItems}</strong> sản phẩm
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
            <X size={15} /> Xóa tìm kiếm
          </button>
        </div>
      )}

      {/* 3. LƯỚI SẢN PHẨM (CARD GRID - NỀN TRẮNG CHUẨN FIGMA) */}
      {paginatedProducts.length > 0 ? (
        <div className="products-card-grid">
          {paginatedProducts.map((product) => (
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
            {searchKeyword
              ? `Không có thiết bị công nghệ nào phù hợp với từ khóa "${searchKeyword}". Hãy thử tìm kiếm với từ khóa khác trên thanh tìm kiếm ở Header!`
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

      {/* 4. THANH PHÂN TRANG (PAGINATION CONTROLS: 8 SẢN PHẨM / TRANG) */}
      {totalPages > 1 && (
        <div className="pagination-container" aria-label="Phân trang sản phẩm">
          <div className="pagination-status-text">
            Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> (Hiển thị {paginatedProducts.length} sản phẩm)
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
