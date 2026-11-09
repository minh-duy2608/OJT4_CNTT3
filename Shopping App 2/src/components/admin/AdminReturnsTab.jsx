import React, { useState, useEffect } from 'react';
import { RotateCcw, Check, X, RefreshCw, AlertCircle, DollarSign, Clock } from 'lucide-react';
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
    setResolutionNote(item.resolutionNote || '');
  };

  const handleSaveAction = async (e) => {
    e.preventDefault();
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED': return { bg: '#eff6ff', color: '#2563eb', label: 'Đã chấp nhận' };
      case 'RECEIVED': return { bg: '#f5f3ff', color: '#7c3aed', label: 'Đã nhận lại hàng' };
      case 'REFUNDED': return { bg: '#ecfdf5', color: '#059669', label: 'Đã hoàn tiền' };
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
            Duyệt yêu cầu đổi trả, kiểm tra lý do và thực hiện hoàn tiền cho khách hàng
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
              <th style={{ padding: '0.75rem 1rem' }}>Lý do trả hàng</th>
              <th style={{ padding: '0.75rem 1rem' }}>Số tiền yêu cầu</th>
              <th style={{ padding: '0.75rem 1rem' }}>Trạng thái</th>
              <th style={{ padding: '0.75rem 1rem' }}>Ghi chú / Phản hồi</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Đang tải danh sách yêu cầu đổi trả...
                </td>
              </tr>
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Không có yêu cầu trả hàng nào.
                </td>
              </tr>
            ) : (
              returns.map((r) => {
                const badge = getStatusBadge(r.status);
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>#{r.id}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#2563eb', fontWeight: 600 }}>
                      #{r.orderId}
                    </td>
                    {isAdmin && <td style={{ padding: '0.75rem 1rem' }}>#{r.shopId}</td>}
                    <td style={{ padding: '0.75rem 1rem', maxWidth: '220px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.reason}</div>
                      {r.note && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.note}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#dc2626' }}>
                      {formatVND(r.requestedAmount || 0)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: badge.bg, color: badge.color, padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>
                      {r.resolutionNote || 'Chưa có'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenAction(r)}
                        style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Xử lý
                      </button>
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
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '500px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
              Xử lý Yêu cầu Đổi trả / Hoàn tiền #{selectedReturn.id} (Đơn #{selectedReturn.orderId})
            </h3>
            <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.825rem', marginBottom: '12px' }}>
              <div><strong>Lý do:</strong> {selectedReturn.reason}</div>
              {selectedReturn.note && <div><strong>Mô tả chi tiết:</strong> {selectedReturn.note}</div>}
              <div><strong>Số tiền:</strong> {formatVND(selectedReturn.requestedAmount || 0)}</div>
            </div>

            <form onSubmit={handleSaveAction} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '4px' }}>
                  Hành động / Trạng thái mới:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="REQUESTED">REQUESTED - Chờ duyệt</option>
                  <option value="APPROVED">APPROVED - Chấp thuận trả hàng</option>
                  <option value="RECEIVED">RECEIVED - Đã nhận lại hàng trả về kho</option>
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
                  placeholder="Nhập lý do chấp nhận hoặc từ chối, hướng dẫn gửi hàng..."
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
                  {submitting ? 'Đang lưu...' : 'Xác nhận xử lý'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
