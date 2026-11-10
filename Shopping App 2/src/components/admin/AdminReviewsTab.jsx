import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, ShieldAlert, Eye, EyeOff, RefreshCw, Send, Trash2 } from 'lucide-react';
import { shopReviewApi } from '../../services/shopReviewApi';

export const AdminReviewsTab = ({ isAdmin, shopId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [replyingReview, setReplyingReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchReviews = async (p = 0) => {
    try {
      setLoading(true);
      let res;
      if (isAdmin) {
        res = await shopReviewApi.getAdminReviews({ page: p, size: 10 });
      } else if (shopId) {
        res = await shopReviewApi.getShopManageReviews(shopId, { page: p, size: 10 });
      }
      const list = res?.content || (Array.isArray(res) ? res : []);
      setReviews(list);
      setTotalPages(res?.totalPages || 1);
      setPage(p);
    } catch (err) {
      console.error('Lỗi tải đánh giá', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(0);
  }, [isAdmin, shopId]);

  const handleToggleModeration = async (review) => {
    const nextStatus = review.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    try {
      await shopReviewApi.moderateReview(review.id, { status: nextStatus });
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, status: nextStatus } : r))
      );
    } catch (err) {
      alert(err.message || 'Lỗi kiểm duyệt đánh giá');
    }
  };

  const handleOpenReply = (review) => {
    setReplyingReview(review);
    setReplyText(review.shopReply || '');
  };

  const handleSaveReply = async (e) => {
    e.preventDefault();
    if (!replyingReview) return;
    try {
      setSubmittingReply(true);
      const updated = await shopReviewApi.replyReview(shopId, replyingReview.id, { reply: replyText });
      setReviews((prev) =>
        prev.map((r) => (r.id === replyingReview.id ? { ...r, shopReply: replyText } : r))
      );
      setReplyingReview(null);
    } catch (err) {
      alert(err.message || 'Lỗi gửi phản hồi đánh giá');
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(d);
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="admin-content-card">
      <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={22} color="#f59e0b" fill="#f59e0b" />
            {isAdmin ? 'Quản trị & Kiểm duyệt Đánh giá Cửa hàng Toàn Hệ thống' : 'Quản lý & Phản hồi Đánh giá Khách hàng'}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            {isAdmin
              ? 'Kiểm duyệt nội dung, ẩn các đánh giá vi phạm tiêu chuẩn cộng đồng hoặc độc hại'
              : 'Xem phản hồi của người mua về chất lượng phục vụ và giải đáp thắc mắc của khách hàng'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchReviews(page)}
          className="admin-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      <div className="admin-table-wrapper" style={{ overflowX: 'auto', marginTop: '1rem' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Mã #</th>
              <th style={{ padding: '0.75rem 1rem' }}>Đơn hàng #</th>
              {isAdmin && <th style={{ padding: '0.75rem 1rem' }}>Cửa hàng</th>}
              <th style={{ padding: '0.75rem 1rem' }}>Khách hàng</th>
              <th style={{ padding: '0.75rem 1rem' }}>Số sao</th>
              <th style={{ padding: '0.75rem 1rem' }}>Nội dung nhận xét</th>
              <th style={{ padding: '0.75rem 1rem' }}>Phản hồi của Shop</th>
              <th style={{ padding: '0.75rem 1rem' }}>Trạng thái</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Đang tải danh sách đánh giá...
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Chưa có đánh giá nào.
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>#{r.id}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#2563eb', fontWeight: 600 }}>#{r.orderId}</td>
                  {isAdmin && (
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      {r.shopName || `Shop #${r.shopId}`}
                    </td>
                  )}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{r.userFullName || r.username || 'Khách hàng'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDate(r.createdAt)}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          color={s <= r.rating ? '#f59e0b' : '#cbd5e1'}
                          fill={s <= r.rating ? '#f59e0b' : 'none'}
                        />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', maxWidth: '250px' }}>
                    <div style={{ color: '#334155', lineHeight: '1.4' }}>{r.comment || 'Không có bình luận chữ'}</div>
                    {Array.isArray(r.imageUrls) && r.imageUrls.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {r.imageUrls.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt="review attachment"
                            style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #e2e8f0' }}
                            onClick={() => window.open(img, '_blank')}
                            title="Bấm để xem ảnh phóng to"
                          />
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', maxWidth: '200px', fontSize: '0.8rem', color: '#475569' }}>
                    {r.shopReply ? (
                      <span style={{ color: '#059669', fontWeight: 600 }}>{r.shopReply}</span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa phản hồi</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        background: r.status === 'PUBLISHED' ? '#ecfdf5' : '#fef2f2',
                        color: r.status === 'PUBLISHED' ? '#059669' : '#dc2626',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.75rem'
                      }}
                    >
                      {r.status === 'PUBLISHED' ? 'Hiển thị' : 'Đã ẩn'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleToggleModeration(r)}
                        style={{
                          background: r.status === 'PUBLISHED' ? '#fef2f2' : '#ecfdf5',
                          color: r.status === 'PUBLISHED' ? '#dc2626' : '#059669',
                          border: `1px solid ${r.status === 'PUBLISHED' ? '#fecaca' : '#bbf7d0'}`,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {r.status === 'PUBLISHED' ? <EyeOff size={13} /> : <Eye size={13} />}
                        {r.status === 'PUBLISHED' ? 'Ẩn đánh giá' : 'Hiển thị lại'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenReply(r)}
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <MessageSquare size={13} /> {r.shopReply ? 'Sửa trả lời' : 'Trả lời'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => fetchReviews(page - 1)}
            className="admin-btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            Trang trước
          </button>
          <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center' }}>
            Trang {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => fetchReviews(page + 1)}
            className="admin-btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            Trang sau
          </button>
        </div>
      )}

      {/* Modal Phản hồi đánh giá của Shop */}
      {replyingReview && (
        <div className="admin-modal-backdrop" onClick={() => setReplyingReview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '480px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
              Phản hồi đánh giá của khách hàng #{replyingReview.id}
            </h3>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.825rem', marginBottom: '12px' }}>
              <div><strong>Khách hàng:</strong> {replyingReview.userFullName || replyingReview.username} ({replyingReview.rating} sao)</div>
              <div style={{ marginTop: '4px' }}><strong>Bình luận:</strong> {replyingReview.comment || 'Không có bình luận chữ'}</div>
            </div>

            <form onSubmit={handleSaveReply} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '4px' }}>
                  Nội dung phản hồi từ Cửa hàng:
                </label>
                <textarea
                  rows={4}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Cảm ơn quý khách đã mua hàng và đánh giá sản phẩm..."
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingReply}
                  style={{ padding: '0.5rem 1.2rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

