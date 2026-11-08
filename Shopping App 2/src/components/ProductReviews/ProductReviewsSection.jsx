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
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productReviewApi } from '../../services/productReviewApi';
import './ProductReviewsSection.css';

const SENTIMENT_LABELS = {
  1: 'Rất tệ',
  2: 'Tệ',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng'
};

export const ProductReviewsSection = ({ product }) => {
  const { user, isAuthenticated } = useAuth();
  const productId = product?.id;

  const [summaryData, setSummaryData] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState(null); // null = Tất cả

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRating, setModalRating] = useState(5);
  const [modalHoverRating, setModalHoverRating] = useState(0);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal thông báo chưa mua hàng
  const [showNotPurchasedModal, setShowNotPurchasedModal] = useState(false);

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

  // Open modal for new review or editing
  const handleOpenModal = () => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để viết đánh giá cho sản phẩm!');
      return;
    }

    // Nếu đã đánh giá rồi: cho phép mở modal chỉnh sửa bài viết của mình
    if (myReview && myReview.id) {
      setModalRating(myReview.rating || 5);
      setModalTitle(myReview.title || '');
      setModalContent(myReview.content || '');
      setFormError('');
      setIsModalOpen(true);
      return;
    }

    // CHỈ CHO PHÉP ĐÁNH GIÁ NẾU ĐÃ MUA HÀNG THÀNH CÔNG
    const hasPurchased = summaryData?.hasPurchased;
    if (!hasPurchased) {
      setShowNotPurchasedModal(true);
      return;
    }

    // New review
    setModalRating(5);
    setModalTitle('');
    setModalContent('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError('');
  };

  // Submit Review Form
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!modalContent.trim() || modalContent.trim().length < 5) {
      setFormError('Nội dung nhận xét phải có tối thiểu 5 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        rating: modalRating,
        title: modalTitle.trim() || undefined,
        content: modalContent.trim()
      };

      if (myReview && myReview.id) {
        // Cập nhật đánh giá
        await productReviewApi.updateReview(productId, myReview.id, payload);
      } else {
        // Tạo đánh giá mới (mỗi người chỉ được 1 bài)
        await productReviewApi.createReview(productId, payload);
      }

      handleCloseModal();
      await fetchReviews();
      await fetchMyReview();
    } catch (err) {
      const msg = err.data?.message || err.message || 'Có lỗi xảy ra khi lưu đánh giá. Vui lòng thử lại!';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Cột phải: Lời kêu gọi & Nút Viết đánh giá */}
        <div className="review-cta-box">
          <div className="review-cta-text">
            {hasReviewed ? (
              'Bạn đã gửi đánh giá cho sản phẩm này.'
            ) : hasPurchased ? (
              'Bạn đã mua sản phẩm này! Hãy chia sẻ cảm nhận thực tế nhé.'
            ) : (
              'Chỉ khách hàng đã mua sản phẩm mới có thể viết đánh giá.'
            )}
          </div>

          {hasReviewed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div className="btn-my-review-badge">
                <CheckCircle2 size={14} /> Đã đánh giá ({myReview.rating}★)
              </div>
              <button 
                type="button" 
                className="btn-write-review"
                style={{ background: '#2563eb' }}
                onClick={handleOpenModal}
              >
                <Edit3 size={16} /> Chỉnh sửa đánh giá
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              className={`btn-write-review ${!hasPurchased ? 'btn-write-locked' : ''}`}
              onClick={handleOpenModal}
              title={!hasPurchased ? 'Cần mua hàng thành công để đánh giá' : 'Viết đánh giá ngay'}
            >
              {!hasPurchased && <Lock size={15} style={{ marginRight: '2px' }} />}
              <Edit3 size={16} /> Viết đánh giá
            </button>
          )}

          {!hasReviewed && !hasPurchased && isAuthenticated && (
            <span style={{ fontSize: '0.725rem', color: '#64748b', textAlign: 'center' }}>
              (Yêu cầu đã mua hàng thành công)
            </span>
          )}
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
            const isOwner = review.isMyReview || (user && review.userId === user.id);
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

                  {/* Nút sửa / xóa của người viết hoặc admin */}
                  <div className="review-actions-menu">
                    {isOwner && (
                      <button 
                        type="button" 
                        className="review-action-btn"
                        onClick={handleOpenModal}
                        title="Chỉnh sửa đánh giá"
                      >
                        <Edit3 size={13} /> Sửa
                      </button>
                    )}
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

      {/* 5. MODAL VIẾT ĐÁNH GIÁ (CHỈ MỞ KHI ĐÃ MUA HÀNG THÀNH CÔNG) */}
      {isModalOpen && (
        <div className="review-modal-backdrop" onClick={handleCloseModal}>
          <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <h3 className="review-modal-title">
                {myReview ? 'Chỉnh sửa bài đánh giá' : 'Đánh giá sản phẩm'}
              </h3>
              <button 
                type="button" 
                className="review-modal-close" 
                onClick={handleCloseModal}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="review-modal-body">
                {/* Thông tin sản phẩm */}
                <div className="review-product-preview">
                  {product?.primaryImageUrl || product?.image ? (
                    <img 
                      src={product.primaryImageUrl || product.image} 
                      alt={product.name} 
                      className="review-product-thumb" 
                    />
                  ) : null}
                  <div className="review-product-name">{product?.name}</div>
                </div>

                {/* Chọn số sao */}
                <div className="star-selector-box">
                  <div className="star-selector-row">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const activeScore = modalHoverRating || modalRating;
                      const isFilled = star <= activeScore;
                      return (
                        <button
                          key={star}
                          type="button"
                          className={`star-btn ${isFilled ? 'active' : ''}`}
                          onMouseEnter={() => setModalHoverRating(star)}
                          onMouseLeave={() => setModalHoverRating(0)}
                          onClick={() => setModalRating(star)}
                          aria-label={`${star} sao`}
                        >
                          <Star 
                            size={32} 
                            fill={isFilled ? '#f59e0b' : 'none'} 
                            color={isFilled ? '#f59e0b' : '#cbd5e1'} 
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="star-sentiment-text">
                    {SENTIMENT_LABELS[modalHoverRating || modalRating]}
                  </div>
                </div>

                {formError && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="review-form-group">
                  <label className="review-form-label">
                    Tiêu đề (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    className="review-form-input"
                    placeholder="Ví dụ: Rất ưng ý, chất lượng tốt..."
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="review-form-group">
                  <label className="review-form-label">
                    Cảm nhận chi tiết về sản phẩm *
                  </label>
                  <textarea
                    className="review-form-textarea"
                    placeholder="Hãy chia sẻ trải nghiệm thực tế của bạn về chất lượng, thiết kế, hiệu năng, đóng gói giao hàng..."
                    value={modalContent}
                    onChange={(e) => setModalContent(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="review-policy-notice">
                  ℹ️ <strong>Quy định:</strong> Bạn đã mua sản phẩm này tại Cyber. Mỗi khách hàng chỉ được viết <strong>1 bài đánh giá</strong> và có thể chỉnh sửa lại nội dung bất kỳ lúc nào.
                </div>
              </div>

              <div className="review-modal-footer">
                <button 
                  type="button" 
                  className="btn-modal-cancel" 
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang gửi...' : (myReview ? 'Lưu thay đổi' : 'Gửi đánh giá')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL THÔNG BÁO KHI CHƯA MUA HÀNG */}
      {showNotPurchasedModal && (
        <div className="review-modal-backdrop" onClick={() => setShowNotPurchasedModal(false)}>
          <div className="review-modal-content" style={{ maxWidth: '440px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ width: '100%' }} />
              <button 
                type="button" 
                className="review-modal-close" 
                onClick={() => setShowNotPurchasedModal(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="review-modal-body" style={{ padding: '0.5rem 1.75rem 1.75rem', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <ShoppingBag size={30} color="#ea580c" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
                Chỉ dành cho khách đã mua hàng
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                Bạn cần mua sản phẩm <strong>"{product?.name}"</strong> và hoàn tất đơn hàng thành công trước khi có thể viết đánh giá & nhận xét.
              </p>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8125rem', color: '#64748b', marginTop: '1rem', width: '100%' }}>
                💡 Tính năng này giúp đảm bảo 100% đánh giá trên hệ thống là khách quan từ người dùng thực tế.
              </div>
            </div>

            <div className="review-modal-footer" style={{ justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn-modal-submit"
                style={{ width: '100%' }}
                onClick={() => setShowNotPurchasedModal(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
