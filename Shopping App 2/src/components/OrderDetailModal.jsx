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
  order,
  onConfirmDelivery
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

          {/* Timeline chi tiết các mốc trạng thái */}
          {order.timeline && order.timeline.length > 0 && (
            <div className="order-detail-timeline-block" style={{ marginTop: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
                <Clock size={16} color="#3b82f6" /> Lịch sử hành trình trạng thái đơn hàng
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {order.timeline.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.825rem' }}>
                    <span style={{
                      marginTop: '3px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: ev.completed ? '#10b981' : '#cbd5e1',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: ev.current ? '#2563eb' : '#334155' }}>
                        {ev.title} {ev.timestamp && <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.75rem' }}>({formatDate(ev.timestamp)})</span>}
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '1px' }}>
                        {ev.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Yêu cầu đổi trả / hoàn tiền (nếu có) */}
          {order.returnRequest && (
            <div style={{ marginTop: '1rem', background: '#fef2f2', padding: '1rem', borderRadius: '10px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.875rem' }}>
                  Yêu cầu Trả hàng / Hoàn tiền
                </span>
                <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                  {order.returnRequest.status}
                </span>
              </div>
              <div style={{ fontSize: '0.825rem', color: '#7f1d1d' }}>
                <strong>Lý do:</strong> {order.returnRequest.reason}
              </div>
              {order.returnRequest.resolutionNote && (
                <div style={{ fontSize: '0.825rem', color: '#7f1d1d', marginTop: '4px' }}>
                  <strong>Phản hồi từ Shop:</strong> {order.returnRequest.resolutionNote}
                </div>
              )}
            </div>
          )}

          {/* Hướng dẫn hoàn hàng */}
          {order.returnInstructions && (
            <div style={{ marginTop: '1rem', background: '#f0fdf4', padding: '1rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Chính sách & Hướng dẫn trả hàng / hoàn tiền
              </div>
              <div style={{ fontSize: '0.8rem', color: '#15803d', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                {order.returnInstructions}
              </div>
            </div>
          )}

          {/* Điều kiện đánh giá sản phẩm */}
          {order.reviewConditionMessage && (
            <div style={{ marginTop: '1rem', background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '0.825rem', color: '#1e40af' }}>
              <strong>Đánh giá sản phẩm:</strong> {order.reviewConditionMessage}
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="order-detail-footer">
          {/* Nút Khách xác nhận nhận hàng */}
          {(order.canConfirmDelivery || order.status === 'delivering' || order.status === 'shipped' || order.rawStatus === 'SHIPPED') && onConfirmDelivery && (
            <button
              type="button"
              style={{
                background: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={() => onConfirmDelivery(order)}
            >
              <CheckCircle2 size={16} /> Đã nhận được hàng
            </button>
          )}

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

