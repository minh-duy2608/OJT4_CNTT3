import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  Store,
  Layers,
  Sparkles
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { INITIAL_PRODUCTS, formatVND } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { productApi } from '../services/productApi';
import { parseProductSpecs } from '../utils/productSpecs';
import './ProductDetailPage.css';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, showToast } = useCart();
  const { isAuthenticated } = useAuth();

  // Tìm sản phẩm mock dự phòng
  const fallbackProduct = INITIAL_PRODUCTS.find((p) => String(p.id) === String(id)) || INITIAL_PRODUCTS[0];

  const [product, setProduct] = useState(fallbackProduct);
  const [selectedImage, setSelectedImage] = useState(fallbackProduct.image);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(fallbackProduct.isLiked));
  const [copiedLink, setCopiedLink] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Model box yêu cầu đăng nhập
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);

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
          const primaryImg = data.primaryImageUrl || (data.images && data.images[0]?.imageUrl) || fallbackProduct.image;

          const liveProduct = {
            id: data.id,
            name: data.name,
            shortDescription: data.shortDescription || '',
            description: data.description || fallbackProduct.description || '',
            price: minP,
            formattedPrice: minP ? formatVND(minP) : 'Liên hệ',
            formattedOriginalPrice: maxP > minP ? formatVND(maxP) : (minP ? formatVND(minP * 1.1) : ''),
            image: primaryImg,
            primaryImageUrl: primaryImg,
            images: data.images || [],
            variants: data.variants || [],
            category: data.category?.name || fallbackProduct.category,
            brand: data.brand?.name || 'Cyber Official',
            brandLogo: data.brand?.logoUrl,
            shop: data.shop?.name || 'Cyber Flagship Store',
            inStock: data.inStock !== false,
            warrantyMonths: data.warrantyMonths || 12
          };

          setProduct(liveProduct);
          setSelectedImage(primaryImg);
        })
        .catch((err) => {
          console.warn('API getProductById fallback to mock:', err);
          const found = INITIAL_PRODUCTS.find((p) => String(p.id) === String(id)) || INITIAL_PRODUCTS[0];
          setProduct(found);
          setSelectedImage(found.image);
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
    return parseProductSpecs(product.description || '');
  }, [product.description]);

  // 2. Phân tích các biến thể (Variants): Tách biệt Dung lượng / Phiên bản và Màu sắc
  const { storageOptions, colorOptions, variantsMap } = useMemo(() => {
    const rawVariants = Array.isArray(product.variants) ? product.variants : [];
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
  }, [product.variants]);

  // State chọn phiên bản & màu sắc
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  // Tự động đồng bộ lựa chọn đầu tiên khi danh sách phiên bản/màu sắc tải xong
  useEffect(() => {
    if (storageOptions.length > 0 && !selectedStorage) {
      setSelectedStorage(storageOptions[0]);
    }
  }, [storageOptions, selectedStorage]);

  useEffect(() => {
    if (colorOptions.length > 0 && !selectedColor) {
      setSelectedColor(colorOptions[0]);
    }
  }, [colorOptions, selectedColor]);

  // Tìm biến thể khớp nhất với cấu hình đang chọn
  const matchedVariant = useMemo(() => {
    return (
      variantsMap[`${selectedColor}_${selectedStorage}`] ||
      variantsMap[`storage_${selectedStorage}`] ||
      variantsMap[`color_${selectedColor}`] ||
      (Array.isArray(product.variants) ? product.variants[0] : null)
    );
  }, [variantsMap, selectedColor, selectedStorage, product.variants]);

  // Tính toán giá tiền bán và giá gốc động theo phiên bản đang chọn
  const currentPrice = useMemo(() => {
    if (matchedVariant) {
      return Number(matchedVariant.salePrice || matchedVariant.price || product.price);
    }
    let extra = 0;
    if (selectedStorage === '256GB') extra = 2500000;
    else if (selectedStorage === '512GB') extra = 5500000;
    else if (selectedStorage === '1TB') extra = 9500000;
    return Number(product.price || 15000000) + extra;
  }, [matchedVariant, selectedStorage, product.price]);

  const originalPrice = useMemo(() => {
    if (matchedVariant && matchedVariant.salePrice && matchedVariant.price > matchedVariant.salePrice) {
      return Number(matchedVariant.price);
    }
    if (product.formattedOriginalPrice) {
      return Math.round(currentPrice * 1.15);
    }
    return null;
  }, [matchedVariant, product.formattedOriginalPrice, currentPrice]);

  const discountPercent = useMemo(() => {
    if (originalPrice && originalPrice > currentPrice) {
      return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }
    return null;
  }, [originalPrice, currentPrice]);

  const stockQuantity = matchedVariant?.stockQuantity ?? (product.inStock ? 100 : 0);

  // Xử lý Thêm vào giỏ hàng trực tiếp từ trang chi tiết
  const handleAddToCart = () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }

    const configuredProduct = {
      ...product,
      id: matchedVariant ? `${product.id}-${matchedVariant.id}` : `${product.id}-${selectedColor}-${selectedStorage}`,
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

  // Xử lý Mua ngay: Thêm vào giỏ và chuyển thẳng sang Checkout
  const handleBuyNow = () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }

    const configuredProduct = {
      ...product,
      id: matchedVariant ? `${product.id}-${matchedVariant.id}` : `${product.id}-${selectedColor}-${selectedStorage}`,
      variantId: matchedVariant?.id,
      name: `${product.name} (${selectedColor}, ${selectedStorage})`,
      price: currentPrice,
      formattedPrice: formatVND(currentPrice),
      image: selectedImage || product.image,
      selectedColor,
      selectedStorage
    };

    addToCart(configuredProduct, quantity, { fly: false });
    navigate('/checkout');
  };

  // Sao chép link mua hàng vào clipboard
  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Các sản phẩm tương tự
  const relatedProducts = INITIAL_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 4);

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
        {/* Khối Ảnh Sản Phẩm */}
        <div className="detail-image-showcase">
          <div className="detail-main-image-box">
            <button 
              type="button" 
              className={`detail-wishlist-float ${isLiked ? 'is-active' : ''}`}
              onClick={() => setIsLiked(!isLiked)}
              aria-label={isLiked ? "Bỏ yêu thích" : "Yêu thích"}
            >
              <Heart size={22} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : '#a1a1aa'} />
            </button>

            <img 
              src={selectedImage || product.image} 
              alt={product.name} 
              className="detail-main-img" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';
              }}
            />
          </div>

          {/* Dải ảnh thu nhỏ (Gallery Thumbnails) */}
          {Array.isArray(product.images) && product.images.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {product.images.map((imgObj, idx) => (
                <button
                  key={imgObj.id || idx}
                  type="button"
                  onClick={() => setSelectedImage(imgObj.imageUrl)}
                  style={{
                    border: (selectedImage === imgObj.imageUrl) ? '2px solid #000000' : '1px solid #e4e4e7',
                    borderRadius: '8px',
                    padding: '3px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    width: '64px',
                    height: '64px',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={imgObj.imageUrl}
                    alt={`${product.name} ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </button>
              ))}
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
          </div>

          {/* =================================================================== */}
          {/* 1. CHỌN PHIÊN BẢN / DUNG LƯỢNG */}
          {/* =================================================================== */}
          <div className="detail-variant-group">
            <span className="variant-label">
              1. Phiên bản / Dung lượng: <strong>{selectedStorage}</strong>
            </span>
            <div className="storage-options-row">
              {storageOptions.map((storage) => (
                <button
                  key={storage}
                  type="button"
                  className={`storage-pill-btn ${selectedStorage === storage ? 'is-active' : ''}`}
                  onClick={() => setSelectedStorage(storage)}
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
          <div className="detail-variant-group">
            <span className="variant-label">
              2. Màu sắc: <strong>{selectedColor}</strong>
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
                    onClick={() => setSelectedColor(color)}
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
