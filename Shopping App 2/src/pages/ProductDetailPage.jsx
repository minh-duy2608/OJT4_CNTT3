import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  ShoppingCart, 
  Lock, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  Star, 
  Check, 
  Copy, 
  Zap, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Store,
  Layers,
  Sparkles,
  AlertCircle,
  Tag
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatVND } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { productApi } from '../services/productApi';
import { wishlistApi } from '../services/wishlistApi';
import { couponApi } from '../services/couponApi';
import { parseProductSpecs } from '../utils/productSpecs';
import './ProductDetailPage.css';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, showToast } = useCart();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [shopCoupons, setShopCoupons] = useState([]);

  // Model box yêu cầu đăng nhập
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);

  // Danh sách toàn bộ ảnh của sản phẩm phục vụ Gallery & Slider
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const urls = [];
    const seen = new Set();

    const addUrl = (url) => {
      if (url && typeof url === 'string') {
        const trimmed = url.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          urls.push(trimmed);
        }
      }
    };

    if (product.primaryImageUrl) addUrl(product.primaryImageUrl);
    if (product.image) addUrl(product.image);

    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (typeof img === 'string') addUrl(img);
        else if (img?.imageUrl) addUrl(img.imageUrl);
      });
    }

    if (Array.isArray(product?.variants)) {
      product.variants.forEach((v) => {
        if (v?.imageUrl) addUrl(v.imageUrl);
      });
    }

    return urls.length > 0 ? urls : [product?.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'];
  }, [product]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const thumbnailContainerRef = useRef(null);
  const thumbnailRefs = useRef([]);

  // Tự động cuộn thumbnail active vào giữa dải xem
  const scrollThumbnailToCenter = (index) => {
    const targetThumb = thumbnailRefs.current[index];
    const container = thumbnailContainerRef.current;
    if (targetThumb && container) {
      const containerWidth = container.offsetWidth;
      const targetLeft = targetThumb.offsetLeft;
      const targetWidth = targetThumb.offsetWidth;
      const scrollPos = targetLeft - (containerWidth / 2) + (targetWidth / 2);
      container.scrollTo({
        left: scrollPos,
        behavior: 'smooth'
      });
    }
  };

  // Đồng bộ index khi selectedImage hoặc galleryImages thay đổi
  useEffect(() => {
    if (galleryImages.length > 0) {
      if (selectedImage) {
        const idx = galleryImages.indexOf(selectedImage);
        if (idx !== -1) {
          setActiveImageIndex(idx);
          scrollThumbnailToCenter(idx);
        } else {
          setActiveImageIndex(0);
        }
      } else {
        setSelectedImage(galleryImages[0]);
        setActiveImageIndex(0);
      }
    }
  }, [galleryImages, selectedImage]);

  // Chọn ảnh bằng click trực tiếp
  const handleSelectImageByIndex = (index) => {
    if (index < 0 || index >= galleryImages.length) return;
    setActiveImageIndex(index);
    setSelectedImage(galleryImages[index]);
    scrollThumbnailToCenter(index);
  };

  // Nút Previous: quay về ảnh trước
  const handlePrevImage = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (galleryImages.length <= 1) return;
    const nextIdx = (activeImageIndex - 1 + galleryImages.length) % galleryImages.length;
    handleSelectImageByIndex(nextIdx);
  };

  // Nút Next: chuyển sang ảnh sau
  const handleNextImage = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (galleryImages.length <= 1) return;
    const nextIdx = (activeImageIndex + 1) % galleryImages.length;
    handleSelectImageByIndex(nextIdx);
  };

  // Cuộn thanh thumbnail sang trái hoặc phải
  const handleScrollThumbnails = (direction) => {
    if (thumbnailContainerRef.current) {
      const scrollAmount = direction === 'left' ? -164 : 164;
      thumbnailContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Touch Swipe Gesture (Điện thoại / Tablet)
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const isSwipingRef = useRef(false);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
    isSwipingRef.current = true;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isSwipingRef.current) return;
    isSwipingRef.current = false;
    const diff = touchStartXRef.current - touchEndXRef.current;
    const threshold = 40;
    if (diff > threshold) {
      handleNextImage();
    } else if (diff < -threshold) {
      handlePrevImage();
    }
  };

  // Mouse Drag Gesture (Desktop)
  const isMouseDownRef = useRef(false);
  const mouseStartXRef = useRef(0);

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    isMouseDownRef.current = true;
    mouseStartXRef.current = e.clientX;
  };

  const handleMouseUp = (e) => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    const diff = mouseStartXRef.current - e.clientX;
    const threshold = 50;
    if (diff > threshold) {
      handleNextImage();
    } else if (diff < -threshold) {
      handlePrevImage();
    }
  };

  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
  };

  // Kiểm tra sản phẩm đã nằm trong Wishlist chưa
  useEffect(() => {
    if (isAuthenticated && id) {
      wishlistApi.getWishlist()
        .then((res) => {
          const items = res?.items || [];
          setIsLiked(items.some((it) => String(it.productId) === String(id)));
        })
        .catch(() => {});
    }
  }, [id, isAuthenticated]);

  // Fetch product detail from API (STT 40)
  useEffect(() => {
    let isMounted = true;
    if (id) {
      setIsLoading(true);
      productApi.getProductById(id)
        .then((data) => {
          if (!isMounted || !data) return;
          const minP = data.minPrice ?? 0;
          const maxP = data.maxPrice ?? minP;
          const sortedImages = Array.isArray(data.images)
            ? [...data.images].sort((a, b) => (b.primary || b.isPrimary ? 1 : 0) - (a.primary || a.isPrimary ? 1 : 0))
            : [];
          const primaryImg = data.primaryImageUrl || sortedImages[0]?.imageUrl || '';

          const resolvedShopId = data.shopId || data.shop?.id || null;

          const liveProduct = {
            id: data.id,
            name: data.name,
            shortDescription: data.shortDescription || '',
            description: data.description || '',
            price: minP,
            formattedPrice: minP ? formatVND(minP) : 'Liên hệ',
            formattedOriginalPrice: maxP > minP ? formatVND(maxP) : (minP ? formatVND(minP * 1.1) : ''),
            image: primaryImg,
            primaryImageUrl: primaryImg,
            images: sortedImages,
            variants: data.variants || [],
            category: data.categoryName || data.category?.name || 'Công nghệ',
            categoryId: data.categoryId || data.category?.id,
            brand: data.brandName || data.brand?.name || 'Cyber Official',
            brandLogo: data.brand?.logoUrl,
            shopId: resolvedShopId,
            shop: data.shopName || data.shop?.name || 'Cyber Flagship Store',
            inStock: data.inStock !== false,
            warrantyMonths: data.warrantyMonths || 12
          };

          setProduct(liveProduct);
          setSelectedImage(primaryImg);

          // Tải mã giảm giá của cửa hàng (STT 89)
          if (resolvedShopId) {
            couponApi.getShopCoupons(resolvedShopId)
              .then((coupons) => {
                if (isMounted && Array.isArray(coupons)) {
                  setShopCoupons(coupons);
                }
              })
              .catch(() => {});
          }

          // Tải sản phẩm liên quan cùng danh mục từ Backend API
          if (data.categoryId) {
            productApi.getProducts({ categoryId: data.categoryId, size: 5 })
              .then((relRes) => {
                if (!isMounted) return;
                const items = (relRes?.content || []).filter((p) => String(p.id) !== String(data.id)).slice(0, 4);
                setRelatedProducts(items);
              })
              .catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('API getProductById error:', err);
          if (isMounted) setProduct(null);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  // 1. Phân tích các thông số kỹ thuật (Specifications) từ mô tả sản phẩm
  const { specs, cleanDescription } = useMemo(() => {
    return parseProductSpecs(product?.description || '');
  }, [product?.description]);

  // 2. Phân tích các biến thể (Variants): Tách biệt Dung lượng / Phiên bản và Màu sắc
  const { storageOptions, colorOptions, variantsMap } = useMemo(() => {
    const rawVariants = Array.isArray(product?.variants) ? product.variants : [];
    const storages = new Set();
    const colors = new Set();
    const map = {};

    rawVariants.forEach((v) => {
      let color = '';
      let storage = '';

      if (v.attributes) {
        try {
          const attr = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
          if (attr.color) color = attr.color;
          if (attr.storage) storage = attr.storage;
        } catch {}
      }

      if (!color || !storage) {
        const matchStorage = (v.variantName || '').match(/\b(64GB|128GB|256GB|512GB|1TB|2TB)\b/i);
        if (matchStorage) storage = matchStorage[1].toUpperCase();

        const matchColor = (v.variantName || '')
          .replace(/\b(64GB|128GB|256GB|512GB|1TB|2TB)\b/gi, '')
          .replace(/iPhone|Samsung|Sony|Dell|Asus|Xiaomi|\d+/gi, '')
          .trim();
        if (matchColor) color = matchColor;
      }

      if (!color) color = 'Tiêu chuẩn';
      if (!storage) storage = v.variantName || 'Tiêu chuẩn';

      storages.add(storage);
      colors.add(color);
      map[`${color}_${storage}`] = v;
      if (!map[`storage_${storage}`]) map[`storage_${storage}`] = v;
      if (!map[`color_${color}`]) map[`color_${color}`] = v;
    });

    const storagesList = Array.from(storages);
    const colorsList = Array.from(colors);

    return {
      storageOptions: storagesList.length > 0 ? storagesList : ['128GB', '256GB', '512GB'],
      colorOptions: colorsList.length > 0 ? colorsList : ['Đen', 'Bạc', 'Tự Nhiên', 'Vàng'],
      variantsMap: map
    };
  }, [product?.variants]);

  // Xử lý Thêm/Xóa sản phẩm vào Danh sách yêu thích (Wishlist - STT 80, 81)
  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }
    try {
      if (isLiked) {
        await wishlistApi.removeFromWishlist(id);
        setIsLiked(false);
        showToast('Đã xóa khỏi danh sách yêu thích');
      } else {
        await wishlistApi.addToWishlist(id);
        setIsLiked(true);
        showToast('Đã thêm sản phẩm vào danh sách yêu thích');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi thao tác yêu thích', 'error');
    }
  };

  // State chọn phiên bản & màu sắc - Khởi tạo rỗng để người dùng BẮT BUỘC phải bấm chọn trước khi mua
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [attemptedAction, setAttemptedAction] = useState(false);

  // Tìm biến thể khớp nhất với cấu hình đang chọn
  const matchedVariant = useMemo(() => {
    if (!selectedColor && !selectedStorage) return null;
    return (
      variantsMap[`${selectedColor}_${selectedStorage}`] ||
      (selectedStorage ? variantsMap[`storage_${selectedStorage}`] : null) ||
      (selectedColor ? variantsMap[`color_${selectedColor}`] : null) ||
      (Array.isArray(product?.variants) ? product.variants[0] : null)
    );
  }, [variantsMap, selectedColor, selectedStorage, product?.variants]);

  // Tự động chuyển ảnh hiển thị khi người dùng đổi màu sắc / biến thể có ảnh riêng
  useEffect(() => {
    if (matchedVariant?.imageUrl) {
      setSelectedImage(matchedVariant.imageUrl);
    }
  }, [matchedVariant]);

  // Tính toán giá tiền bán và giá gốc động theo phiên bản đang chọn
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    if (matchedVariant) {
      return Number(matchedVariant.salePrice || matchedVariant.price || product.price || 0);
    }
    let extra = 0;
    if (selectedStorage === '256GB') extra = 2500000;
    else if (selectedStorage === '512GB') extra = 5500000;
    else if (selectedStorage === '1TB') extra = 9500000;
    return Number(product.price || 15000000) + extra;
  }, [matchedVariant, selectedStorage, product?.price]);

  const originalPrice = useMemo(() => {
    if (!product) return null;
    if (matchedVariant && matchedVariant.salePrice && matchedVariant.price > matchedVariant.salePrice) {
      return Number(matchedVariant.price);
    }
    if (product.formattedOriginalPrice) {
      return Math.round(currentPrice * 1.15);
    }
    return null;
  }, [matchedVariant, product?.formattedOriginalPrice, currentPrice]);

  const discountPercent = useMemo(() => {
    if (originalPrice && originalPrice > currentPrice) {
      return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }
    return null;
  }, [originalPrice, currentPrice]);

  const stockQuantity = matchedVariant?.stockQuantity ?? (product?.inStock ? 100 : 0);

  // Xử lý Thêm vào giỏ hàng trực tiếp từ trang chi tiết (Yêu cầu phải chọn phiên bản & màu sắc)
  const handleAddToCart = () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }

    if (!selectedStorage || !selectedColor) {
      setAttemptedAction(true);
      showToast('Vui lòng chọn Phiên bản và Màu sắc sản phẩm trước khi thêm vào giỏ hàng!', 'warning');
      return;
    }

    const configuredProduct = {
      ...product,
      id: matchedVariant ? `${product.id}-${matchedVariant.id}` : `${product.id}-${selectedColor}-${selectedStorage}`,
      productId: product.id,
      variantId: matchedVariant?.id,
      name: `${product.name} (${selectedColor}, ${selectedStorage})`,
      price: currentPrice,
      formattedPrice: formatVND(currentPrice),
      image: selectedImage || product.image,
      selectedColor,
      selectedStorage
    };

    const mainImg = document.querySelector('.detail-main-img');
    const startRect = mainImg ? mainImg.getBoundingClientRect() : null;
    addToCart(configuredProduct, quantity, { fly: true, startRect });
    showToast(`Đã thêm ${quantity}x "${configuredProduct.name}" vào giỏ hàng!`, 'success');
  };

  // Xử lý Mua ngay:
  // CHỈ thanh toán DUY NHẤT sản phẩm vừa chọn, TUYỆT ĐỐI KHÔNG đưa vào giỏ hay thanh toán cả giỏ hàng
  const handleBuyNow = () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }

    if (!selectedStorage || !selectedColor) {
      setAttemptedAction(true);
      showToast('Vui lòng chọn Phiên bản và Màu sắc sản phẩm trước khi mua ngay!', 'warning');
      return;
    }

    const buyNowItem = {
      id: matchedVariant ? `${product.id}-${matchedVariant.id}` : `${product.id}-${selectedColor}-${selectedStorage}`,
      productId: product.id,
      variantId: matchedVariant?.id,
      name: `${product.name} (${selectedColor}, ${selectedStorage})`,
      price: currentPrice,
      formattedPrice: formatVND(currentPrice),
      image: selectedImage || product.image,
      selectedColor,
      selectedStorage,
      quantity,
      shop: product.shop,
      brand: product.brand,
      warrantyMonths: product.warrantyMonths
    };

    // Lưu vào sessionStorage để reload trang checkout vẫn giữ nguyên đúng sản phẩm này
    try {
      sessionStorage.setItem('CYBER_BUY_NOW_ITEM', JSON.stringify(buyNowItem));
      sessionStorage.removeItem('CYBER_FROM_CART');
    } catch (e) {
      console.warn('SessionStorage error:', e);
    }

    // Chuyển hướng sang Checkout với duy nhất buyNowItem, KHÔNG gọi addToCart
    navigate('/checkout', { state: { buyNowItem } });
  };

  // Sao chép link mua hàng vào clipboard
  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  if (isLoading || !product) {
    return (
      <div className="container detail-page-wrapper" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #e4e4e7', borderTopColor: '#000000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: '#71717a', fontSize: '0.95rem', fontWeight: 500 }}>
          {isLoading ? 'Đang tải thông tin chi tiết sản phẩm...' : 'Không tìm thấy thông tin sản phẩm.'}
        </p>
        {!isLoading && !product && (
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/products" className="detail-btn-cart" style={{ display: 'inline-flex', padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
              Quay lại danh sách sản phẩm
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container detail-page-wrapper">
      {/* 1. Breadcrumbs Điều hướng */}
      <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">Trang chủ</Link>
        <ChevronRight size={14} className="breadcrumb-separator" />
        <Link to="/products" className="breadcrumb-link">Sản phẩm</Link>
        <ChevronRight size={14} className="breadcrumb-separator" />
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      {/* 2. Lưới chính: Showcase Ảnh & Thông tin đặt mua */}
      <div className="detail-main-grid">
        {/* Khối Ảnh Sản Phẩm (Interactive Gallery with Swiping & Thumbnails) */}
        <div className="detail-image-showcase">
          <div 
            className="detail-main-image-box"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: galleryImages.length > 1 ? 'grab' : 'default' }}
          >
            {/* Wishlist Button */}
            <button 
              type="button" 
              className={`detail-wishlist-float ${isLiked ? 'is-active' : ''}`}
              onClick={handleToggleWishlist}
              aria-label={isLiked ? "Bỏ yêu thích" : "Yêu thích"}
            >
              <Heart size={22} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : '#a1a1aa'} />
            </button>

            {/* Previous Image Arrow */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                className="detail-gallery-nav-btn prev"
                onClick={handlePrevImage}
                aria-label="Xem ảnh trước"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Large Product Image */}
            <img 
              key={activeImageIndex}
              src={selectedImage || galleryImages[0] || product.image} 
              alt={product.name} 
              className="detail-main-img" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';
              }}
            />

            {/* Next Image Arrow */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                className="detail-gallery-nav-btn next"
                onClick={handleNextImage}
                aria-label="Xem ảnh sau"
              >
                <ChevronRight size={22} />
              </button>
            )}

            {/* Image Indicator (1 / N) */}
            {galleryImages.length > 1 && (
              <span className="detail-gallery-indicator">
                {activeImageIndex + 1} / {galleryImages.length}
              </span>
            )}
          </div>

          {/* Dải ảnh thu nhỏ (Thumbnail Carousel - Hiển thị 5 ảnh & Cuộn mượt mà) */}
          {galleryImages.length > 1 && (
            <div className="detail-thumbnail-carousel">
              {galleryImages.length > 5 && (
                <button
                  type="button"
                  className="detail-thumb-scroll-btn prev"
                  onClick={() => handleScrollThumbnails('left')}
                  aria-label="Cuộn thumbnail sang trái"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              <div className="detail-thumbnails-track" ref={thumbnailContainerRef}>
                {galleryImages.map((imgUrl, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={idx}
                      ref={(el) => (thumbnailRefs.current[idx] = el)}
                      type="button"
                      className={`detail-thumbnail-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleSelectImageByIndex(idx)}
                      aria-label={`Xem ảnh thứ ${idx + 1}`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${product.name} thumbnail ${idx + 1}`}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200';
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {galleryImages.length > 5 && (
                <button
                  type="button"
                  className="detail-thumb-scroll-btn next"
                  onClick={() => handleScrollThumbnails('right')}
                  aria-label="Cuộn thumbnail sang phải"
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Khối Thông Tin & Tác Vụ Mua Hàng */}
        <div className="detail-info-col">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span className="detail-brand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {product.brandLogo && (
                <img src={product.brandLogo} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
              )}
              {product.brand || 'Cyber Official Store'}
            </span>
            {product.shop && (
              <span style={{ fontSize: '0.8rem', color: '#71717a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Store size={13} /> {product.shop}
              </span>
            )}
          </div>

          <h1 className="detail-product-title">{product.name}</h1>

          {/* Đánh giá & Tình trạng kho */}
          <div className="detail-rating-row">
            <div className="stars-group">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
              ))}
            </div>
            <span className="reviews-count">(142 đánh giá của khách hàng)</span>
            <span className="stock-status-badge">
              <Check size={12} strokeWidth={3} /> {stockQuantity > 0 ? `Còn hàng (${stockQuantity} sản phẩm)` : 'Tạm hết hàng'}
            </span>
          </div>

          {/* Hộp Giá Tiền Tương Ứng (Tự động cập nhật theo Phiên bản & Màu sắc) */}
          <div className="detail-price-box">
            <span className="detail-current-price">{formatVND(currentPrice)}</span>
            {originalPrice && originalPrice > currentPrice && (
              <span className="detail-original-price">{formatVND(originalPrice)}</span>
            )}
            {discountPercent && (
              <span className="detail-discount-pill">-{discountPercent}% OFF</span>
            )}
            {(!selectedStorage || !selectedColor) && (
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                (Giá dự kiến theo phiên bản)
              </span>
            )}
          </div>

          {/* Mã giảm giá của Cửa hàng (Coupons - STT 89) */}
          {shopCoupons.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={15} /> Voucher Shop:
              </span>
              {shopCoupons.map((c) => (
                <span
                  key={c.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#ecfdf5',
                    border: '1px dashed #059669',
                    color: '#065f46',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                  title={c.description || `Giảm ${c.discountType === 'PERCENT' ? `${c.discountValue}%` : formatVND(c.discountValue)}`}
                >
                  {c.code} ({c.discountType === 'PERCENT' ? `-${c.discountValue}%` : `-${formatVND(c.discountValue)}`})
                </span>
              ))}
            </div>
          )}

          {/* Cảnh báo khi người dùng bấm Mua ngay mà chưa chọn phiên bản & màu sắc */}
          {attemptedAction && (!selectedStorage || !selectedColor) && (
            <div className="detail-selection-alert">
              <AlertCircle size={18} />
              <span>
                Vui lòng chọn <strong>{!selectedStorage && !selectedColor ? 'Phiên bản và Màu sắc' : (!selectedStorage ? 'Phiên bản / Dung lượng' : 'Màu sắc')}</strong> bên dưới trước khi đặt mua!
              </span>
            </div>
          )}

          {/* =================================================================== */}
          {/* 1. CHỌN PHIÊN BẢN / DUNG LƯỢNG */}
          {/* =================================================================== */}
          <div className={`detail-variant-group ${attemptedAction && !selectedStorage ? 'is-unselected' : ''}`}>
            <span className="variant-label">
              1. Phiên bản / Dung lượng: {selectedStorage ? (
                <strong style={{ color: '#000000' }}>{selectedStorage}</strong>
              ) : (
                <span className="selection-required-hint">⚠️ (Vui lòng chọn)</span>
              )}
            </span>
            <div className="storage-options-row">
              {storageOptions.map((storage) => (
                <button
                  key={storage}
                  type="button"
                  className={`storage-pill-btn ${selectedStorage === storage ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedStorage(storage);
                    setAttemptedAction(false);
                  }}
                >
                  {selectedStorage === storage && <Check size={14} style={{ display: 'inline', marginRight: '4px' }} />}
                  {storage}
                </button>
              ))}
            </div>
          </div>

          {/* =================================================================== */}
          {/* 2. CHỌN MÀU SẮC (NẰM BÊN DƯỚI PHIÊN BẢN) */}
          {/* =================================================================== */}
          <div className={`detail-variant-group ${attemptedAction && !selectedColor ? 'is-unselected' : ''}`}>
            <span className="variant-label">
              2. Màu sắc: {selectedColor ? (
                <strong style={{ color: '#000000' }}>{selectedColor}</strong>
              ) : (
                <span className="selection-required-hint">⚠️ (Vui lòng chọn)</span>
              )}
            </span>
            <div className="color-options-row">
              {colorOptions.map((color) => {
                const cLower = color.toLowerCase();
                let bg = '#18181b';
                if (cLower.includes('trắng') || cLower.includes('white')) bg = '#f8fafc';
                else if (cLower.includes('bạc') || cLower.includes('silver')) bg = '#e2e8f0';
                else if (cLower.includes('vàng') || cLower.includes('gold')) bg = '#fef08a';
                else if (cLower.includes('sa mạc') || cLower.includes('desert')) bg = '#d97706';
                else if (cLower.includes('tự nhiên') || cLower.includes('natural')) bg = '#94a3b8';
                else if (cLower.includes('xanh') || cLower.includes('blue')) bg = '#3b82f6';
                else if (cLower.includes('hồng') || cLower.includes('pink')) bg = '#f472b6';

                return (
                  <button
                    key={color}
                    type="button"
                    className={`detail-color-pill ${selectedColor === color ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedColor(color);
                      setAttemptedAction(false);
                    }}
                  >
                    <span className="detail-color-dot" style={{ backgroundColor: bg }} />
                    <span>{color}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================================================== */}
          {/* 3. CÔNG NGHỆ & ĐẶC ĐIỂM NỔI BẬT */}
          {/* =================================================================== */}
          {product.shortDescription && (
            <div className="detail-highlights-box">
              <div className="detail-highlights-header">
                <Sparkles size={16} color="#d97706" />
                <span>Công nghệ & Đặc điểm nổi bật</span>
              </div>
              <div className="detail-highlights-content">
                {product.shortDescription}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 4. SỐ LƯỢNG & TÁC VỤ MUA HÀNG (TRỰC TIẾP TRÊN TRANG CHI TIẾT) */}
          {/* =================================================================== */}
          <div className="detail-actions-row">
            {/* Bộ điều khiển số lượng */}
            <div className="quantity-control">
              <button
                type="button"
                className="quantity-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Giảm số lượng"
              >
                -
              </button>
              <span className="quantity-value">{quantity}</span>
              <button
                type="button"
                className="quantity-btn"
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Tăng số lượng"
              >
                +
              </button>
            </div>

            {/* Nút Thêm vào giỏ hàng */}
            <button 
              type="button" 
              className="detail-btn-cart"
              onClick={handleAddToCart}
            >
              <ShoppingCart size={18} />
              <span>Thêm vào giỏ hàng</span>
            </button>

            {/* Nút Mua ngay */}
            <button 
              type="button" 
              className="detail-btn-buy"
              onClick={handleBuyNow}
            >
              <Zap size={18} />
              <span>Mua ngay</span>
            </button>
          </div>

          {/* Thông báo chế độ khách */}
          {!isAuthenticated && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', color: '#b45309', fontSize: '0.8125rem' }}>
              🔒 Vui lòng đăng nhập để hoàn tất thanh toán hoặc lưu sản phẩm vào giỏ hàng tài khoản của bạn.
            </div>
          )}

          {/* Hộp Link Mua Hàng & Chia Sẻ Trực Tiếp */}
          <div className="purchase-link-box">
            <div className="purchase-link-text">
              <Share2 size={16} color="#64748b" />
              <span>Link mua hàng: <strong>{window.location.origin}/products/{product.id}</strong></span>
            </div>
            <button 
              type="button" 
              className={`copy-link-btn ${copiedLink ? 'copied' : ''}`}
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <>
                  <Check size={14} />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Sao chép link</span>
                </>
              )}
            </button>
          </div>

          {/* Cam kết bán hàng */}
          <div className="detail-trust-list">
            <div className="trust-item">
              <Truck size={20} color="#2563eb" />
              <span>Miễn phí giao hàng toàn quốc</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={20} color="#10b981" />
              <span>Bảo hành {product.warrantyMonths || 12} tháng</span>
            </div>
            <div className="trust-item">
              <RefreshCw size={20} color="#f59e0b" />
              <span>Đổi mới trong 30 ngày nếu lỗi</span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. BẢNG THÔNG SỐ KỸ THUẬT CHI TIẾT (DYNAMIC SPECIFICATIONS TABLE) */}
      {/* =================================================================== */}
      <section className="detail-specs-section">
        <h2 className="detail-specs-title">Thông số kỹ thuật {product.name}</h2>
        {specs.length > 0 ? (
          <table className="specs-table">
            <tbody>
              {specs.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="specs-table">
            <tbody>
              <tr>
                <td>Thương hiệu</td>
                <td>{product.brand || 'Cyber Official Store'}</td>
              </tr>
              <tr>
                <td>Dòng sản phẩm</td>
                <td>{product.name}</td>
              </tr>
              <tr>
                <td>Thời hạn bảo hành</td>
                <td>{product.warrantyMonths || 12} tháng chính hãng</td>
              </tr>
              <tr>
                <td>Tình trạng</td>
                <td>Mới 100% nguyên hộp, chính hãng phân phối tại Việt Nam</td>
              </tr>
              <tr>
                <td>Bộ sản phẩm gồm</td>
                <td>Thân máy, Cáp sạc, Hướng dẫn sử dụng, Thẻ bảo hành</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Nội dung bài viết mô tả chi tiết nếu có */}
        {cleanDescription && (
          <div style={{ marginTop: '2.5rem', background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
              Mô tả chi tiết sản phẩm
            </h3>
            <p style={{ lineHeight: 1.75, color: '#334155', whiteSpace: 'pre-line', fontSize: '0.9375rem' }}>
              {cleanDescription}
            </p>
          </div>
        )}
      </section>

      {/* 6. Sản phẩm tương tự */}
      <section style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid #e4e4e7' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#000000', marginBottom: '2rem' }}>
          Sản phẩm tương tự bạn có thể thích
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {relatedProducts.map((relProd) => (
            <ProductCard key={relProd.id} product={relProd} />
          ))}
        </div>
      </section>

      {/* 7. MODEL BOX: THÔNG BÁO YÊU CẦU ĐĂNG NHẬP */}
      <ConfirmModal
        isOpen={showAuthRequiredModal}
        onClose={() => setShowAuthRequiredModal(false)}
        type="confirm"
        title="Yêu cầu đăng nhập"
        message="Vui lòng đăng nhập tài khoản Cyber để lựa chọn cấu hình, màu sắc và thực hiện đặt mua sản phẩm."
        confirmText="Đăng nhập ngay"
        cancelText="Để sau"
        onConfirm={() => {
          setShowAuthRequiredModal(false);
          navigate('/auth?mode=login');
        }}
      />
    </div>
  );
};
