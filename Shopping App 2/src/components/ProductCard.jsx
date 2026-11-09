import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { formatVND } from '../data/products';
import './ProductCard.css';

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();

  if (!product) return null;

  // Safe image fallback
  const displayImage =
    product.image ||
    product.primaryImageUrl ||
    (Array.isArray(product.images) && product.images[0]?.imageUrl) ||
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';

  // Base price (minPrice or price)
  const basePrice = Number(product.minPrice ?? product.price ?? 0);
  const displayFormattedPrice = basePrice > 0 ? formatVND(basePrice) : 'Liên hệ';

  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
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

        {/* Giá tiền */}
        <div className="product-card-price">
          {displayFormattedPrice}
        </div>

        {/* Nút Mua hàng / Xem chi tiết */}
        <button
          type="button"
          className="product-buy-btn"
          onClick={handleCardClick}
        >
          <ShoppingBag size={16} />
          <span>Xem chi tiết & Mua</span>
        </button>
      </div>
    </article>
  );
};
