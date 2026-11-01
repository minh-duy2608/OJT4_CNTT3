import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import heroIphoneDual from '../assets/hero-iphone-dual.png';
import galaxyFoldImg from '../assets/products/galaxy-fold.png';
import appleWatchImg from '../assets/products/apple-watch.png';
import airpodsMaxImg from '../assets/products/airpods-max.png';
import cameraImg from '../assets/products/blackmagic-camera.png';
import { productApi } from '../services/productApi';
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

// Danh sách banner fallback dự phòng khi chưa tải xong API
const FALLBACK_SLIDES = [
  {
    id: 'fallback-1',
    productId: 5,
    kicker: 'Top 1 Bán chạy nhất',
    titleLight: 'iPhone 17 ',
    titleBold: 'Pro Max',
    description: 'Được tạo ra để thay đổi mọi thứ để tốt hơn. Màn hình ProMotion 120Hz và chip A19 Pro đột phá.',
    buttonText: 'Mua ngay',
    image: heroIphoneDual,
    alt: 'iPhone 17 Pro Max',
    imageClass: 'hero-img-dual-phone',
    themeBg: '#211c24',
    glowColor: 'rgba(168, 85, 247, 0.22)'
  },
  {
    id: 'fallback-2',
    productId: 21,
    kicker: 'Top 2 Bán chạy nhất',
    titleLight: 'Galaxy S26 ',
    titleBold: 'Ultra 5G',
    description: 'Hiệu năng vượt trội với Snapdragon 8 Elite Gen 5, Camera 200MP zoom 100x đỉnh cao.',
    buttonText: 'Mua ngay',
    image: galaxyFoldImg,
    alt: 'Samsung Galaxy S26 Ultra',
    imageClass: 'hero-img-standard',
    themeBg: '#141824',
    glowColor: 'rgba(59, 130, 246, 0.22)'
  },
  {
    id: 'fallback-3',
    productId: 4,
    kicker: 'Top 3 Bán chạy nhất',
    titleLight: 'Apple Watch ',
    titleBold: 'Series 12',
    description: 'Chip S9 SiP tiên tiến, thao tác chạm hai lần Double Tap kỳ diệu và theo dõi sức khỏe chuyên sâu.',
    buttonText: 'Mua ngay',
    image: appleWatchImg,
    alt: 'Apple Watch Series 12',
    imageClass: 'hero-img-standard',
    themeBg: '#1c1c23',
    glowColor: 'rgba(245, 158, 11, 0.20)'
  },
  {
    id: 'fallback-4',
    productId: 23,
    kicker: 'Top 4 Bán chạy nhất',
    titleLight: 'Galaxy Z ',
    titleBold: 'Fold 8 Ultra',
    description: 'Màn hình gập đỉnh cao mở ra kỷ nguyên mới. Đa nhiệm mượt mà trong tầm tay.',
    buttonText: 'Mua ngay',
    image: airpodsMaxImg,
    alt: 'Samsung Galaxy Z Fold 8',
    imageClass: 'hero-img-standard',
    themeBg: '#181c20',
    glowColor: 'rgba(16, 185, 129, 0.20)'
  },
  {
    id: 'fallback-5',
    productId: 12,
    kicker: 'Top 5 Bán chạy nhất',
    titleLight: 'MacBook Air ',
    titleBold: 'M2 2024',
    description: 'Thiết kế siêu mỏng nhẹ, pin lên tới 18 giờ và hiệu năng ấn tượng cùng màn hình Liquid Retina.',
    buttonText: 'Mua ngay',
    image: cameraImg,
    alt: 'Apple MacBook Air M2',
    imageClass: 'hero-img-standard',
    themeBg: '#211a24',
    glowColor: 'rgba(236, 72, 153, 0.20)'
  }
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
  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const bannerRef = useRef(null);

  // Fetch top 5 sản phẩm bán chạy nhất từ Backend API
  useEffect(() => {
    let isMounted = true;
    productApi.getTopBestsellers()
      .then((bestsellers) => {
        if (!isMounted || !Array.isArray(bestsellers) || bestsellers.length === 0) return;

        // Lấy tối đa 5 sản phẩm bán chạy nhất
        const top5 = bestsellers.slice(0, 5);
        const mappedSlides = top5.map((product, idx) => {
          const { light, bold } = formatBannerTitle(product.name);
          const theme = SLIDE_THEMES[idx % SLIDE_THEMES.length];
          const kicker = BEST_SELLER_KICKERS[idx] || `Top ${idx + 1} Bán chạy`;

          // Lấy ảnh thật của sản phẩm: ưu tiên primaryImageUrl hoặc ảnh đầu tiên
          const realImage = product.primaryImageUrl 
            || (product.images && product.images[0]?.imageUrl) 
            || (FALLBACK_SLIDES[idx]?.image || heroIphoneDual);

          // Lấy mô tả tóm tắt nổi bật
          const desc = product.shortDescription 
            || (typeof product.description === 'string' && product.description.length > 0 ? product.description : null)
            || (FALLBACK_SLIDES[idx]?.description)
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
      })
      .catch((err) => {
        console.warn('HeroBanner bestsellers error, using fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
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

  const currentSlide = slides[currentIndex] || slides[0] || FALLBACK_SLIDES[0];

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
