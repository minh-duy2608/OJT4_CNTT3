import React, { useState, useEffect } from 'react';
import { 
  X, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  Store, 
  Package, 
  Send
} from 'lucide-react';
import { shopReviewApi } from '../services/shopReviewApi';

const RATING_DESCRIPTIONS = {
  1: 'Rất tệ - Không hài lòng với sản phẩm và dịch vụ',
  2: 'Kém - Sản phẩm không đúng như kỳ vọng',
  3: 'Bình thường - Tạm chấp nhận được',
  4: 'Hài lòng - Sản phẩm tốt, giao hàng đúng hẹn',
  5: 'Tuyệt vời - Rất hài lòng, sẽ tiếp tục ủng hộ Shop!'
};

export const OrderReviewModal = ({
  isOpen,
  onClose,
  order,
  onSuccess
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [existingReview, setExistingReview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !order?.id) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    shopReviewApi.getOrderReview(order.id)
      .then((rev) => {
        if (rev && rev.id) {
          setExistingReview(rev);
          setRating(rev.rating || 5);
          setComment(rev.comment || '');
        } else {
          setExistingReview(null);
          setRating(5);
          setComment('');
        }
      })
      .catch(() => {
        setExistingReview(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const activeStar = hoverRating || rating;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!rating || rating < 1) {
      setErrorMsg('Vui lòng chọn số sao đánh giá.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (existingReview?.id) {
        const updated = await shopReviewApi.updateReview(existingReview.id, {
          rating,
          comment: comment.trim()
        });
        setExistingReview(updated);
        setSuccessMsg('Cập nhật đánh giá thành công!');
      } else {
        const created = await shopReviewApi.createReview(order.id, {
          rating,
          comment: comment.trim()
        });
        setExistingReview(created);
        setSuccessMsg('Gửi đánh giá đơn hàng thành công!');
      }

      if (onSuccess) {
        onSuccess(order);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi gửi đánh giá. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="order-review-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div 
        className="order-review-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #fffbeb, #ffffff)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Star size={20} fill="#d97706" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Đánh giá chất lượng đơn hàng
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Đơn hàng #{order.id} • {order.shopName ? `Cửa hàng: ${order.shopName}` : 'Shop đối tác'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '1.25rem 1.5rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem'
        }}>
          {errorMsg && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Danh sách tóm tắt sản phẩm trong đơn */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 12px'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Package size={13} /> Sản phẩm trong kiện hàng:
            </div>
            {order.items?.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: '#1e293b', marginBottom: '4px' }}>
                <span style={{ color: '#2563eb', fontWeight: 600 }}>•</span>
                <span style={{ fontWeight: 600 }}>{it.name}</span>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>x{it.quantity}</span>
              </div>
            ))}
          </div>

          {/* Chọn số sao */}
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Bạn cảm thấy thế nào về đơn hàng này?
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = star <= activeStar;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      transition: 'transform 0.15s ease',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                    }}
                  >
                    <Star
                      size={32}
                      color={isSelected ? '#f59e0b' : '#cbd5e1'}
                      fill={isSelected ? '#f59e0b' : 'none'}
                    />
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#d97706' }}>
              {RATING_DESCRIPTIONS[activeStar] || ''}
            </div>
          </div>

          {/* Bình luận / Nhận xét */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              Chia sẻ cảm nhận chi tiết của bạn:
            </label>
            <textarea
              rows={4}
              placeholder="Chất lượng sản phẩm tuyệt vời, đóng gói cẩn thận, thời gian giao hàng nhanh chóng..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Nếu shop đã từng phản hồi đánh giá này */}
          {existingReview?.shopReply && (
            <div style={{
              backgroundColor: '#eff6ff',
              borderLeft: '4px solid #2563eb',
              padding: '10px 14px',
              borderRadius: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#1e40af' }}>
                <Store size={14} /> Phản hồi từ người bán ({order.shopName || 'Shop'}):
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.825rem', color: '#1e3a8a', lineHeight: 1.4 }}>
                {existingReview.shopReply}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          backgroundColor: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isSubmitting ? 'Đang gửi...' : (existingReview ? 'Lưu thay đổi' : 'Gửi đánh giá')}
          </button>
        </div>
      </div>
    </div>
  );
};
