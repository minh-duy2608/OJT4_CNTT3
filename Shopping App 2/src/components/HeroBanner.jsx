import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import heroIphoneDual from '../assets/hero-iphone-dual.png';
import { productApi } from '../services/productApi';
import { useOrders } from '../context/OrderContext';
import './HeroBanner.css';

// 5 theme màu tối cao cấp chuẩn thiết kế Figma
const SLIDE_THEMES = [
  { bg: '#211c24', glow: 'rgba(168, 85, 247, 0.22)' }, // Purple aura (Figma exact)
  { bg: '#141824', glow: 'rgba(59, 130, 246, 0.22)' },  // Blue aura
  { bg: '#1c1c23', glow: 'rgba(245, 158, 11, 0.20)' }, // Amber aura
  { bg: '#181c20', glow: 'rgba(16, 185, 129, 0.20)' }, // Emerald aura
  { bg: '#211a24', glow: 'rgba(236, 72, 153, 0.20)' }  // Rose aura
];

const BEST_SELLER_KICKERS = [
  'Top 1 Bán chạy nhất',
  'Top 2 Bán chạy nhất',
  'Top 3 Bán chạy nhất',
  'Top 4 Bán chạy nhất',
  'Top 5 Bán chạy nhất'
];

// Tách tên sản phẩm thành phần chữ mảnh (light) và chữ đậm (bold) chuẩn giao diện Figma
const formatBannerTitle = (fullName = '') => {
  if (!fullName) return { light: 'Sản phẩm ', bold: 'Hot' };
  
  // Loại bỏ các đoạn hậu tố như | Chính hãng, thông số trong ngoặc đơn
  const cleaned = fullName
    .split('|')[0]
    .replace(/\(.*?\)/g, '')
    .trim();

  const words = cleaned.split(/\s+/);
  if (words.length <= 1) {
    return { light: words[0] || '', bold: '' };
  }
  if (words.length === 2) {
    return { light: words[0] + ' ', bold: words[1] };
  }
  // Nếu có từ 3 từ trở lên: ví dụ "iPhone 17 Pro Max" -> light: "iPhone 17 ", bold: "Pro Max"
  const splitIdx = Math.min(2, Math.floor(words.length / 2));
  return {
    light: words.slice(0, splitIdx).join(' ') + ' ',
    bold: words.slice(splitIdx).join(' ')
  };
};

export const HeroBanner = () => {
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const bannerRef = useRef(null);
  const { orders } = useOrders();

  // Fetch top 5 sản phẩm bán chạy nhất: Kết hợp doanh số Backend API & đơn hàng người dùng vừa mua
  useEffect(() => {
    let isMounted = true;

    // Tính tổng số lượng bán từ đơn hàng thực tế của khách hàng (localStorage OrderContext)
    const localSalesMap = {};
    if (Array.isArray(orders)) {
      orders.forEach((order) => {
        if (order.status === 'CANCELLED') return;
        if (Array.isArray(order.items)) {
          order.items.forEach((item) => {
            const qty = Number(item.quantity) || 1;
            const pId = item.productId || (typeof item.id === 'string' ? parseInt(item.id.split('-')[0], 10) : item.id);
            if (pId && !isNaN(pId)) {
              localSalesMap[pId] = (localSalesMap[pId] || 0) + qty;
            }
            if (item.name) {
              const cleanName = item.name.toLowerCase().trim();
              localSalesMap[cleanName] = (localSalesMap[cleanName] || 0) + qty;
            }
          });
        }
      });
    }

    Promise.all([
      productApi.getTopBestsellers().catch(() => []),
      productApi.getProducts({ size: 30 }).catch(() => ({ content: [] }))
    ]).then(([bestsellers, catalog]) => {
      if (!isMounted) return;

      const allList = [];
      const seen = new Set();
      const addProd = (p) => {
        if (!p || !p.id || seen.has(p.id)) return;
        seen.add(p.id);
        allList.push(p);
      };

      if (Array.isArray(bestsellers)) bestsellers.forEach(addProd);
      const catalogItems = catalog?.content || (Array.isArray(catalog) ? catalog : []);
      catalogItems.forEach(addProd);

      if (allList.length === 0) return;

      // Tính tổng doanh số cho từng sản phẩm
      const scoredList = allList.map((product) => {
        const idSales = localSalesMap[product.id] || 0;
        const nameSales = localSalesMap[product.name?.toLowerCase().trim()] || 0;
        const localSales = Math.max(idSales, nameSales);
        const backendSales = product.totalSold || 0;
        const totalSales = localSales + backendSales;
        return {
          ...product,
          totalSales,
          localSales
        };
      });

      // Sắp xếp: ưu tiên sản phẩm có doanh số bán cao nhất lên đầu
      scoredList.sort((a, b) => {
        if (b.totalSales !== a.totalSales) {
          return b.totalSales - a.totalSales;
        }
        return a.id - b.id;
      });

      const top5 = scoredList.slice(0, 5);
      const mappedSlides = top5.map((product, idx) => {
        const { light, bold } = formatBannerTitle(product.name);
        const theme = SLIDE_THEMES[idx % SLIDE_THEMES.length];
        const soldText = product.totalSales > 0 ? ` (Đã bán ${product.totalSales})` : '';
        const kicker = `${BEST_SELLER_KICKERS[idx] || `Top ${idx + 1} Bán chạy`}${soldText}`;

        // Lấy ảnh thật của sản phẩm: ưu tiên primaryImageUrl hoặc ảnh đầu tiên
        const realImage = product.primaryImageUrl 
          || (product.images && product.images[0]?.imageUrl) 
          || heroIphoneDual;

        // Lấy mô tả tóm tắt nổi bật
        const desc = product.shortDescription 
          || (typeof product.description === 'string' && product.description.length > 0 ? product.description : null)
          || 'Được tạo ra để thay đổi mọi thứ để tốt hơn. Hiệu năng vượt trội trong tầm tay.';

        return {
          id: `real-prod-${product.id}`,
          productId: product.id,
          kicker,
          titleLight: light,
          titleBold: bold,
          description: desc,
          buttonText: 'Mua ngay',
          image: realImage,
          alt: product.name,
          imageClass: idx === 0 ? 'hero-img-dual-phone' : 'hero-img-standard',
          themeBg: theme.bg,
          glowColor: theme.glow
        };
      });

      if (mappedSlides.length > 0) {
        setSlides(mappedSlides);
      }
    }).catch((err) => {
      console.warn('HeroBanner bestsellers error:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [orders]);

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = (idx) => {
    setCurrentIndex(idx);
  };

  // Tự động chuyển slide sau mỗi 7 giây (Tạm dừng khi di chuột vào)
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, totalSlides]);

  // Điều hướng bằng phím mũi tên bàn phím khi banner được focus
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  };

  if (slides.length === 0) {
    return (
      <section 
        className="cyber-hero-banner hero-banner-skeleton"
        style={{
          backgroundColor: '#1b1a20',
          backgroundImage: 'radial-gradient(ellipse at 75% 50%, rgba(168, 85, 247, 0.12) 0%, transparent 65%)',
          minHeight: '480px'
        }}
        aria-label="Đang tải dữ liệu banner..."
      >
        <div className="container hero-banner-inner">
          <div className="hero-slide-content" style={{ opacity: 0.75 }}>
            <div className="hero-text-col">
              <div style={{ width: '130px', height: '16px', background: 'rgba(255,255,255,0.12)', borderRadius: '4px', marginBottom: '16px' }} />
              <div style={{ width: '320px', height: '44px', background: 'rgba(255,255,255,0.12)', borderRadius: '6px', marginBottom: '16px' }} />
              <div style={{ width: '80%', maxWidth: '420px', height: '32px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', marginBottom: '24px' }} />
              <div style={{ width: '140px', height: '44px', background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }} />
            </div>
            <div className="hero-image-col">
              <div className="hero-img-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <section 
      ref={bannerRef}
      className="cyber-hero-banner" 
      style={{
        backgroundColor: currentSlide.themeBg,
        backgroundImage: `radial-gradient(ellipse at 75% 50%, ${currentSlide.glowColor} 0%, transparent 65%)`
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Banner top 5 sản phẩm bán chạy nhất"
    >
      {/* Nút lùi slide trước */}
      <button 
        type="button"
        className="hero-nav-arrow prev"
        onClick={prevSlide}
        aria-label="Banner sản phẩm trước"
        title="Xem sản phẩm trước"
      >
        <ChevronLeft size={24} strokeWidth={2.2} />
      </button>

      <div className="container hero-banner-inner">
        {/* Nội dung slide hiện tại */}
        <div key={currentSlide.id} className="hero-slide-content">
          {/* Cột trái: Văn bản & Nút Mua ngay (Chuẩn 100% Figma) */}
          <div className="hero-text-col">
            <p className="hero-kicker">
              {currentSlide.kicker}
            </p>

            <h1 className="hero-title">
              <span className="hero-title-light">{currentSlide.titleLight}</span>
              <strong className="hero-title-bold">{currentSlide.titleBold}</strong>
            </h1>

            <p className="hero-description">
              {currentSlide.description}
            </p>

            <div className="hero-action-row">
              <Link 
                to={`/products/${currentSlide.productId}`} 
                className="hero-cta-btn"
                title={`Bấm để mua ngay ${currentSlide.titleLight}${currentSlide.titleBold}`}
              >
                {currentSlide.buttonText}
              </Link>
            </div>
          </div>

          {/* Cột phải: Hình ảnh sản phẩm thật trực quan */}
          <div 
            className="hero-image-col"
            onClick={() => navigate(`/products/${currentSlide.productId}`)}
            style={{ cursor: 'pointer' }}
            title={`Xem chi tiết sản phẩm ${currentSlide.titleLight}${currentSlide.titleBold}`}
          >
            <div className="hero-img-wrapper">
              <img 
                src={currentSlide.image} 
                alt={currentSlide.alt} 
                className={`hero-product-img ${currentSlide.imageClass}`} 
                loading="eager"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = heroIphoneDual;
                }}
              />
            </div>
          </div>
        </div>

        {/* Thanh chỉ báo Slide (Dots/Pills) ở giữa đáy banner */}
        <div className="hero-dots-container" role="tablist" aria-label="Chuyển banner">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={currentIndex === index}
              className={`hero-dot-pill ${currentIndex === index ? 'is-active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Đến sản phẩm ${slide.titleLight}${slide.titleBold}`}
            />
          ))}
        </div>
      </div>

      {/* Nút tiến slide sau */}
      <button 
        type="button"
        className="hero-nav-arrow next"
        onClick={nextSlide}
        aria-label="Banner sản phẩm kế tiếp"
        title="Xem sản phẩm tiếp theo"
      >
        <ChevronRight size={24} strokeWidth={2.2} />
      </button>
    </section>
  );
};
