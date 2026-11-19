import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { productApi } from '../services/productApi';
import './DiscountProducts.css';

export const DiscountProducts = () => {
  const [discountProducts, setDiscountProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef(null);
  const autoScrollTimerRef = useRef(null);

  // Lấy danh sách sản phẩm giảm giá từ API
  useEffect(() => {
    let isMounted = true;
    productApi.getProducts({ size: 16, sort: 'createdAt', sortDir: 'desc' })
      .then((res) => {
        if (!isMounted) return;
        const items = res?.content || [];
        // Ưu tiên các sản phẩm có salePrice hoặc dải giảm giá
        const discounted = items.filter((p) => p.salePrice && p.salePrice < (p.minPrice || p.price || Infinity));
        // Lấy danh sách sản phẩm để hiển thị dải cuộn tự động (ít nhất 6 - 12 món)
        const finalItems = discounted.length >= 6 
          ? discounted 
          : Array.from(new Set([...discounted, ...items])).slice(0, 12);

        setDiscountProducts(finalItems);
      })
      .catch((err) => {
        console.warn('Could not load discount products:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Tính toán khoảng cách cuộn (khoảng 1 card + gap)
  const getScrollStep = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return 300;
    const firstCard = container.querySelector('.discount-carousel-item');
    if (firstCard) {
      const cardWidth = firstCard.offsetWidth;
      const gap = 24; // gap 1.5rem = 24px
      return cardWidth + gap;
    }
    return Math.floor(container.clientWidth * 0.75);
  }, []);

  // Cuộn sang trái hoặc phải thủ công
  const handleScroll = useCallback((direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const step = getScrollStep();

    if (direction === 'left') {
      if (container.scrollLeft <= 5) {
        // Nếu đang ở đầu mà bấm lùi, chuyển tới cuối dải
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -step, behavior: 'smooth' });
      }
    } else {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScroll - 10) {
        // Nếu đã ở cuối dải, cuộn mượt về đầu
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: step, behavior: 'smooth' });
      }
    }
  }, [getScrollStep]);

  // Hiệu ứng cuộn tự động theo chu kỳ (3.5 giây / lần)
  useEffect(() => {
    if (isLoading || discountProducts.length <= 1 || isPaused) {
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
      return;
    }

    autoScrollTimerRef.current = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const step = getScrollStep();

      if (container.scrollLeft >= maxScroll - 15) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 3500);

    return () => {
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
    };
  }, [isLoading, discountProducts.length, isPaused, getScrollStep]);

  if (!isLoading && discountProducts.length === 0) {
    return null;
  }

  return (
    <section className="container discount-products-section" aria-label="Sản phẩm giảm giá">
      {/* Header khu vực giảm giá */}
      <div className="discount-products-header">
        <div className="discount-products-title-group">
          <h2 className="discount-products-title">Sản phẩm giảm giá</h2>
          <span className="discount-flash-badge">
            <Flame size={14} className="discount-flame-icon" />
            Ưu đãi sốc
          </span>
        </div>

        {/* Nút điều hướng Cuộn Trái / Phải */}
        <div className="discount-nav-controls" aria-label="Điều khiển cuộn sản phẩm">
          <button
            type="button"
            className="discount-nav-btn"
            onClick={() => handleScroll('left')}
            aria-label="Cuộn sản phẩm sang trái"
            title="Xem sản phẩm trước"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="discount-nav-btn"
            onClick={() => handleScroll('right')}
            aria-label="Cuộn sản phẩm sang phải"
            title="Xem sản phẩm tiếp theo"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Dải card sản phẩm dạng carousel cuộn tự động */}
      {isLoading ? (
        <div className="discount-carousel-wrapper">
          <div className="discount-carousel-track" style={{ pointerEvents: 'none', opacity: 0.6 }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="discount-carousel-item cyber-product-card">
                <div className="product-card-thumb-wrap" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '185px', borderRadius: '10px' }}>
                  <div style={{ width: '100px', height: '100px', background: '#e2e8f0', borderRadius: '8px' }} />
                </div>
                <div className="product-card-body" style={{ padding: '1rem', textAlign: 'center', width: '100%' }}>
                  <div style={{ width: '80%', height: '16px', background: '#e2e8f0', borderRadius: '4px', margin: '0 auto 10px' }} />
                  <div style={{ width: '50%', height: '18px', background: '#e2e8f0', borderRadius: '4px', margin: '0 auto 14px' }} />
                  <div style={{ width: '100%', height: '38px', background: '#f1f5f9', borderRadius: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="discount-carousel-wrapper"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <div
            ref={scrollContainerRef}
            className="discount-carousel-track"
            role="region"
            aria-label="Dải sản phẩm giảm giá cuộn tự động"
            tabIndex={0}
          >
            {discountProducts.map((product) => (
              <div key={product.id} className="discount-carousel-item">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default DiscountProducts;
