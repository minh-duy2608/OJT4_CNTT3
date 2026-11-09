import React, { useState, useEffect } from 'react';
import { Shield, Search, RefreshCw, Eye, Calendar, User, Info, FileText } from 'lucide-react';
import { auditLogApi } from '../../services/auditLogApi';

export const AdminAuditLogsTab = ({ isAdmin, shopId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async (p = 0) => {
    try {
      setLoading(true);
      let res;
      if (isAdmin) {
        res = await auditLogApi.getAdminAuditLogs({
          action: filterAction || undefined,
          entityType: filterEntity || undefined,
          page: p,
          size: 15
        });
      } else if (shopId) {
        res = await auditLogApi.getShopAuditLogs(shopId, { page: p, size: 15 });
      }
      const list = res?.content || (Array.isArray(res) ? res : []);
      setLogs(list);
      setTotalPages(res?.totalPages || 1);
      setPage(p);
    } catch (err) {
      console.error('Lỗi tải nhật ký thao tác', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
  }, [isAdmin, shopId, filterAction, filterEntity]);

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
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
            <Shield size={22} color="#4f46e5" />
            {isAdmin ? 'Nhật ký Hoạt động Hệ thống (Audit Logs)' : 'Nhật ký Hoạt động Cửa hàng'}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Theo dõi tất cả thay đổi trạng thái, can thiệp quản trị, cập nhật kho hàng và phê duyệt
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchLogs(page)}
          className="admin-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '1rem', flexWrap: 'wrap' }}>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          >
            <option value="">Tất cả Hành động (Action)</option>
            <option value="ADMIN_OVERRIDE_ORDER_STATUS">ADMIN_OVERRIDE_ORDER_STATUS</option>
            <option value="UPDATE_ORDER_STATUS">UPDATE_ORDER_STATUS</option>
            <option value="SHIPMENT_CREATE">SHIPMENT_CREATE</option>
            <option value="RETURN_PROCESS">RETURN_PROCESS</option>
            <option value="MODERATE_REVIEW">MODERATE_REVIEW</option>
            <option value="UPDATE_INVENTORY">UPDATE_INVENTORY</option>
          </select>

          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          >
            <option value="">Tất cả Đối tượng (Entity)</option>
            <option value="ORDER">ORDER</option>
            <option value="SHIPMENT">SHIPMENT</option>
            <option value="RETURN">RETURN</option>
            <option value="REVIEW">REVIEW</option>
            <option value="INVENTORY">INVENTORY</option>
            <option value="SHOP">SHOP</option>
          </select>
        </div>
      )}

      <div className="admin-table-wrapper" style={{ overflowX: 'auto', marginTop: '1rem' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '0.75rem 1rem' }}>ID</th>
              <th style={{ padding: '0.75rem 1rem' }}>Thời gian</th>
              <th style={{ padding: '0.75rem 1rem' }}>Người thao tác</th>
              <th style={{ padding: '0.75rem 1rem' }}>Hành động (Action)</th>
              <th style={{ padding: '0.75rem 1rem' }}>Đối tượng</th>
              <th style={{ padding: '0.75rem 1rem' }}>Mã ĐT</th>
              <th style={{ padding: '0.75rem 1rem' }}>Chi tiết / Mô tả</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Xem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Đang tải nhật ký kiểm toán...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Chưa có nhật ký hoạt động nào được ghi lại.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>#{l.id}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>
                    {formatDate(l.createdAt)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                    {l.actorUsername || (l.actorUserId ? `User #${l.actorUserId}` : 'System')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <code style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {l.action}
                    </code>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{l.entityType || 'SYSTEM'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#2563eb' }}>#{l.entityId || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#334155' }}>
                    {l.details || 'Không có ghi chú'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedLog(l)}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                    >
                      <Eye size={13} />
                    </button>
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
            onClick={() => fetchLogs(page - 1)}
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
            onClick={() => fetchLogs(page + 1)}
            className="admin-btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            Trang sau
          </button>
        </div>
      )}

      {/* Modal Chi tiết Audit Log */}
      {selectedLog && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedLog(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '560px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={18} color="#4f46e5" /> Chi tiết Nhật ký Kiểm toán #{selectedLog.id}
            </h3>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Thời gian:</strong> {formatDate(selectedLog.createdAt)}</div>
              <div><strong>Người thực hiện:</strong> {selectedLog.actorUsername || (selectedLog.actorUserId ? `User #${selectedLog.actorUserId}` : 'System')}</div>
              <div><strong>Hành động:</strong> <code style={{ color: '#3730a3', fontWeight: 700 }}>{selectedLog.action}</code></div>
              <div><strong>Đối tượng:</strong> {selectedLog.entityType} (ID: #{selectedLog.entityId})</div>
              {selectedLog.shopId && <div><strong>Mã Cửa hàng liên quan:</strong> #{selectedLog.shopId}</div>}
              {selectedLog.ipAddress && <div><strong>Địa chỉ IP:</strong> {selectedLog.ipAddress}</div>}
              {selectedLog.userAgent && <div style={{ wordBreak: 'break-all' }}><strong>User Agent:</strong> {selectedLog.userAgent}</div>}
              <div style={{ marginTop: '8px' }}>
                <strong>Dữ liệu chi tiết:</strong>
                <pre style={{ background: '#0f172a', color: '#f8fafc', padding: '0.75rem', borderRadius: '6px', overflowX: 'auto', fontSize: '0.8rem', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                  {selectedLog.details || 'Không có dữ liệu chi tiết'}
                </pre>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ padding: '0.5rem 1.2rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
