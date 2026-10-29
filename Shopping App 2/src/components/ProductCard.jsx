import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ShoppingBag, Zap, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatVND } from '../data/products';
import './ProductCard.css';

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart, showToast } = useCart();
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(Boolean(product?.isLiked));

  // 1. Phân tích các phiên bản biến thể (Variants) có sẵn từ API hoặc danh mục mẫu
  const { colorOptions, storageOptions, variantsMap } = useMemo(() => {
    const rawVariants = Array.isArray(product?.variants) ? product.variants : [];
    
    // Nếu có biến thể thực tế từ API Backend
    if (rawVariants.length > 0) {
      const colors = new Set();
      const storages = new Set();
      const map = {};

      rawVariants.forEach((v) => {
        let color = '';
        let storage = '';

        if (v.attributes) {
          try {
            const attr = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
            if (attr.color) color = attr.color;
            if (attr.storage) storage = attr.storage;
          } catch {
            // ignore
          }
        }

        // Tự động phân tích từ tên biến thể nếu không có attributes JSON
        if (!color || !storage) {
          const matchStorage = (v.variantName || '').match(/\b(64GB|128GB|256GB|512GB|1TB|2TB)\b/i);
          if (matchStorage) storage = matchStorage[1].toUpperCase();

          const matchColor = (v.variantName || '')
            .replace(/\b(64GB|128GB|256GB|512GB|1TB|2TB)\b/ig, '')
            .replace(/iPhone|Samsung|Sony|Dell|Asus|Xiaomi|\d+/ig, '')
            .trim();
          if (matchColor) color = matchColor;
        }

        if (!color) color = 'Tiêu chuẩn';
        if (!storage) storage = 'Tiêu chuẩn';

        colors.add(color);
        storages.add(storage);
        map[`${color}_${storage}`] = v;
      });

      return {
        colorOptions: Array.from(colors),
        storageOptions: Array.from(storages),
        variantsMap: map
      };
    }

    // Giá trị mặc định chuẩn cho các sản phẩm
    return {
      colorOptions: ['Đen', 'Bạc', 'Tự Nhiên', 'Vàng'],
      storageOptions: ['128GB', '256GB', '512GB'],
      variantsMap: {}
    };
  }, [product]);

  const [selectedColor, setSelectedColor] = useState(colorOptions[0] || 'Tiêu chuẩn');
  const [selectedStorage, setSelectedStorage] = useState(storageOptions[0] || '128GB');
  const [justAdded, setJustAdded] = useState(false);

  if (!product) return null;

  // Safe image fallback
  const displayImage = product.image || product.primaryImageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';

  // Tính toán giá tiền theo phiên bản dung lượng & màu sắc đang chọn
  const basePrice = Number(product.minPrice ?? product.price ?? 15000000);
  const matchedVariant = variantsMap[`${selectedColor}_${selectedStorage}`];
  
  const currentPrice = useMemo(() => {
    if (matchedVariant) {
      return Number(matchedVariant.salePrice || matchedVariant.price);
    }
    // Chênh lệch giá mô phỏng theo dung lượng nếu là mock product
    let extra = 0;
    if (selectedStorage === '256GB') extra = 2500000;
    else if (selectedStorage === '512GB') extra = 5500000;
    else if (selectedStorage === '1TB') extra = 9500000;
    return basePrice + extra;
  }, [matchedVariant, selectedStorage, basePrice]);

  const displayFormattedPrice = formatVND(currentPrice);

  // Chuyển hướng sang trang chi tiết khi bấm vào card
  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
  };

  const handleToggleLike = (e) => {
    e.stopPropagation();
    setLiked(!liked);
  };

  // Chọn màu ngay trên card
  const handleSelectColor = (e, color) => {
    e.stopPropagation();
    setSelectedColor(color);
  };

  // Chọn dung lượng ngay trên card
  const handleSelectStorage = (e, storage) => {
    e.stopPropagation();
    setSelectedStorage(storage);
  };

  // Thêm nhanh vào giỏ hàng từ Card (với hiệu ứng bay vào giỏ hàng)
  const handleQuickAddToCart = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/auth?mode=login');
      return;
    }

    const configuredProduct = {
      ...product,
      id: matchedVariant ? `${product.id}-${matchedVariant.id}` : `${product.id}-${selectedColor}-${selectedStorage}`,
      name: `${product.name} (${selectedColor}, ${selectedStorage})`,
      price: currentPrice,
      formattedPrice: displayFormattedPrice,
      image: displayImage,
      selectedColor,
      selectedStorage
    };

    const cardEl = e.currentTarget.closest('.cyber-product-card');
    const startRect = cardEl ? cardEl.getBoundingClientRect() : null;

    addToCart(configuredProduct, 1, { fly: true, startRect });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  // Mua ngay từ Card: Thêm vào giỏ và chuyển thẳng sang Checkout
  const handleQuickBuyNow = (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/auth?mode=login');
      return;
    }

    const configuredProduct = {
      ...product,
      id: matchedVariant ? `${product.id}-${matchedVariant.id}` : `${product.id}-${selectedColor}-${selectedStorage}`,
      name: `${product.name} (${selectedColor}, ${selectedStorage})`,
      price: currentPrice,
      formattedPrice: displayFormattedPrice,
      image: displayImage,
      selectedColor,
      selectedStorage
    };

    addToCart(configuredProduct, 1, { fly: false });
    navigate('/checkout');
  };

  return (
    <article 
      className="cyber-product-card" 
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      title={`Bấm để xem chi tiết ${product.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/products/${product.id}`);
      }}
    >
      {/* Nút yêu thích */}
      <button 
        type="button" 
        className={`product-wishlist-btn ${liked ? 'is-active' : ''}`}
        onClick={handleToggleLike}
        aria-label={liked ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
      >
        <Heart 
          size={19} 
          strokeWidth={1.8} 
          fill={liked ? '#ef4444' : 'none'} 
          color={liked ? '#ef4444' : '#a1a1aa'} 
        />
      </button>

      {/* Ảnh sản phẩm */}
      <div className="product-img-wrapper">
        <img 
          src={displayImage} 
          alt={product.name} 
          className="product-card-img" 
          loading="lazy" 
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';
          }}
        />
      </div>

      {/* Thông tin sản phẩm */}
      <div className="product-info-wrapper">
        <h3 className="product-card-title">
          <Link 
            to={`/products/${product.id}`} 
            className="product-title-link"
            onClick={(e) => e.stopPropagation()}
          >
            {product.name}
          </Link>
        </h3>

        {/* BỘ CHỌN PHIÊN BẢN NGAY TẠI CARD: MÀU SẮC & DUNG LƯỢNG */}
        <div className="card-variant-selector" onClick={(e) => e.stopPropagation()}>
          {/* 1. Chọn Màu sắc */}
          <div className="card-variant-row">
            <span className="card-variant-label">Màu:</span>
            <div className="card-variant-chips">
              {colorOptions.slice(0, 4).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={(e) => handleSelectColor(e, c)}
                  className={`card-chip-btn ${selectedColor === c ? 'is-active' : ''}`}
                  title={`Chọn màu ${c}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Chọn Dung lượng */}
          {storageOptions.length > 1 && (
            <div className="card-variant-row" style={{ marginTop: '4px' }}>
              <span className="card-variant-label">Bản:</span>
              <div className="card-variant-chips">
                {storageOptions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={(e) => handleSelectStorage(e, s)}
                    className={`card-chip-btn ${selectedStorage === s ? 'is-active' : ''}`}
                    title={`Chọn dung lượng ${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Giá tiền theo phiên bản đang chọn */}
        <div className="product-card-price">
          {displayFormattedPrice}
        </div>

        {/* Hai nút thao tác mua ngay trên Card */}
        <div className="card-action-btns" onClick={(e) => e.stopPropagation()}>
          <button 
            type="button"
            className="product-cart-quick-btn"
            onClick={handleQuickAddToCart}
            title={`Thêm ${selectedColor} ${selectedStorage} vào giỏ hàng`}
          >
            {justAdded ? <Check size={16} color="#16a34a" /> : <ShoppingBag size={16} />}
            <span>{justAdded ? 'Đã thêm' : '+ Giỏ'}</span>
          </button>

          <button 
            type="button"
            className="product-buy-btn"
            onClick={handleQuickBuyNow}
            title={`Đặt mua ngay ${product.name} (${selectedColor}, ${selectedStorage})`}
          >
            <Zap size={15} />
            <span>Mua ngay</span>
          </button>
        </div>
      </div>
    </article>
  );
};
