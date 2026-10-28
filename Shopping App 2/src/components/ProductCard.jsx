import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import './ProductCard.css';

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(Boolean(product.isLiked));

  // Chuyển hướng sang trang chi tiết & mua hàng khi bấm vào card
  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
  };

  const handleToggleLike = (e) => {
    e.stopPropagation(); // Ngăn mở trang chi tiết
    setLiked(!liked);
  };

  return (
    <article 
      className="cyber-product-card" 
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      title={`Bấm để xem chi tiết và mua ngay ${product.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/products/${product.id}`);
      }}
    >
      {/* Nút yêu thích (Góc phải trên chuẩn Figma) */}
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
          src={product.image} 
          alt={product.name} 
          className="product-card-img" 
          loading="lazy" 
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

        {/* Giá tiền Việt Nam Đồng */}
        <div className="product-card-price">
          {product.formattedPrice}
        </div>

        {/* Nút Mua ngay chuẩn mẫu Figma */}
        <button 
          type="button"
          className="product-buy-btn"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/products/${product.id}`);
          }}
          title="Bấm để chọn phiên bản và mua ngay"
        >
          Mua ngay
        </button>
      </div>
    </article>
  );
};
