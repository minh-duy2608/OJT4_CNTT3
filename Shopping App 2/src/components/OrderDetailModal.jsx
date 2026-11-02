import React, { useEffect } from 'react';
import { 
  X, 
  Package, 
  MapPin, 
  CreditCard, 
  Clock, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  Tag,
  Phone,
  User
} from 'lucide-react';
import { formatVND } from '../data/products';
import { ORDER_STATUSES } from '../context/OrderContext';
import './OrderDetailModal.css';

export const OrderDetailModal = ({
  isOpen,
  onClose,
  order
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const getStatusMeta = (statusKey) => {
    const found = ORDER_STATUSES.find((s) => s.key === statusKey);
    if (found) return found;
    if (statusKey === 'CONFIRMED' || statusKey === 'confirmed') {
      return { label: 'Đã xác nhận', color: '#2563eb', bg: '#eff6ff', step: 2 };
    }
    if (statusKey === 'PROCESSING' || statusKey === 'processing') {
      return { label: 'Đang xử lý / Đóng gói', color: '#7c3aed', bg: '#f5f3ff', step: 3 };
    }
    if (statusKey === 'SHIPPED' || statusKey === 'shipped') {
      return { label: 'Đang vận chuyển', color: '#d97706', bg: '#fffbeb', step: 4 };
    }
    if (statusKey === 'DELIVERED' || statusKey === 'delivered') {
      return { label: 'Đã giao thành công', color: '#059669', bg: '#ecfdf5', step: 5 };
    }
    if (statusKey === 'CANCELLED' || statusKey === 'cancelled') {
      return { label: 'Đã hủy', color: '#dc2626', bg: '#fef2f2', step: 0 };
    }
    return { label: statusKey || 'Chờ xác nhận', color: '#ea580c', bg: '#fff7ed', step: 1 };
  };

  const statusMeta = getStatusMeta(order.status);
  const currentStep = statusMeta.step || 1;
  const progressPercent = Math.max(0, Math.min(100, ((currentStep - 1) / 4) * 100));

  const items = order.items || [];
  const subtotal = order.subtotal || items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
  const discountAmount = order.discountAmount || 0;
  const shippingFee = order.shippingFee || 0;
  const totalPayment = order.totalPayment || (subtotal - discountAmount + shippingFee);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="order-detail-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="order-detail-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="order-detail-header">
          <div className="order-detail-title-group">
            <div className="order-detail-badge-row">
              <span className="order-detail-code">
                Đơn hàng #{order.id || order.orderCode}
              </span>
              <span 
                className="order-detail-status-pill"
                style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
              >
                ● {statusMeta.label}
              </span>
            </div>
            <div className="order-detail-time">
              <Clock size={14} /> Ngày đặt hàng: {formatDate(order.createdAt)}
            </div>
          </div>

          <button 
            type="button" 
            className="order-detail-close-btn" 
            onClick={onClose}
            title="Đóng (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="order-detail-body">
          {/* Timeline tiến trình nếu không bị hủy */}
          {order.status !== 'cancelled' && order.status !== 'CANCELLED' ? (
            <div className="order-detail-stepper">
              <div className="detail-stepper-line">
                <div 
                  className="detail-stepper-fill" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {ORDER_STATUSES.map((st) => {
                const isDone = currentStep > st.step;
                const isCurr = currentStep === st.step;
                return (
                  <div 
                    key={st.key} 
                    className={`detail-step-item ${isDone ? 'is-done' : ''} ${isCurr ? 'is-curr' : ''}`}
                  >
                    <div className="detail-step-circle">
                      {isDone ? <CheckCircle2 size={16} /> : st.step}
                    </div>
                    <span className="detail-step-name">{st.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="order-detail-cancelled-banner">
              <AlertCircle size={18} />
              <span>Đơn hàng đã bị hủy. Nếu có phát sinh hoàn tiền, liên hệ hỗ trợ CSKH Cyber.</span>
            </div>
          )}

          {/* 2 Cột thông tin: Giao hàng & Thanh toán */}
          <div className="order-detail-info-grid">
            <div className="detail-info-box">
              <div className="detail-info-heading">
                <MapPin size={16} /> Thông tin giao hàng
              </div>
              <div className="detail-info-row">
                <User size={14} className="info-icon" />
                <span className="info-label">Người nhận:</span>
                <span className="info-val bold">{order.shippingAddress?.fullName || 'Khách hàng'}</span>
              </div>
              <div className="detail-info-row">
                <Phone size={14} className="info-icon" />
                <span className="info-label">Số điện thoại:</span>
                <span className="info-val">{order.shippingAddress?.phone || 'Chưa cung cấp'}</span>
              </div>
              <div className="detail-info-row">
                <MapPin size={14} className="info-icon" />
                <span className="info-label">Địa chỉ:</span>
                <span className="info-val">
                  {[
                    order.shippingAddress?.detailAddress,
                    order.shippingAddress?.ward,
                    order.shippingAddress?.district,
                    order.shippingAddress?.city
                  ].filter(Boolean).join(', ') || 'Địa chỉ tiêu chuẩn'}
                </span>
              </div>
              {order.notes && (
                <div className="detail-info-note">
                  <strong>Ghi chú:</strong> {order.notes}
                </div>
              )}
            </div>

            <div className="detail-info-box">
              <div className="detail-info-heading">
                <CreditCard size={16} /> Thông tin thanh toán
              </div>
              <div className="detail-info-row">
                <span className="info-label">Phương thức:</span>
                <span className="info-val bold">
                  {order.paymentMethod === 'cod' || order.paymentMethod === 'COD' 
                    ? 'COD (Thanh toán khi nhận hàng)'
                    : (order.paymentMethod || 'Thanh toán trực tuyến')}
                </span>
              </div>
              <div className="detail-info-row">
                <span className="info-label">Trạng thái TT:</span>
                <span className={`payment-status-badge ${order.paymentStatus === 'PAID' ? 'is-paid' : 'is-unpaid'}`}>
                  {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </span>
              </div>
              {order.voucherCode && (
                <div className="detail-voucher-box">
                  <Tag size={13} />
                  <span>Áp dụng mã voucher: <strong>{order.voucherCode}</strong> (-{formatVND(discountAmount)})</span>
                </div>
              )}
            </div>
          </div>

          {/* Danh sách mặt hàng */}
          <div className="order-detail-items-section">
            <div className="detail-info-heading">
              <Package size={16} /> Danh sách sản phẩm ({items.length})
            </div>
            <div className="detail-items-table">
              {items.map((item, idx) => (
                <div key={idx} className="detail-item-row">
                  <div className="detail-item-thumb">
                    <img 
                      src={item.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&auto=format&fit=crop&q=80'} 
                      alt={item.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>
                  <div className="detail-item-info">
                    <div className="detail-item-name">{item.name}</div>
                    <div className="detail-item-meta">
                      {item.selectedColor && <span>Màu: {item.selectedColor}</span>}
                      {item.selectedStorage && <span>Bản: {item.selectedStorage}</span>}
                      <span>Đơn giá: {formatVND(item.price || 0)}</span>
                    </div>
                  </div>
                  <div className="detail-item-qty">x{item.quantity || 1}</div>
                  <div className="detail-item-subtotal">
                    {formatVND((item.price || 0) * (item.quantity || 1))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tổng kết tiền */}
          <div className="order-detail-summary">
            <div className="summary-row">
              <span>Tạm tính tiền hàng:</span>
              <span>{formatVND(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="summary-row discount">
                <span>Giảm giá khuyến mãi:</span>
                <span>-{formatVND(discountAmount)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Phí vận chuyển:</span>
              <span>{shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee)}</span>
            </div>
            <div className="summary-row total">
              <span>Tổng cộng thanh toán:</span>
              <span className="total-highlight">{formatVND(totalPayment)}</span>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="order-detail-footer">
          <button 
            type="button" 
            className="btn-detail-secondary"
            onClick={handlePrint}
            title="In chi tiết hóa đơn đơn hàng"
          >
            <Printer size={16} /> In hóa đơn
          </button>
          <button 
            type="button" 
            className="btn-detail-primary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

