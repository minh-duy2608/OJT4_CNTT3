import React, { useEffect, useState } from 'react';
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
  User,
  Star,
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import { formatVND } from '../data/products';
import { ORDER_STATUSES } from '../context/OrderContext';
import { shipmentApi } from '../services/shipmentApi';
import { shopReviewApi } from '../services/shopReviewApi';
import { returnApi } from '../services/returnApi';
import './OrderDetailModal.css';

export const OrderDetailModal = ({
  isOpen,
  onClose,
  order,
  onConfirmDelivery,
  onOrderUpdated
}) => {
  const [shipments, setShipments] = useState([]);
  const [existingReview, setExistingReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('Sản phẩm bị lỗi / không hoạt động');
  const [returnNote, setReturnNote] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState('');
  const [activeReturn, setActiveReturn] = useState(order?.returnRequest || null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      // Load live shipments & review
      if (order?.id) {
        shipmentApi.getOrderShipments(order.id)
          .then((res) => {
            const list = Array.isArray(res) ? res : (res?.content || []);
            setShipments(list);
          })
          .catch(() => {});

        shopReviewApi.getOrderReview(order.id)
          .then((rev) => {
            if (rev && rev.id) {
              setExistingReview(rev);
              setReviewRating(rev.rating || 5);
              setReviewComment(rev.comment || '');
            } else {
              setExistingReview(null);
            }
          })
          .catch(() => setExistingReview(null));
      }
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, order?.id]);

  useEffect(() => {
    setActiveReturn(order?.returnRequest || null);
  }, [order]);

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

          {/* THÔNG TIN VẬN CHUYỂN TRỰC TIẾP (SHIPMENTS) */}
          {shipments.length > 0 && (
            <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
                <Truck size={17} color="#2563eb" />
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                  Thông tin Vận chuyển & Giao hàng
                </span>
              </div>
              {shipments.map((ship) => (
                <div key={ship.id} style={{ fontSize: '0.825rem', color: '#475569', lineHeight: '1.6', background: '#fff', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #edf2f7', marginBottom: '6px' }}>
                  <div><strong>Đơn vị vận chuyển:</strong> {ship.carrier || 'Giao hàng Tiêu chuẩn'}</div>
                  {ship.trackingCode && <div><strong>Mã vận đơn:</strong> <code style={{ color: '#2563eb', fontWeight: 600 }}>{ship.trackingCode}</code></div>}
                  <div><strong>Trạng thái vận chuyển:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>{ship.status}</span></div>
                  {ship.estimatedDeliveryDate && <div><strong>Dự kiến giao:</strong> {formatDate(ship.estimatedDeliveryDate)}</div>}
                </div>
              ))}
            </div>
          )}

          {/* ĐÁNH GIÁ CỦA NGƯỜI MUA CHO SHOP */}
          {(order.status === 'DELIVERED' || order.status === 'delivered' || order.rawStatus === 'DELIVERED') && (
            <div style={{ marginTop: '1rem', background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={17} color="#f59e0b" fill="#f59e0b" />
                  <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                    Đánh giá Cửa hàng ({order.shopName || 'Shop'})
                  </span>
                </div>
                {!showReviewForm && existingReview && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setShowReviewForm(true)}
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>

              {reviewSuccessMsg && (
                <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '8px' }}>
                  {reviewSuccessMsg}
                </div>
              )}

              {/* Nếu đã có đánh giá và không mở form sửa */}
              {existingReview && !showReviewForm && (
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        color={star <= existingReview.rating ? '#f59e0b' : '#cbd5e1'}
                        fill={star <= existingReview.rating ? '#f59e0b' : 'none'}
                      />
                    ))}
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>
                      {formatDate(existingReview.createdAt)}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#334155' }}>
                    {existingReview.comment || 'Khách hàng không để lại nhận xét bằng chữ.'}
                  </p>
                  {existingReview.shopReply && (
                    <div style={{ marginTop: '8px', background: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #2563eb' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>Phản hồi từ người bán:</div>
                      <div style={{ fontSize: '0.8rem', color: '#1e3a8a', marginTop: '2px' }}>{existingReview.shopReply}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Form gửi hoặc sửa đánh giá */}
              {(!existingReview || showReviewForm) && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setIsSubmittingReview(true);
                      if (existingReview?.id) {
                        const updated = await shopReviewApi.updateReview(existingReview.id, {
                          rating: reviewRating,
                          comment: reviewComment
                        });
                        setExistingReview(updated);
                        setReviewSuccessMsg('Cập nhật đánh giá thành công!');
                      } else {
                        const created = await shopReviewApi.createReview(order.id, {
                          rating: reviewRating,
                          comment: reviewComment
                        });
                        setExistingReview(created);
                        setReviewSuccessMsg('Gửi đánh giá cửa hàng thành công!');
                      }
                      setShowReviewForm(false);
                      setTimeout(() => setReviewSuccessMsg(''), 4000);
                    } catch (err) {
                      alert(err.message || 'Lỗi gửi đánh giá');
                    } finally {
                      setIsSubmittingReview(false);
                    }
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Đánh giá sao:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                      >
                        <Star
                          size={20}
                          color={star <= reviewRating ? '#f59e0b' : '#cbd5e1'}
                          fill={star <= reviewRating ? '#f59e0b' : 'none'}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Chia sẻ trải nghiệm mua sắm của bạn về sản phẩm và dịch vụ của shop..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.825rem',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {existingReview && (
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        style={{ padding: '0.4rem 0.8rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      style={{
                        padding: '0.4rem 0.9rem',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isSubmittingReview ? 'Đang gửi...' : (existingReview ? 'Lưu thay đổi' : 'Gửi đánh giá')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* YÊU CẦU TRẢ HÀNG / HOÀN TIỀN */}
          {(activeReturn || (order.status === 'DELIVERED' || order.status === 'delivered' || order.rawStatus === 'DELIVERED')) && (
            <div style={{ marginTop: '1rem', background: '#fff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RotateCcw size={17} color="#dc2626" />
                  <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                    Yêu cầu Đổi trả / Hoàn tiền
                  </span>
                </div>
                {activeReturn && (
                  <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                    {activeReturn.status}
                  </span>
                )}
              </div>

              {returnSuccessMsg && (
                <div style={{ background: '#ecfdf5', color: '#065f46', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '8px' }}>
                  {returnSuccessMsg}
                </div>
              )}

              {activeReturn ? (
                <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.825rem', color: '#7f1d1d' }}>
                  <div><strong>Lý do yêu cầu:</strong> {activeReturn.reason}</div>
                  {activeReturn.note && <div style={{ marginTop: '3px' }}><strong>Ghi chú:</strong> {activeReturn.note}</div>}
                  {activeReturn.requestedAmount && <div style={{ marginTop: '3px' }}><strong>Số tiền yêu cầu hoàn:</strong> {formatVND(activeReturn.requestedAmount)}</div>}
                  {activeReturn.resolutionNote && (
                    <div style={{ marginTop: '6px', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                      Phản hồi từ người bán: {activeReturn.resolutionNote}
                    </div>
                  )}
                </div>
              ) : showReturnForm ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setIsSubmittingReturn(true);
                      const res = await returnApi.requestReturn(order.id, {
                        reason: returnReason,
                        note: returnNote,
                        requestedAmount: totalPayment
                      });
                      setActiveReturn(res);
                      setReturnSuccessMsg('Yêu cầu trả hàng đã được gửi thành công đến người bán!');
                      setShowReturnForm(false);
                      if (onOrderUpdated) onOrderUpdated();
                    } catch (err) {
                      alert(err.message || 'Lỗi gửi yêu cầu trả hàng');
                    } finally {
                      setIsSubmittingReturn(false);
                    }
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Lý do trả hàng:</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem' }}
                  >
                    <option value="Sản phẩm bị lỗi / không hoạt động">Sản phẩm bị lỗi / không hoạt động</option>
                    <option value="Hàng không đúng mô tả hoặc sai mẫu mã">Hàng không đúng mô tả hoặc sai mẫu mã</option>
                    <option value="Thiếu phụ kiện hoặc linh kiện đi kèm">Thiếu phụ kiện hoặc linh kiện đi kèm</option>
                    <option value="Bị hư hỏng trong quá trình vận chuyển">Bị hư hỏng trong quá trình vận chuyển</option>
                    <option value="Khác">Lý do khác</option>
                  </select>

                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Chi tiết mô tả lỗi:</label>
                  <textarea
                    rows={2}
                    placeholder="Vui lòng mô tả cụ thể tình trạng sản phẩm..."
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                  />

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setShowReturnForm(false)}
                      style={{ padding: '0.4rem 0.8rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReturn}
                      style={{ padding: '0.4rem 0.9rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {isSubmittingReturn ? 'Đang gửi...' : 'Gửi yêu cầu'}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowReturnForm(true)}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={15} /> Gửi yêu cầu Đổi trả / Hoàn tiền
                </button>
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

