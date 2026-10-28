import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import heroIphoneDual from '../assets/hero-iphone-dual.png';
import galaxyFoldImg from '../assets/products/galaxy-fold.png';
import appleWatchImg from '../assets/products/apple-watch.png';
import airpodsMaxImg from '../assets/products/airpods-max.png';
import cameraImg from '../assets/products/blackmagic-camera.png';
import './HeroBanner.css';

// Danh sách các banner sản phẩm Best Sale động chuẩn thiết kế Figma
const BEST_SALE_SLIDES = [
  {
    id: 'slide-1',
    productId: 'prod-1',
    kicker: 'Đột phá công nghệ',
    titleLight: 'iPhone 14 ',
    titleBold: 'Pro',
    description: 'Được tạo ra để thay đổi mọi thứ để tốt hơn. Cho tất cả mọi người',
    buttonText: 'Mua ngay',
    image: heroIphoneDual,
    alt: 'Apple iPhone 14 Pro',
    imageClass: 'hero-img-dual-phone',
    themeBg: '#211c24',
    glowColor: 'rgba(168, 85, 247, 0.18)'
  },
  {
    id: 'slide-2',
    productId: 'prod-6',
    kicker: 'Đa nhiệm thế hệ mới',
    titleLight: 'Galaxy Z ',
    titleBold: 'Fold 5',
    description: 'Màn hình gập đỉnh cao mở ra kỷ nguyên mới. Hiệu năng vượt trội trong tầm tay',
    buttonText: 'Mua ngay',
    image: galaxyFoldImg,
    alt: 'Samsung Galaxy Z Fold 5',
    imageClass: 'hero-img-standard',
    themeBg: '#171822',
    glowColor: 'rgba(59, 130, 246, 0.18)'
  },
  {
    id: 'slide-3',
    productId: 'prod-3',
    kicker: 'Đồng hành mọi thử thách',
    titleLight: 'Apple Watch ',
    titleBold: 'Series 9',
    description: 'Chip S9 SiP tiên tiến, thao tác chạm hai lần kỳ diệu và theo dõi sức khỏe chuyên sâu',
    buttonText: 'Mua ngay',
    image: appleWatchImg,
    alt: 'Apple Watch Series 9',
    imageClass: 'hero-img-standard',
    themeBg: '#1c1c23',
    glowColor: 'rgba(245, 158, 11, 0.16)'
  },
  {
    id: 'slide-4',
    productId: 'prod-4',
    kicker: 'Âm thanh nguyên bản',
    titleLight: 'AirPods ',
    titleBold: 'Max',
    description: 'Chống Ồn Chủ Động hàng đầu với chế độ Xuyên Âm và Spatial Audio sống động như rạp hát',
    buttonText: 'Mua ngay',
    image: airpodsMaxImg,
    alt: 'AirPods Max Silver',
    imageClass: 'hero-img-standard',
    themeBg: '#211a24',
    glowColor: 'rgba(236, 72, 153, 0.16)'
  },
  {
    id: 'slide-5',
    productId: 'prod-2',
    kicker: 'Chuẩn điện ảnh chuyên nghiệp',
    titleLight: 'Blackmagic ',
    titleBold: 'Cinema 6K',
    description: 'Cảm biến Super 35 HDR độ phân giải 6144 x 3456, dải màu 13 stops chân thực từng khung hình',
    buttonText: 'Mua ngay',
    image: cameraImg,
    alt: 'Blackmagic Pocket Cinema Camera 6k',
    imageClass: 'hero-img-standard',
    themeBg: '#181c20',
    glowColor: 'rgba(16, 185, 129, 0.16)'
  }
];

export const HeroBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const bannerRef = useRef(null);

  const totalSlides = BEST_SALE_SLIDES.length;

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
    if (isPaused) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Điều hướng bằng phím mũi tên bàn phím khi banner được focus
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  };

  const currentSlide = BEST_SALE_SLIDES[currentIndex];

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
      aria-label="Banner sản phẩm công nghệ nổi bật"
    >
      {/* Nút lùi slide trước (Đặt ở sát lề ngoài, không che chữ) */}
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

          {/* Cột phải: Hình ảnh sản phẩm trực quan */}
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
              />
            </div>
          </div>
        </div>

        {/* Thanh chỉ báo Slide (Dots/Pills) ở giữa đáy banner */}
        <div className="hero-dots-container" role="tablist" aria-label="Chuyển banner">
          {BEST_SALE_SLIDES.map((slide, index) => (
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

      {/* Nút tiến slide sau (Đặt ở sát lề ngoài, không che ảnh) */}
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
