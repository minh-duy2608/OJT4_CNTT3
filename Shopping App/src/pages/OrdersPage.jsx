import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  CreditCard, 
  Tag, 
  ArrowRight, 
  ShoppingBag, 
  AlertCircle,
  FileText,
  RotateCcw
} from 'lucide-react';
import { useOrders, ORDER_STATUSES } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { formatVND } from '../data/products';
import { ConfirmModal } from '../components/ConfirmModal';
import './OrdersPage.css';

export const OrdersPage = () => {
  const { orders, updateOrderStatus, cancelOrder } = useOrders();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Model Box xác nhận hủy đơn
  const [orderToCancel, setOrderToCancel] = useState(null);

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth?mode=login');
    }
  }, [isAuthenticated, navigate]);

  // Tab lọc trạng thái đơn: 'all' hoặc key của ORDER_STATUSES
  const [activeTab, setActiveTab] = useState('all');

  // Lọc danh sách theo tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    return order.status === activeTab;
  });

  // Tính số lượng đơn theo từng trạng thái
  const getTabCount = (tabKey) => {
    if (tabKey === 'all') return orders.length;
    return orders.filter((o) => o.status === tabKey).length;
  };

  // Helper định dạng ngày giờ Việt Nam
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

  // Tìm thông tin metadata của status
  const getStatusMeta = (statusKey) => {
    return ORDER_STATUSES.find((s) => s.key === statusKey) || {
      key: statusKey,
      label: statusKey === 'cancelled' ? 'Đã hủy' : statusKey,
      step: 0,
      color: '#6b7280',
      bg: '#f3f4f6'
    };
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container orders-page-wrapper">
      {/* Header */}
      <div className="orders-page-header">
        <h1 className="orders-page-title">Đơn hàng của tôi</h1>
        <p className="orders-page-subtitle">
          Theo dõi hành trình đơn hàng theo thời gian thực từ lúc đặt đến khi giao tận tay bạn.
        </p>
      </div>

      {/* Tabs lọc trạng thái */}
      <div className="orders-filter-tabs" role="tablist">
        <button
          type="button"
          className={`order-filter-tab ${activeTab === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>Tất cả</span>
          <span className="order-tab-badge">{getTabCount('all')}</span>
        </button>

        {ORDER_STATUSES.map((status) => (
          <button
            key={status.key}
            type="button"
            className={`order-filter-tab ${activeTab === status.key ? 'is-active' : ''}`}
            onClick={() => setActiveTab(status.key)}
          >
            <span>{status.label}</span>
            <span className="order-tab-badge">{getTabCount(status.key)}</span>
          </button>
        ))}
      </div>

      {/* Danh sách đơn hàng */}
      {filteredOrders.length === 0 ? (
        <div className="orders-empty-state">
          <div className="empty-icon-wrap">
            <Package size={36} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Không có đơn hàng nào
          </h3>
          <p style={{ color: '#71717a', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            {activeTab === 'all'
              ? 'Bạn chưa có đơn hàng nào tại Cyber. Hãy chọn các sản phẩm công nghệ bạn yêu thích nhé!'
              : `Hiện chưa có đơn hàng nào ở trạng thái "${getStatusMeta(activeTab).label}".`}
          </p>
          <Link to="/products" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={16} /> Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => {
            const currentMeta = getStatusMeta(order.status);
            const currentStep = currentMeta.step || 1;
            // Tiến trình phần trăm cho thanh ngang (0% -> 25% -> 50% -> 75% -> 100%)
            const progressPercent = Math.max(0, Math.min(100, ((currentStep - 1) / 4) * 100));

            return (
              <div key={order.id} className="order-card">
                {/* Header đơn hàng */}
                <div className="order-card-header">
                  <div className="order-meta-info">
                    <span className="order-id-label">{order.id}</span>
                    <span style={{ color: '#d4d4d8' }}>•</span>
                    <span className="order-date-text">
                      <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                      Ngày đặt: {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div
                    className="order-status-badge"
                    style={{
                      backgroundColor: currentMeta.bg,
                      color: currentMeta.color
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: currentMeta.color
                      }}
                    />
                    {currentMeta.label}
                  </div>
                </div>

                {/* 5-BƯỚC THEO DÕI ĐƠN HÀNG (TIMELINE STEPPER) */}
                {order.status !== 'cancelled' ? (
                  <div className="order-tracking-section">
                    <div className="tracking-title">Tiến trình vận chuyển</div>
                    <div className="stepper-progress-bar">
                      {/* Đường line nối phía sau */}
                      <div className="stepper-line">
                        <div
                          className="stepper-line-fill"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      {/* 5 Nút trạng thái */}
                      {ORDER_STATUSES.map((st) => {
                        const isCompleted = currentStep > st.step;
                        const isCurrent = currentStep === st.step;

                        return (
                          <div
                            key={st.key}
                            className={`stepper-node ${isCompleted ? 'is-completed' : ''} ${isCurrent ? 'is-current' : ''}`}
                          >
                            <div className="stepper-icon-circle">
                              {isCompleted ? <CheckCircle2 size={18} /> : st.step}
                            </div>
                            <span className="stepper-label">{st.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem 1.75rem', background: '#fef2f2', color: '#991b1b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>Đơn hàng này đã bị hủy.</span>
                  </div>
                )}

                {/* Chi tiết đơn hàng: Địa chỉ nhận hàng & Danh sách sản phẩm */}
                <div className="order-details-grid">
                  {/* Cột trái: Thông tin nhận hàng */}
                  <div className="order-shipping-summary">
                    <div className="detail-section-title">
                      <MapPin size={16} /> Địa chỉ nhận hàng
                    </div>
                    <div className="shipping-recipient-name">
                      {order.shippingAddress?.fullName}
                    </div>
                    <div className="shipping-recipient-phone">
                      {order.shippingAddress?.phone}
                    </div>
                    <div className="shipping-recipient-address">
                      {order.shippingAddress?.detailAddress}, {order.shippingAddress?.city}
                    </div>

                    <div className="detail-section-title" style={{ marginTop: '1.25rem' }}>
                      <CreditCard size={16} /> Phương thức thanh toán
                    </div>
                    <div className="payment-method-badge">
                      {order.paymentMethod || 'COD (Thanh toán khi nhận hàng)'}
                    </div>

                    {order.voucherCode && (
                      <div style={{ marginTop: '1rem', background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#065f46', fontSize: '0.8rem', fontWeight: 700 }}>
                          <Tag size={13} /> Mã giảm giá: {order.voucherCode}
                        </div>
                        <div style={{ color: '#047857', fontSize: '0.75rem', marginTop: '2px' }}>
                          Đã giảm -{formatVND(order.discountAmount || 0)}
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <div style={{ marginTop: '1rem', fontSize: '0.775rem', color: '#71717a' }}>
                        <strong>Ghi chú:</strong> {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Cột phải: Danh sách sản phẩm */}
                  <div className="order-items-table">
                    <div className="detail-section-title">
                      <Package size={16} /> Danh sách sản phẩm ({order.items?.length || 0})
                    </div>
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="order-item-row">
                        <img src={item.image} alt={item.name} className="order-item-img" />
                        <div className="order-item-info">
                          <div className="order-item-title">{item.name}</div>
                          <div className="order-item-meta">
                            {item.selectedColor && <span>Màu: {item.selectedColor} • </span>}
                            {item.selectedStorage && <span>Bản: {item.selectedStorage} • </span>}
                            <span>Số lượng: {item.quantity}</span>
                          </div>
                        </div>
                        <div className="order-item-price">
                          {formatVND((item.price || 0) * (item.quantity || 1))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer đơn hàng: Tổng tiền & Bộ công cụ chuyển đổi trạng thái (Test / Demo) */}
                <div className="order-card-footer">
                  <div className="order-total-block">
                    <span className="order-total-label">Tổng thanh toán:</span>
                    <span className="order-total-value">
                      {formatVND(order.totalPayment || order.subtotal)}
                    </span>
                  </div>

                  {/* Khu vực thao tác & mô phỏng trạng thái cho người dùng */}
                  <div className="order-actions-wrap">
                    {/* BỘ ĐIỀU KHIỂN MÔ PHỎNG TIẾN TRÌNH 5 BƯỚC */}
                    <div className="simulation-control-group" title="Tính năng mô phỏng để bạn kiểm tra từng trạng thái đơn hàng">
                      <span className="simulation-label">Mô phỏng tiến trình:</span>
                      <select
                        className="simulation-select"
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st.key} value={st.key}>
                            {st.step}. {st.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nút hủy đơn (Chỉ hiện khi đơn ở bước "Chờ xác nhận") */}
                    {order.status === 'pending' && (
                      <button
                        type="button"
                        className="btn-order-cancel"
                        onClick={() => setOrderToCancel(order)}
                      >
                        Hủy đơn hàng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODEL BOX: XÁC NHẬN HỦY ĐƠN HÀNG */}
      <ConfirmModal
        isOpen={Boolean(orderToCancel)}
        onClose={() => setOrderToCancel(null)}
        type="danger"
        title="Xác nhận hủy đơn hàng"
        message={orderToCancel ? `Bạn có chắc chắn muốn hủy đơn hàng #${orderToCancel.id}? Thao tác này sẽ dừng việc giao hàng.` : ''}
        confirmText="Xác nhận hủy đơn"
        cancelText="Giữ lại đơn hàng"
        onConfirm={() => {
          if (orderToCancel) {
            cancelOrder(orderToCancel.id);
            setOrderToCancel(null);
          }
        }}
      />
    </div>
  );
};
