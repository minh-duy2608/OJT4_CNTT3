import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Zap, Check } from 'lucide-react';
import { formatVND } from '../data/products';
import './VariantSelectionModal.css';

export const VariantSelectionModal = ({
  isOpen,
  onClose,
  product,
  mode = 'cart', // 'cart' hoặc 'buy'
  onConfirm
}) => {
  if (!isOpen || !product) return null;

  // Danh sách màu sắc mẫu
  const colorVariants = [
    { name: 'Deep Purple', code: '#4b3c58' },
    { name: 'Space Black', code: '#2e2c30' },
    { name: 'Silver', code: '#e2e4e6' },
    { name: 'Gold', code: '#fae7cf' }
  ];

  // Danh sách phiên bản dung lượng & chênh lệch giá mẫu
  const versionOptions = [
    { name: '128GB', extra: 0 },
    { name: '256GB', extra: 2500000 },
    { name: '512GB', extra: 6000000 },
    { name: '1TB', extra: 10000000 }
  ];

  const [selectedColor, setSelectedColor] = useState(colorVariants[0].name);
  const [selectedVersion, setSelectedVersion] = useState(versionOptions[0]);
  const [quantity, setQuantity] = useState(1);

  // Đóng khi bấm phím ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Đơn giá tính theo phiên bản
  const basePrice = Number(product.price ?? product.minPrice ?? 0);
  const unitPrice = basePrice + (selectedVersion?.extra || 0);
  const totalPrice = unitPrice * quantity;

  const displayImage = product.image || product.primaryImageUrl || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';

  const handleConfirmSubmit = () => {
    onConfirm({
      ...product,
      price: unitPrice,
      image: displayImage,
      formattedPrice: formatVND(unitPrice),
      name: `${product.name} (${selectedColor}, ${selectedVersion.name})`,
      selectedColor,
      selectedVersion: selectedVersion.name,
      quantity
    });
  };

  return (
    <div className="variant-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="variant-modal-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Preview */}
        <div className="variant-modal-header">
          <div className="modal-thumb-box">
            <img src={displayImage} alt={product.name} className="modal-thumb-img" />
          </div>

          <div className="modal-summary-info">
            <div className="modal-price-tag">{formatVND(unitPrice)}</div>
            <h3 className="modal-product-title">{product.name}</h3>
            <div className="modal-selected-preview">
              Đang chọn: <strong>{selectedColor}</strong> • <strong>{selectedVersion.name}</strong>
            </div>
          </div>

          <button 
            type="button" 
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Thân hộp thoại chọn cấu hình */}
        <div className="variant-modal-body">
          {/* 1. Chọn Màu Sắc */}
          <div className="modal-option-group">
            <div className="option-group-title">
              <span>Màu sắc</span>
              <span className="option-selected-label">{selectedColor}</span>
            </div>
            <div className="modal-color-options">
              {colorVariants.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`modal-color-chip ${selectedColor === c.name ? 'is-active' : ''}`}
                  onClick={() => setSelectedColor(c.name)}
                >
                  <span className="color-dot" style={{ backgroundColor: c.code }} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Chọn Phiên bản / Dung lượng */}
          <div className="modal-option-group">
            <div className="option-group-title">
              <span>Phiên bản / Dung lượng</span>
              <span className="option-selected-label">{selectedVersion.name}</span>
            </div>
            <div className="modal-version-options">
              {versionOptions.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  className={`modal-version-chip ${selectedVersion.name === v.name ? 'is-active' : ''}`}
                  onClick={() => setSelectedVersion(v)}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Chọn Số Lượng */}
          <div className="modal-quantity-row">
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#09090b', display: 'block' }}>
                Số lượng đặt mua
              </span>
              <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Kho còn 48 sản phẩm</span>
            </div>

            <div className="modal-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Giảm"
              >
                -
              </button>
              <span className="stepper-value">{quantity}</span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Tăng"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer Xác Nhận */}
        <div className="variant-modal-footer">
          <div className="modal-subtotal-row">
            <span>Tổng số tiền:</span>
            <span className="modal-subtotal-price">{formatVND(totalPrice)}</span>
          </div>

          <button
            type="button"
            className="modal-confirm-btn"
            onClick={handleConfirmSubmit}
          >
            {mode === 'buy' ? (
              <>
                <Zap size={18} />
                <span>Xác nhận mua ngay ({quantity})</span>
              </>
            ) : (
              <>
                <ShoppingCart size={18} />
                <span>Xác nhận thêm vào giỏ hàng ({quantity})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

