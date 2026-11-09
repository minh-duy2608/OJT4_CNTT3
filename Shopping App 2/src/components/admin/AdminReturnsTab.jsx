import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Check, 
  X, 
  RefreshCw, 
  AlertCircle, 
  DollarSign, 
  Clock, 
  Building2, 
  ExternalLink,
  PackageCheck,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { returnApi } from '../../services/returnApi';
import { formatVND } from '../../data/products';

export const AdminReturnsTab = ({ isAdmin, shopId }) => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReturns = async (p = 0) => {
    try {
      setLoading(true);
      let res;
      if (isAdmin) {
        res = await returnApi.getAdminReturns({ page: p, size: 10 });
      } else if (shopId) {
        res = await returnApi.getShopReturns(shopId, { page: p, size: 10 });
      }
      const list = res?.content || (Array.isArray(res) ? res : []);
      setReturns(list);
      setTotalPages(res?.totalPages || 1);
      setPage(p);
    } catch (err) {
      console.error('Lỗi tải danh sách yêu cầu trả hàng', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns(0);
  }, [isAdmin, shopId]);

  const handleOpenAction = (item, targetStatus) => {
    setSelectedReturn(item);
    setNewStatus(targetStatus || item.status);
    if (targetStatus === 'APPROVED') {
      setResolutionNote('Shop chấp thuận yêu cầu đổi trả. Quý khách vui lòng gửi kiện hàng qua bưu cục.');
    } else if (targetStatus === 'RECEIVED') {
      setResolutionNote('Shop đã nhận được kiện hàng hoàn về kho và kiểm tra thành công, tiến hành hoàn tiền cho khách hàng.');
    } else if (targetStatus === 'REJECTED') {
      setResolutionNote('Shop từ chối yêu cầu do không đáp ứng chính sách đổi trả hàng.');
    } else {
      setResolutionNote(item.resolutionNote || '');
    }
  };

  const handleSaveAction = async (e) => {
    if (e) e.preventDefault();
    if (!selectedReturn) return;
    try {
      setSubmitting(true);
      if (isAdmin) {
        await returnApi.updateAdminReturnStatus(selectedReturn.id, {
          status: newStatus,
          resolutionNote
        });
      } else {
        await returnApi.updateShopReturnStatus(shopId, selectedReturn.id, {
          status: newStatus,
          resolutionNote
        });
      }
      setSelectedReturn(null);
      fetchReturns(page);
    } catch (err) {
      alert(err.message || 'Lỗi xử lý yêu cầu trả hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectStatusUpdate = async (item, targetStatus, defaultNote) => {
    const confirmPrompt = targetStatus === 'RECEIVED'
      ? `Xác nhận Shop đã nhận được kiện hàng hoàn của đơn #${item.orderId}? Hệ thống sẽ tự động hoàn tiền cho người dùng.`
      : targetStatus === 'APPROVED'
      ? `Duyệt yêu cầu đổi trả cho đơn #${item.orderId}? Khách hàng sẽ mang hàng gửi tại bưu cục.`
      : `Từ chối yêu cầu đổi trả đơn #${item.orderId}?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      setLoading(true);
      const payload = {
        status: targetStatus,
        resolutionNote: defaultNote
      };
      if (isAdmin) {
        await returnApi.updateAdminReturnStatus(item.id, payload);
      } else {
        await returnApi.updateShopReturnStatus(shopId, item.id, payload);
      }
      fetchReturns(page);
    } catch (err) {
      alert(err.message || 'Lỗi cập nhật trạng thái');
    } finally {
      setLoading(false);
    }
  };

  const parseEvidence = (urls) => {
    if (!urls) return [];
    try {
      if (typeof urls === 'string' && urls.startsWith('[')) {
        return JSON.parse(urls);
      }
      return [urls];
    } catch {
      return [urls];
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED': return { bg: '#eff6ff', color: '#2563eb', label: 'Shop đã duyệt - Chờ gửi hàng' };
      case 'RECEIVED': return { bg: '#f5f3ff', color: '#7c3aed', label: 'Shop đã nhận hàng - Đã hoàn tiền' };
      case 'REFUNDED': return { bg: '#ecfdf5', color: '#059669', label: 'Đã hoàn tiền thành công' };
      case 'REJECTED': return { bg: '#fef2f2', color: '#dc2626', label: 'Từ chối' };
      case 'CANCELLED': return { bg: '#f1f5f9', color: '#64748b', label: 'Đã hủy' };
      default: return { bg: '#fff7ed', color: '#ea580c', label: 'Chờ người bán duyệt' };
    }
  };

  return (
    <div className="admin-content-card">
      <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={22} color="#ea580c" />
            {isAdmin ? 'Quản trị Yêu cầu Trả hàng & Hoàn tiền Toàn Sàn' : 'Yêu cầu Trả hàng & Hoàn tiền Cửa hàng'}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Duyệt yêu cầu đổi trả, kiểm tra bằng chứng, bấm Đã nhận hàng để hoàn tiền cho người mua
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchReturns(page)}
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
              <th style={{ padding: '0.75rem 1rem' }}>Mã YC</th>
              <th style={{ padding: '0.75rem 1rem' }}>Đơn hàng #</th>
              {isAdmin && <th style={{ padding: '0.75rem 1rem' }}>Mã Shop</th>}
              <th style={{ padding: '0.75rem 1rem' }}>Lý do & Bằng chứng</th>
              <th style={{ padding: '0.75rem 1rem' }}>Hình thức trả</th>
              <th style={{ padding: '0.75rem 1rem' }}>Số tiền hoàn</th>
              <th style={{ padding: '0.75rem 1rem' }}>Trạng thái</th>
              <th style={{ padding: '0.75rem 1rem' }}>Ghi chú / Phản hồi</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Đang tải danh sách yêu cầu đổi trả...
                </td>
              </tr>
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Không có yêu cầu trả hàng nào.
                </td>
              </tr>
            ) : (
              returns.map((r) => {
                const badge = getStatusBadge(r.status);
                const evidences = parseEvidence(r.evidenceUrls);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>#{r.id}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#2563eb', fontWeight: 600 }}>
                      #{r.orderId}
                    </td>
                    {isAdmin && <td style={{ padding: '0.75rem 1rem' }}>#{r.shopId}</td>}
                    <td style={{ padding: '0.75rem 1rem', maxWidth: '240px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.reason}</div>
                      {r.note && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{r.note}</div>}
                      {evidences.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {evidences.slice(0, 3).map((imgUrl, i) => (
                            <a 
                              key={i} 
                              href={imgUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ display: 'inline-block', width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1' }}
                            >
                              <img src={imgUrl} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </a>
                          ))}
                          {evidences.length > 3 && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b', alignSelf: 'center' }}>+{evidences.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.785rem', color: '#1e40af', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={12} /> Trả tại bưu cục
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#dc2626' }}>
                      {formatVND(r.requestedAmount || 0)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: badge.bg, color: badge.color, padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569', maxWidth: '200px' }}>
                      {r.resolutionNote || 'Chưa có'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        {/* 1. Nếu trạng thái đang là REQUESTED -> Shop duyệt hoặc từ chối */}
                        {r.status === 'REQUESTED' && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleDirectStatusUpdate(r, 'APPROVED', 'Shop chấp thuận yêu cầu đổi trả. Vui lòng gửi kiện hàng qua bưu cục gần nhất.')}
                              style={{ background: '#059669', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                              title="Chấp thuận yêu cầu trả hàng"
                            >
                              Duyệt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAction(r, 'REJECTED')}
                              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                              title="Từ chối yêu cầu trả hàng"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}

                        {/* 2. Nếu trạng thái là APPROVED -> Shop bấm "ĐÃ NHẬN ĐƯỢC HÀNG" (Hoàn tiền cho khách) */}
                        {r.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => handleDirectStatusUpdate(r, 'RECEIVED', 'Shop đã nhận được kiện hàng hoàn về kho và kiểm tra thành công, tiến hành hoàn tiền cho khách hàng.')}
                            style={{
                              background: '#7c3aed',
                              color: '#fff',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 4px rgba(124, 58, 237, 0.25)'
                            }}
                            title="Xác nhận Shop đã nhận được hàng hoàn tại kho và hoàn tiền cho người mua"
                          >
                            <PackageCheck size={14} /> Đã nhận được hàng
                          </button>
                        )}

                        {/* Nút Xử lý / Chi tiết modal */}
                        <button
                          type="button"
                          onClick={() => handleOpenAction(r)}
                          style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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
            onClick={() => fetchReturns(page - 1)}
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
            onClick={() => fetchReturns(page + 1)}
            className="admin-btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            Trang sau
          </button>
        </div>
      )}

      {/* Modal Xử lý yêu cầu trả hàng */}
      {selectedReturn && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedReturn(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', padding: '1.5rem', width: '540px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Xử lý Yêu cầu Đổi trả / Hoàn tiền #{selectedReturn.id} (Đơn #{selectedReturn.orderId})
            </h3>
            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Lý do yêu cầu:</strong> {selectedReturn.reason}</div>
              {selectedReturn.note && <div><strong>Mô tả chi tiết:</strong> {selectedReturn.note}</div>}
              <div><strong>Số tiền hoàn trả:</strong> <span style={{ color: '#dc2626', fontWeight: 700 }}>{formatVND(selectedReturn.requestedAmount || 0)}</span></div>
              <div><strong>Phương thức hoàn hàng:</strong> <span style={{ color: '#2563eb', fontWeight: 600 }}>Trả hàng tại bưu cục (POST_OFFICE)</span></div>

              {/* Bằng chứng hình ảnh/video */}
              {parseEvidence(selectedReturn.evidenceUrls).length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <strong>Bằng chứng gửi kèm ({parseEvidence(selectedReturn.evidenceUrls).length}):</strong>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {parseEvidence(selectedReturn.evidenceUrls).map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1', display: 'inline-block' }}
                      >
                        <img src={url} alt={`evidence-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Thao tác nhanh chuyển trạng thái theo quy trình người bán */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                Hành động nhanh theo nghiệp vụ:
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setNewStatus('APPROVED');
                    setResolutionNote('Shop chấp thuận yêu cầu đổi trả. Quý khách vui lòng gửi kiện hàng qua bưu cục gần nhất.');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: newStatus === 'APPROVED' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: newStatus === 'APPROVED' ? '#eff6ff' : '#fff',
                    color: newStatus === 'APPROVED' ? '#1e40af' : '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  1. Duyệt yêu cầu (APPROVED)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewStatus('RECEIVED');
                    setResolutionNote('Shop đã nhận được kiện hàng hoàn về kho và kiểm tra thành công, tiến hành hoàn tiền cho khách hàng.');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: newStatus === 'RECEIVED' ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                    background: newStatus === 'RECEIVED' ? '#f5f3ff' : '#fff',
                    color: newStatus === 'RECEIVED' ? '#6d28d9' : '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  2. Đã nhận được hàng (RECEIVED - Hoàn tiền)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewStatus('REJECTED');
                    setResolutionNote('Shop từ chối yêu cầu do không đáp ứng chính sách đổi trả hàng.');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: newStatus === 'REJECTED' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                    background: newStatus === 'REJECTED' ? '#fef2f2' : '#fff',
                    color: newStatus === 'REJECTED' ? '#b91c1c' : '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Từ chối (REJECTED)
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveAction} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '4px' }}>
                  Hoặc chọn trạng thái tùy chỉnh:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="REQUESTED">REQUESTED - Chờ duyệt</option>
                  <option value="APPROVED">APPROVED - Chấp thuận trả hàng</option>
                  <option value="RECEIVED">RECEIVED - Đã nhận lại hàng trả về kho (Hoàn tiền)</option>
                  <option value="REFUNDED">REFUNDED - Hoàn tiền thành công</option>
                  <option value="REJECTED">REJECTED - Từ chối yêu cầu trả hàng</option>
                  <option value="CANCELLED">CANCELLED - Hủy yêu cầu</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '4px' }}>
                  Phản hồi / Ghi chú cho khách hàng:
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Nhập lý do chấp nhận hoặc từ chối, hướng dẫn gửi hàng qua bưu cục..."
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReturn(null)}
                  style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.5rem 1.2rem', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {submitting ? 'Đang lưu...' : 'Xác nhận cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

