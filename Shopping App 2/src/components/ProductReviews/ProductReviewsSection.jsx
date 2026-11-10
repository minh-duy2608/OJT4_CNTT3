import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Star, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  CornerDownRight, 
  Send, 
  ShieldCheck,
  Store,
  Lock,
  ShoppingBag,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productReviewApi } from '../../services/productReviewApi';
import { productApi } from '../../services/productApi';
import './ProductReviewsSection.css';

const SENTIMENT_LABELS = {
  1: 'Rất tệ',
  2: 'Tệ',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng'
};

export const ProductReviewsSection = ({ product, onSummaryLoaded }) => {
  const { user, isAuthenticated } = useAuth();
  const productId = product?.id;

  const [summaryData, setSummaryData] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState(null); // null = Tất cả

  // Seller Reply State
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Quyền phản hồi: CHỈ CHỦ SHOP CỦA SẢN PHẨM NÀY HOẶC ADMIN MỚI ĐƯỢC PHẢN HỒI
  const isSellerOfThisProduct = useMemo(() => {
    if (!user) return false;
    // 1. Kiểm tra trực tiếp từ Backend đã verify quyền sở hữu
    if (summaryData?.isShopOwnerOfProduct) return true;

    // 2. Kiểm tra quyền Admin
    const roleStr = String(user.role || '').toUpperCase();
    const hasAdminRole = roleStr.includes('ADMIN') || 
      (Array.isArray(user.roles) && user.roles.some(r => {
        const code = typeof r === 'string' ? r : r.code;
        return String(code).toUpperCase().includes('ADMIN');
      }));
    if (hasAdminRole) return true;

    // 3. Kiểm tra Shop Owner ID trùng khớp với Product Shop
    if (product?.shopId && (user.id === product?.shop?.ownerId || user.shopId === product?.shopId)) {
      return true;
    }

    return false;
  }, [user, product, summaryData]);

  // Load reviews from API
  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);
    try {
      const data = await productReviewApi.getReviews(productId, {
        rating: selectedRatingFilter || undefined,
        size: 50
      });
      setSummaryData(data);
      if (onSummaryLoaded && data) {
        onSummaryLoaded({
          averageRating: data.averageRating || 0,
          totalReviews: data.totalReviews || 0
        });
      }
    } catch (err) {
      console.warn('Lỗi tải đánh giá sản phẩm:', err);
    } finally {
      setIsLoading(false);
    }
  }, [productId, selectedRatingFilter]);

  // Load my review if logged in
  const fetchMyReview = useCallback(async () => {
    if (!productId || !isAuthenticated) {
      setMyReview(null);
      return;
    }
    try {
      const res = await productReviewApi.getMyReview(productId);
      if (res && res.id) {
        setMyReview(res);
      } else {
        setMyReview(null);
      }
    } catch (err) {
      setMyReview(null);
    }
  }, [productId, isAuthenticated]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchMyReview();
  }, [fetchMyReview]);

  // Delete My Review
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài đánh giá này không?')) return;
    try {
      await productReviewApi.deleteReview(productId, reviewId);
      await fetchReviews();
      await fetchMyReview();
    } catch (err) {
      alert(err.message || 'Không thể xóa bài đánh giá.');
    }
  };

  // Seller Submit Reply (Chỉ người bán của shop này mới được gửi)
  const handleSubmitSellerReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await productReviewApi.replyReview(productId, reviewId, { reply: replyText.trim() });
      setReplyingReviewId(null);
      setReplyText('');
      await fetchReviews();
    } catch (err) {
      alert(err.message || 'Không thể gửi câu trả lời phản hồi.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Seller Delete Reply
  const handleDeleteSellerReply = async (reviewId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa câu trả lời này?')) return;
    try {
      await productReviewApi.deleteReply(productId, reviewId);
      await fetchReviews();
    } catch (err) {
      alert(err.message || 'Không thể xóa câu trả lời.');
    }
  };

  // Stats calculation
  const totalReviews = summaryData?.totalReviews || 0;
  const averageRating = summaryData?.averageRating || 0.0;
  const ratingCounts = summaryData?.ratingCounts || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const reviewsList = summaryData?.reviews || [];
  const hasPurchased = Boolean(summaryData?.hasPurchased);
  const hasReviewed = Boolean(myReview && myReview.id);

  return (
    <section className="cellphone-reviews-container" id="product-reviews-section">
      <h2 className="cellphone-reviews-title">
        <MessageSquare size={22} color="#dc2626" />
        <span>Đánh giá & nhận xét {product?.name || 'sản phẩm'}</span>
      </h2>

      {/* 1. OVERVIEW SCORE CARD (CHUẨN CELLPHONES - LUÔN HIỂN THỊ ĐỂ NGƯỜI MỚI XEM ĐÁNH GIÁ CŨ) */}
      <div className="review-overview-card">
        {/* Cột trái: Điểm trung bình */}
        <div className="review-score-box">
          <div className="review-big-number">
            {totalReviews > 0 ? averageRating.toFixed(1) : '5.0'}
            <span style={{ fontSize: '1.25rem', color: '#94a3b8', fontWeight: 500 }}>/5</span>
          </div>
          <div className="review-big-stars">
            {[1, 2, 3, 4, 5].map((star) => {
              const fillScore = totalReviews > 0 ? averageRating : 5;
              const isFilled = star <= Math.round(fillScore);
              return (
                <Star 
                  key={star} 
                  size={18} 
                  fill={isFilled ? '#f59e0b' : 'none'} 
                  color={isFilled ? '#f59e0b' : '#cbd5e1'} 
                />
              );
            })}
          </div>
          <div className="review-total-count">
            {totalReviews > 0 ? `${totalReviews} lượt đánh giá & nhận xét` : 'Chưa có lượt đánh giá nào'}
          </div>
        </div>

        {/* Cột giữa: 5 Thanh Progress Bar */}
        <div className="review-rating-bars">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingCounts[star] || 0;
            const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return (
              <div key={star} className="rating-bar-row">
                <span className="rating-bar-label">
                  {star} <Star size={13} fill="#f59e0b" color="#f59e0b" />
                </span>
                <div className="rating-bar-track">
                  <div 
                    className="rating-bar-fill" 
                    style={{ 
                      width: `${percent}%`,
                      backgroundColor: star >= 4 ? '#f59e0b' : star === 3 ? '#fbbf24' : '#f87171'
                    }} 
                  />
                </div>
                <span className="rating-bar-count">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Cột phải: Hướng dẫn đánh giá tại Đơn hàng */}
        <div className="review-cta-box" style={{ justifyContent: 'center' }}>
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem 1rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            width: '100%'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <ShoppingBag size={22} />
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
              Đánh giá từ người mua thực tế
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
              Để đảm bảo 100% đánh giá là khách quan, quý khách vui lòng truy cập mục <strong>Đơn hàng của tôi</strong> sau khi đã nhận kiện hàng thành công để gửi đánh giá & nhận xét sản phẩm.
            </div>
          </div>
        </div>
      </div>

      {/* 2. BỘ LỌC THEO SAO */}
      <div className="review-filter-chips">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginRight: '0.25rem' }}>
          Lọc theo:
        </span>
        <button
          type="button"
          className={`review-filter-chip ${selectedRatingFilter === null ? 'active' : ''}`}
          onClick={() => setSelectedRatingFilter(null)}
        >
          Tất cả ({totalReviews})
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            type="button"
            className={`review-filter-chip ${selectedRatingFilter === star ? 'active' : ''}`}
            onClick={() => setSelectedRatingFilter(selectedRatingFilter === star ? null : star)}
          >
            {star} sao ({ratingCounts[star] || 0})
          </button>
        ))}
      </div>

      {/* 3. DANH SÁCH BÀI ĐÁNH GIÁ (HIỂN THỊ CÔNG KHAI ĐỂ NGƯỜI MỚI XEM ĐÁNH GIÁ CỦA NGƯỜI CŨ) */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          Đang tải danh sách đánh giá...
        </div>
      ) : reviewsList.length > 0 ? (
        <div className="review-list">
          {reviewsList.map((review) => {
            const isOwner = Boolean(
              review.isMyReview || 
              (user?.id && review.userId && String(review.userId) === String(user.id))
            );
            const userInitial = (review.userName || 'K').charAt(0).toUpperCase();

            return (
              <div key={review.id} className="review-item-card">
                {/* Header row: Thông tin người dùng & Hành động */}
                <div className="review-header-row">
                  <div className="review-user-info">
                    {review.userAvatar ? (
                      <img src={review.userAvatar} alt={review.userName} className="review-user-avatar" />
                    ) : (
                      <div className="review-user-avatar" style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                        {userInitial}
                      </div>
                    )}
                    <div className="review-user-details">
                      <div className="review-user-name-line">
                        <span className="review-user-name">{review.userName}</span>
                        {review.isBuyer && (
                          <span className="review-buyer-badge">
                            <ShieldCheck size={11} /> Đã mua tại Cyber
                          </span>
                        )}
                      </div>
                      <span className="review-date">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : ''}
                      </span>
                    </div>
                  </div>

                  {/* Nút xóa của người viết hoặc admin */}
                  <div className="review-actions-menu">
                    {(isOwner || isSellerOfThisProduct) && (
                      <button 
                        type="button" 
                        className="review-action-btn delete"
                        onClick={() => handleDeleteReview(review.id)}
                        title="Xóa đánh giá"
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                    )}
                  </div>
                </div>

                {/* Dòng sao */}
                <div className="review-item-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      size={15} 
                      fill={s <= review.rating ? '#f59e0b' : 'none'} 
                      color={s <= review.rating ? '#f59e0b' : '#cbd5e1'} 
                    />
                  ))}
                </div>

                {/* Tiêu đề nhận xét (nếu có) */}
                {review.title && (
                  <div className="review-item-title">{review.title}</div>
                )}

                {/* Nội dung nhận xét */}
                <div className="review-item-content">{review.content}</div>

                {/* Hình ảnh thực tế đính kèm trong đánh giá */}
                {Array.isArray(review.imageUrls) && review.imageUrls.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    {review.imageUrls.map((imgUrl, imgIdx) => (
                      <img
                        key={imgIdx}
                        src={imgUrl}
                        alt={`Ảnh thực tế ${imgIdx + 1}`}
                        style={{
                          width: '64px',
                          height: '64px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(imgUrl, '_blank')}
                        title="Bấm để xem ảnh phóng to"
                      />
                    ))}
                  </div>
                )}

                {/* 4. PHẢN HỒI CỦA NGƯỜI BÁN (SELLER REPLY) */}
                {review.sellerReply && (
                  <div className="seller-reply-box">
                    <div className="seller-reply-header">
                      <div className="seller-reply-author">
                        <Store size={15} />
                        <span>{review.sellerReplierName || 'Phản hồi từ Người bán'}</span>
                        <span className="seller-badge-qtv">Người bán</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="seller-reply-date">
                          {review.sellerReplyAt ? new Date(review.sellerReplyAt).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          }) : ''}
                        </span>
                        {isSellerOfThisProduct && (
                          <button
                            type="button"
                            className="review-action-btn delete"
                            style={{ padding: '2px 4px', fontSize: '0.7rem' }}
                            onClick={() => handleDeleteSellerReply(review.id)}
                            title="Xóa phản hồi này"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="seller-reply-content">
                      {review.sellerReply}
                    </div>
                  </div>
                )}

                {/* Nút / Form trả lời: CHỈ SHOP SỞ HỮU SẢN PHẨM NÀY MỚI ĐƯỢC PHẢN HỒI */}
                {isSellerOfThisProduct && !review.sellerReply && (
                  <div className="seller-reply-form-wrap">
                    {replyingReviewId === review.id ? (
                      <div>
                        <textarea
                          className="seller-reply-textarea"
                          placeholder={`Nhập phản hồi cho khách hàng với tư cách ${summaryData?.sellerShopName || 'Người bán'}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="seller-reply-form-actions">
                          <button
                            type="button"
                            className="btn-modal-cancel"
                            onClick={() => {
                              setReplyingReviewId(null);
                              setReplyText('');
                            }}
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            className="btn-modal-submit"
                            disabled={!replyText.trim() || isSubmittingReply}
                            onClick={() => handleSubmitSellerReply(review.id)}
                          >
                            <Send size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            {isSubmittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="review-action-btn"
                        style={{ color: '#dc2626', fontWeight: 600 }}
                        onClick={() => {
                          setReplyingReviewId(review.id);
                          setReplyText('');
                        }}
                      >
                        <CornerDownRight size={14} /> Phản hồi khách hàng
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="reviews-empty-state">
          <MessageSquare size={44} color="#94a3b8" style={{ margin: '0 auto' }} />
          <div className="reviews-empty-title">Chưa có đánh giá nào</div>
          <p style={{ fontSize: '0.875rem' }}>
            {selectedRatingFilter 
              ? `Chưa có đánh giá nào cho mức ${selectedRatingFilter} sao. Hãy thử chọn mức sao khác!` 
              : 'Hiện chưa có đánh giá nào cho sản phẩm này. Khách hàng đã mua hàng sẽ chia sẻ trải nghiệm sớm nhất!'}
          </p>
        </div>
      )}

    </section>
  );
};
