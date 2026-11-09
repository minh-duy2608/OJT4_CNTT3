import React, { useState, useEffect } from 'react';
import { Truck, Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, Edit, Plus } from 'lucide-react';
import { shipmentApi } from '../../services/shipmentApi';
import { formatVND } from '../../data/products';

export const AdminShipmentsTab = ({ isAdmin, shopId }) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editingShipment, setEditingShipment] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editTrackingCode, setEditTrackingCode] = useState('');
  const [editCarrier, setEditCarrier] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchShipments = async (p = 0) => {
    try {
      setLoading(true);
      let res;
      if (isAdmin) {
        res = await shipmentApi.getAdminShipments({ page: p, size: 10 });
      } else if (shopId) {
        res = await shipmentApi.getShopShipments(shopId, { page: p, size: 10 });
      }
      const list = res?.content || (Array.isArray(res) ? res : []);
      setShipments(list);
      setTotalPages(res?.totalPages || 1);
      setPage(p);
    } catch (err) {
      console.error('Lỗi tải danh sách vận chuyển', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments(0);
  }, [isAdmin, shopId]);

  const handleOpenEdit = (item) => {
    setEditingShipment(item);
    setEditStatus(item.status);
    setEditTrackingCode(item.trackingCode || '');
    setEditCarrier(item.carrier || 'Giao Hàng Nhanh');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingShipment) return;
    try {
      setSubmitting(true);
      if (isAdmin) {
        await shipmentApi.updateAdminShipment(editingShipment.id, {
          status: editStatus,
          trackingCode: editTrackingCode,
          carrier: editCarrier
        });
      } else {
        await shipmentApi.updateShipment(shopId, editingShipment.id, {
          status: editStatus,
          trackingCode: editTrackingCode,
          carrier: editCarrier
        });
      }
      setEditingShipment(null);
      fetchShipments(page);
    } catch (err) {
      alert(err.message || 'Lỗi cập nhật vận chuyển');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED': return { bg: '#ecfdf5', color: '#059669', label: 'Đã giao thành công' };
      case 'IN_TRANSIT': return { bg: '#eff6ff', color: '#2563eb', label: 'Đang vận chuyển' };
      case 'PICKED_UP': return { bg: '#f5f3ff', color: '#7c3aed', label: 'Đã lấy hàng' };
      case 'RETURNING': return { bg: '#fff7ed', color: '#ea580c', label: 'Đang trả hàng' };
      case 'RETURNED': return { bg: '#fef2f2', color: '#dc2626', label: 'Đã trả hàng' };
      case 'FAILED': return { bg: '#fef2f2', color: '#dc2626', label: 'Giao thất bại' };
      default: return { bg: '#f1f5f9', color: '#64748b', label: 'Chờ xử lý' };
    }
  };

  return (
    <div className="admin-content-card">
      <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={22} color="#2563eb" />
            {isAdmin ? 'Quản lý Giao hàng & Vận chuyển Toàn Hệ thống' : 'Quản lý Giao hàng của Cửa hàng'}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Theo dõi mã vận đơn, đơn vị vận chuyển (GHN, GHTK, Viettel Post) và tiến trình giao nhận
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchShipments(page)}
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
              <th style={{ padding: '0.75rem 1rem' }}>Mã Vận Chuyển</th>
              <th style={{ padding: '0.75rem 1rem' }}>Đơn hàng #</th>
              <th style={{ padding: '0.75rem 1rem' }}>Đơn vị vận chuyển</th>
              <th style={{ padding: '0.75rem 1rem' }}>Mã vận đơn (Tracking Code)</th>
              <th style={{ padding: '0.75rem 1rem' }}>Phí vận chuyển</th>
              <th style={{ padding: '0.75rem 1rem' }}>Trạng thái</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Đang tải dữ liệu vận chuyển...
                </td>
              </tr>
            ) : shipments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Chưa có thông tin vận chuyển nào.
                </td>
              </tr>
            ) : (
              shipments.map((s) => {
                const meta = getStatusColor(s.status);
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>#{s.id}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#2563eb', fontWeight: 600 }}>
                      #{s.orderId}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{s.carrier || 'Giao hàng Tiêu chuẩn'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, color: '#0f172a' }}>
                        {s.trackingCode || 'Chưa cập nhật'}
                      </code>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{formatVND(s.shippingFee || 0)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: meta.bg, color: meta.color, padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit size={13} /> Cập nhật
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
            onClick={() => fetchShipments(page - 1)}
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
            onClick={() => fetchShipments(page + 1)}
            className="admin-btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            Trang sau
          </button>
        </div>
      )}

      {/* Modal Cập nhật vận chuyển */}
      {editingShipment && (
        <div className="admin-modal-backdrop" onClick={() => setEditingShipment(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '480px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
              Cập nhật Vận chuyển Đơn hàng #{editingShipment.orderId}
            </h3>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '4px' }}>
                  Đơn vị vận chuyển
                </label>
                <input
                  type="text"
                  value={editCarrier}
                  onChange={(e) => setEditCarrier(e.target.value)}
                  placeholder="GHN, GHTK, Viettel Post..."
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '4px' }}>
                  Mã vận đơn (Tracking Code)
                </label>
                <input
                  type="text"
                  value={editTrackingCode}
                  onChange={(e) => setEditTrackingCode(e.target.value)}
                  placeholder="VD: GHN-827361928"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '4px' }}>
                  Trạng thái vận chuyển
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="PENDING">PENDING - Chờ đơn vị vận chuyển lấy hàng</option>
                  <option value="PICKED_UP">PICKED_UP - Đã lấy hàng</option>
                  <option value="IN_TRANSIT">IN_TRANSIT - Đang trung chuyển / giao hàng</option>
                  <option value="DELIVERED">DELIVERED - Giao hàng thành công</option>
                  <option value="RETURNING">RETURNING - Đang hoàn trả về shop</option>
                  <option value="RETURNED">RETURNED - Đã hoàn trả về shop</option>
                  <option value="FAILED">FAILED - Giao thất bại</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.5rem 1.2rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

