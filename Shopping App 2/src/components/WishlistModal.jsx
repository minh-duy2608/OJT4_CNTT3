import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, Trash2, ArrowRight, ShoppingBag, ExternalLink, Loader2 } from 'lucide-react';
import { wishlistApi } from '../services/wishlistApi';
import { formatVND } from '../data/products';
import './WishlistModal.css';

export const WishlistModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await wishlistApi.getWishlist();
      setWishlist(data);
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
      setError(err.message || 'Không thể tải danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWishlist();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRemoveItem = async (productId, e) => {
    e.stopPropagation();
    try {
      setActionLoadingId(productId);
      const updated = await wishlistApi.removeFromWishlist(productId);
      setWishlist(updated);
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa sản phẩm');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ sản phẩm yêu thích?')) return;
    try {
      setLoading(true);
      await wishlistApi.clearWishlist();
      setWishlist({ items: [], totalItems: 0 });
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa danh sách');
    } finally {
      setLoading(false);
    }
  };

  const items = wishlist?.items || [];

  return (
    <div className="cyber-modal-overlay" onClick={onClose}>
      <div className="cyber-wishlist-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cyber-wishlist-header">
          <div className="cyber-wishlist-title-wrap">
            <div className="cyber-wishlist-icon">
              <Heart size={20} fill="#ef4444" color="#ef4444" />
            </div>
            <div>
              <h3>Danh Sách Yêu Thích</h3>
              <p>{items.length} sản phẩm đã lưu</p>
            </div>
          </div>
          <div className="cyber-wishlist-header-actions">
            {items.length > 0 && (
              <button
                type="button"
                className="cyber-wishlist-clear-btn"
                onClick={handleClearAll}
                title="Xóa toàn bộ"
              >
                <Trash2 size={16} />
                <span>Xóa hết</span>
              </button>
            )}
            <button type="button" className="cyber-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="cyber-wishlist-body">
          {loading ? (
            <div className="cyber-wishlist-loading">
              <Loader2 className="animate-spin" size={32} />
              <p>Đang tải danh sách yêu thích...</p>
            </div>
          ) : error ? (
            <div className="cyber-wishlist-error">
              <p>{error}</p>
              <button type="button" onClick={fetchWishlist} className="cyber-wishlist-retry-btn">
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="cyber-wishlist-empty">
              <div className="cyber-wishlist-empty-icon">
                <Heart size={48} strokeWidth={1.5} color="#94a3b8" />
              </div>
              <h4>Danh sách yêu thích trống</h4>
              <p>Bạn chưa lưu sản phẩm nào. Hãy khám phá các thiết bị công nghệ đỉnh cao ngay!</p>
              <button
                type="button"
                className="cyber-wishlist-shop-btn"
                onClick={() => {
                  onClose();
                  navigate('/products');
                }}
              >
                <span>Khám phá sản phẩm</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="cyber-wishlist-list">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="cyber-wishlist-item"
                  onClick={() => {
                    onClose();
                    navigate(`/products/${item.productId}`);
                  }}
                >
                  <div className="cyber-wishlist-item-img">
                    <img
                      src={item.productImageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200'}
                      alt={item.productName}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200';
                      }}
                    />
                  </div>
                  <div className="cyber-wishlist-item-info">
                    <h4 className="cyber-wishlist-item-name">{item.productName}</h4>
                    {item.shopName && (
                      <span className="cyber-wishlist-item-shop">Cửa hàng: {item.shopName}</span>
                    )}
                    <div className="cyber-wishlist-item-price">
                      {item.price ? formatVND(item.price) : 'Liên hệ'}
                    </div>
                  </div>
                  <div className="cyber-wishlist-item-actions">
                    <button
                      type="button"
                      className="cyber-wishlist-item-remove"
                      onClick={(e) => handleRemoveItem(item.productId, e)}
                      disabled={actionLoadingId === item.productId}
                      title="Xóa khỏi yêu thích"
                    >
                      {actionLoadingId === item.productId ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cyber-wishlist-footer">
            <button
              type="button"
              className="cyber-wishlist-continue-btn"
              onClick={() => {
                onClose();
                navigate('/products');
              }}
            >
              Tiếp tục mua sắm
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
