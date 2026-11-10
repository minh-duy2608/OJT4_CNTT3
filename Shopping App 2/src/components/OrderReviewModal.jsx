import React, { useState, useEffect } from 'react';
import { 
  X, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  Store, 
  Package, 
  Send,
  Image as ImageIcon,
  Upload,
  Trash2,
  Check
} from 'lucide-react';
import { shopReviewApi } from '../services/shopReviewApi';
import { productReviewApi } from '../services/productReviewApi';
import { productApi } from '../services/productApi';

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
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  const items = Array.isArray(order?.items) ? order.items : [];
  const currentItem = items[selectedItemIndex] || items[0] || null;
  const currentProductId = currentItem?.productId || currentItem?.variantId || currentItem?.id;

  useEffect(() => {
    if (!isOpen || !order?.id) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (currentProductId) {
      productReviewApi.getMyReview(currentProductId)
        .then((rev) => {
          if (rev && rev.id) {
            setExistingReview(rev);
            setRating(rev.rating || 5);
            setTitle(rev.title || '');
            setComment(rev.content || '');
            setImages(Array.isArray(rev.imageUrls) ? rev.imageUrls : []);
          } else {
            setExistingReview(null);
            setRating(5);
            setTitle('');
            setComment('');
            setImages([]);
          }
        })
        .catch(() => {
          setExistingReview(null);
          setRating(5);
          setTitle('');
          setComment('');
          setImages([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [isOpen, order?.id, selectedItemIndex, currentProductId]);

  if (!isOpen || !order) return null;

  const activeStar = hoverRating || rating;

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 5) {
      setErrorMsg('Tối đa 5 hình ảnh cho mỗi đánh giá.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    try {
      const uploadedUrls = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        try {
          const res = await productApi.uploadImage(file);
          const fileUrl = res?.url || res?.fileUrl || (typeof res === 'string' ? res : null);
          if (fileUrl) {
            uploadedUrls.push(fileUrl);
          }
        } catch {
          const reader = new FileReader();
          await new Promise((resolve) => {
            reader.onload = (readEvent) => {
              uploadedUrls.push(readEvent.target.result);
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setErrorMsg('Không thể tải ảnh lên: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!rating || rating < 1) {
      setErrorMsg('Vui lòng chọn số sao đánh giá.');
      return;
    }

    if (!comment.trim()) {
      setErrorMsg('Vui lòng chia sẻ cảm nhận chi tiết của bạn về sản phẩm.');
      return;
    }

    if (comment.trim().length < 3) {
      setErrorMsg('Nội dung nhận xét phải có tối thiểu 3 ký tự.');
      return;
    }

    if (!currentProductId) {
      setErrorMsg('Không xác định được mã sản phẩm trong đơn hàng.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        rating,
        title: title.trim() || undefined,
        content: comment.trim(),
        imageUrls: images
      };

      if (existingReview?.id) {
        // Cập nhật đánh giá sản phẩm hiện có
        const updated = await productReviewApi.updateReview(currentProductId, existingReview.id, payload);
        setExistingReview(updated);
        setSuccessMsg('Cập nhật đánh giá sản phẩm thành công!');
      } else {
        // Đăng đánh giá sản phẩm mới
        const created = await productReviewApi.createReview(currentProductId, payload);
        setExistingReview(created);
        setSuccessMsg('Gửi đánh giá sản phẩm thành công!');
      }

      // Đồng bộ đánh giá Shop nền (nếu có)
      try {
        const targetOrderId = order.backendId || (typeof order.id === 'number' ? order.id : (typeof order.id === 'string' && order.id.includes('-') ? order.id.split('-').pop() : order.id));
        await shopReviewApi.createReview(targetOrderId, {
          rating,
          comment: comment.trim(),
          imageUrls: images
        });
      } catch {
        try {
          const targetOrderId = order.backendId || (typeof order.id === 'number' ? order.id : (typeof order.id === 'string' && order.id.includes('-') ? order.id.split('-').pop() : order.id));
          const sr = await shopReviewApi.getOrderReview(targetOrderId);
          if (sr?.id) {
            await shopReviewApi.updateReview(sr.id, {
              rating,
              comment: comment.trim(),
              imageUrls: images
            });
          }
        } catch {}
      }

      if (onSuccess) {
        onSuccess(order);
      }

      // Tự động đóng modal nếu đơn chỉ có 1 sản phẩm
      if (items.length <= 1) {
        setTimeout(() => {
          onClose();
        }, 1300);
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Lỗi gửi đánh giá. Vui lòng thử lại sau.';
      setErrorMsg(msg);
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
          maxWidth: '540px',
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
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Star size={22} fill="#d97706" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Đánh giá chất lượng sản phẩm
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
          gap: '1.1rem'
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

          {/* Nếu đơn có nhiều sản phẩm: hiển thị danh sách chọn sản phẩm để đánh giá */}
          {items.length > 1 && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Chọn sản phẩm trong đơn hàng để đánh giá:
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {items.map((it, idx) => {
                  const isSelected = idx === selectedItemIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedItemIndex(idx);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        color: isSelected ? '#1d4ed8' : '#334155'
                      }}
                    >
                      {it.image && (
                        <img 
                          src={it.image} 
                          alt={it.name} 
                          style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} 
                        />
                      )}
                      <span>{it.name ? (it.name.length > 25 ? `${it.name.substring(0, 25)}...` : it.name) : `Sản phẩm #${idx + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card thông tin chi tiết sản phẩm đang được chọn đánh giá */}
          {currentItem && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px 14px'
            }}>
              {currentItem.image ? (
                <img
                  src={currentItem.image}
                  alt={currentItem.name}
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '1px solid #e2e8f0',
                    flexShrink: 0
                  }}
                />
              ) : (
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  flexShrink: 0
                }}>
                  <Package size={24} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.3, marginBottom: '2px' }}>
                  {currentItem.name}
                </div>
                {currentItem.variantName && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Phân loại: {currentItem.variantName}
                  </div>
                )}
                {existingReview && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', backgroundColor: '#ecfdf5', color: '#059669', fontSize: '0.725rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px' }}>
                    <Check size={12} /> Đã gửi đánh giá ({existingReview.rating}★)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chọn số sao */}
          <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Bạn cảm thấy thế nào về sản phẩm này?
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
                      size={34}
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

          {/* Tiêu đề nhận xét (Tùy chọn) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              Tiêu đề nhận xét (Tùy chọn):
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Rất ưng ý, chất lượng xuất sắc..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Bình luận / Nhận xét chi tiết */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              Chia sẻ cảm nhận chi tiết của bạn về sản phẩm *
            </label>
            <textarea
              rows={4}
              placeholder="Hãy chia sẻ trải nghiệm thực tế về chất lượng sản phẩm, hiệu năng, đóng gói giao hàng..."
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

          {/* Đính kèm hình ảnh thực tế */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <ImageIcon size={16} color="#475569" /> Ảnh chụp sản phẩm thực tế ({images.length}/5):
              </label>
              {images.length < 5 && (
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  backgroundColor: '#f1f5f9',
                  color: '#2563eb',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  border: '1px solid #cbd5e1'
                }}>
                  <Upload size={14} />
                  <span>{isUploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploading}
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {images.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                {images.map((imgUrl, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <img
                      src={imgUrl}
                      alt={`Review evidence ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: 'rgba(0, 0, 0, 0.65)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="Xóa ảnh này"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phản hồi từ người bán (nếu đã có phản hồi) */}
          {existingReview?.sellerReply && (
            <div style={{
              backgroundColor: '#eff6ff',
              borderLeft: '4px solid #2563eb',
              padding: '10px 14px',
              borderRadius: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#1e40af' }}>
                <Store size={14} /> Phản hồi từ người bán ({existingReview.sellerReplierName || order.shopName || 'Shop'}):
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.825rem', color: '#1e3a8a', lineHeight: 1.4 }}>
                {existingReview.sellerReply}
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
            disabled={isSubmitting || isLoading || isUploading}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isSubmitting || isLoading || isUploading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isSubmitting ? 'Đang gửi...' : isUploading ? 'Đang tải ảnh...' : (existingReview ? 'Lưu thay đổi' : 'Gửi đánh giá')}
          </button>
        </div>
      </div>
    </div>
  );
};
