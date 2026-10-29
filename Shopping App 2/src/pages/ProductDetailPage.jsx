import React, { useState, useEffect } from 'react';
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
  SlidersHorizontal,
  Store
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { INITIAL_PRODUCTS, formatVND } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { VariantSelectionModal } from '../components/VariantSelectionModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { productApi } from '../services/productApi';
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
            description: data.description || fallbackProduct.description,
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
            inStock: data.inStock !== false
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

  // Trạng thái mở Hộp thoại chọn biến thể & số lượng
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('cart'); // 'cart' hoặc 'buy'

  // Model box yêu cầu đăng nhập
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);

  // Kích hoạt khi bấm nút "Thêm vào giỏ hàng"
  const handleOpenAddToCart = () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }
    setModalMode('cart');
    setIsModalOpen(true);
  };

  // Kích hoạt khi bấm nút "Mua ngay"
  const handleOpenBuyNow = () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }
    setModalMode('buy');
    setIsModalOpen(true);
  };

  // Callback xác nhận từ Hộp thoại chọn cấu hình
  const handleConfirmVariant = (configuredProduct) => {
    setIsModalOpen(false);

    if (modalMode === 'buy') {
      // Khi bấm xác nhận mua ngay -> Thêm vào giỏ và chuyển thẳng sang trang thanh toán (/checkout)
      addToCart(configuredProduct, configuredProduct.quantity, { fly: false });
      navigate('/checkout');
    } else {
      // Khi bấm thêm vào giỏ hàng:
      // Kích hoạt hiệu ứng sản phẩm thu nhỏ bay vào giỏ hàng kiểu Shopee và KHÔNG HIỆN modal xác nhận
      const mainImg = document.querySelector('.detail-main-img');
      const startRect = mainImg ? mainImg.getBoundingClientRect() : null;
      addToCart(configuredProduct, configuredProduct.quantity, { fly: true, startRect });
    }
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
              <Check size={12} strokeWidth={3} /> {product.inStock ? 'Còn hàng' : 'Tạm hết hàng'}
            </span>
          </div>

          {/* Hộp Giá Tiền Việt Nam Đồng */}
          <div className="detail-price-box">
            <span className="detail-current-price">{product.formattedPrice}</span>
            {product.formattedOriginalPrice && (
              <span className="detail-original-price">{product.formattedOriginalPrice}</span>
            )}
            <span className="detail-discount-pill">-15% OFF</span>
          </div>

          <p className="detail-description">{product.description}</p>

          {/* Biến thể hiện có (nếu có từ Backend API 41) */}
          {Array.isArray(product.variants) && product.variants.length > 0 && (
            <div style={{ marginBottom: '1.25rem', padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Các phiên bản sẵn có:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {product.variants.map((v) => (
                  <span
                    key={v.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#1e293b'
                    }}
                  >
                    <span>{v.name}</span>
                    <strong style={{ color: '#0284c7' }}>{formatVND(v.price)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Thông báo nếu chưa đăng nhập */}
          {!isAuthenticated && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#b45309', fontSize: '0.875rem' }}>
              🔒 Bạn đang xem ở chế độ khách vãng lai. Vui lòng đăng nhập để có thể chọn màu sắc, số lượng và đặt mua sản phẩm.
            </div>
          )}

          {/* Hai Nút Hành Động: Khi bấm vào mới mở hộp thoại chọn màu sắc, dung lượng và số lượng */}
          <div className="detail-actions-row">
            {/* Nút Thêm vào giỏ hàng */}
            <button 
              type="button" 
              className="detail-btn-cart"
              onClick={handleOpenAddToCart}
            >
              {!isAuthenticated ? <Lock size={18} /> : <ShoppingCart size={18} />}
              <span>Thêm vào giỏ hàng</span>
            </button>

            {/* Nút Mua ngay */}
            <button 
              type="button" 
              className="detail-btn-buy"
              onClick={handleOpenBuyNow}
            >
              {!isAuthenticated ? <Lock size={18} /> : <Zap size={18} />}
              <span>Mua ngay</span>
            </button>
          </div>

          <p style={{ fontSize: '0.8125rem', color: '#71717a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <SlidersHorizontal size={14} color="#71717a" />
            <span>Bấm <strong>"Thêm vào giỏ"</strong> hoặc <strong>"Mua ngay"</strong> để chọn màu sắc, phiên bản và số lượng.</span>
          </p>

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
              <span>Miễn phí giao hàng</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={20} color="#10b981" />
              <span>Bảo hành 12 tháng</span>
            </div>
            <div className="trust-item">
              <RefreshCw size={20} color="#f59e0b" />
              <span>Đổi trả 30 ngày</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bảng thông số kỹ thuật chi tiết */}
      <section className="detail-specs-section">
        <h2 className="detail-specs-title">Thông số kỹ thuật sản phẩm</h2>
        <table className="specs-table">
          <tbody>
            <tr>
              <td>Thương hiệu</td>
              <td>Cyber Official Store</td>
            </tr>
            <tr>
              <td>Dòng máy</td>
              <td>{product.name}</td>
            </tr>
            <tr>
              <td>Tình trạng</td>
              <td>Mới 100% nguyên hộp, bảo hành chính hãng</td>
            </tr>
            <tr>
              <td>Xuất xứ</td>
              <td>Chính hãng phân phối tại Việt Nam</td>
            </tr>
            <tr>
              <td>Bộ sản phẩm gồm</td>
              <td>Thân máy, Cáp sạc nhanh, Hướng dẫn sử dụng, Thẻ bảo hành</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 4. Sản phẩm tương tự */}
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

      {/* 5. HỘP THOẠI CHỌN MÀU SẮC, PHIÊN BẢN & SỐ LƯỢNG (Khi bấm Mua / Thêm giỏ mới hiện ra) */}
      <VariantSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
        mode={modalMode}
        onConfirm={handleConfirmVariant}
      />

      {/* 6. MODEL BOX: THÔNG BÁO YÊU CẦU ĐĂNG NHẬP */}
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
