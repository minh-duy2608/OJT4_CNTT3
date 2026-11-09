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
  RotateCcw,
  Eye,
  Star,
  HelpCircle
} from 'lucide-react';
import { useOrders, ORDER_STATUSES } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { formatVND } from '../data/products';
import { ConfirmModal } from '../components/ConfirmModal';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { OrderReviewModal } from '../components/OrderReviewModal';
import { OrderReturnModal } from '../components/OrderReturnModal';
import './OrdersPage.css';

export const OrdersPage = () => {
  const { orders, loading, updateOrderStatus, cancelOrder, confirmDelivery, fetchOrdersFromApi } = useOrders();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Modal xác nhận hủy đơn, xác nhận nhận hàng & Xem chi tiết đơn
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [orderToConfirmDelivery, setOrderToConfirmDelivery] = useState(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [orderToReview, setOrderToReview] = useState(null);
  const [orderToReturn, setOrderToReturn] = useState(null);
  const [orderNotReceived, setOrderNotReceived] = useState(null);

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
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#64748b' }}>
          <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '0.85rem' }}>
            <RotateCcw size={32} color="#2563eb" />
          </div>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Đang tải danh sách đơn hàng...</p>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Vui lòng đợi trong giây lát</span>
        </div>
      ) : filteredOrders.length === 0 ? (
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
                    {/* 1. ĐƠN ĐANG GIAO HOẶC ĐÃ GIAO NHƯNG KHÁCH CHƯA BẤM "ĐÃ NHẬN ĐƯỢC HÀNG" */}
                    {(!order.buyerConfirmedDelivery && (order.canConfirmDelivery || order.status === 'delivering' || order.status === 'shipped' || order.rawStatus === 'SHIPPED' || order.status === 'delivered' || order.rawStatus === 'DELIVERED')) ? (
                      <>
                        <button
                          type="button"
                          style={{
                            background: '#059669',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.48rem 0.95rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                          }}
                          onClick={() => setOrderToConfirmDelivery(order)}
                          title="Xác nhận bạn đã nhận được hàng và hài lòng với sản phẩm"
                        >
                          <CheckCircle2 size={16} /> Đã nhận được hàng
                        </button>

                        <button
                          type="button"
                          style={{
                            background: '#ffffff',
                            color: '#b45309',
                            border: '1px solid #fcd34d',
                            borderRadius: '8px',
                            padding: '0.48rem 0.9rem',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          onClick={() => setOrderNotReceived(order)}
                          title="Báo cáo bạn chưa nhận được kiện hàng hoặc nhân viên giao nhầm"
                        >
                          <HelpCircle size={15} /> Bạn chưa nhận được hàng?
                        </button>
                      </>
                    ) : (order.buyerConfirmedDelivery || order.status === 'delivered' || order.rawStatus === 'DELIVERED') ? (
                      /* 2. SAU KHI ĐÃ BẤM XÁC NHẬN NHẬN HÀNG: CHUYỂN THÀNH ĐÁNH GIÁ SẢN PHẨM & HOÀN HÀNG TRẢ TIỀN */
                      <>
                        <button
                          type="button"
                          style={{
                            background: '#f59e0b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.48rem 0.95rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          onClick={() => setOrderToReview(order)}
                          title="Đánh giá chất lượng sản phẩm và dịch vụ của shop"
                        >
                          <Star size={15} fill="#fff" /> Đánh giá sản phẩm
                        </button>

                        {/* Nút Hoàn hàng trả tiền hoặc hiển thị trạng thái hoàn tiền */}
                        {order.returnRequest ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: '1px solid #fecaca'
                          }}>
                            <RotateCcw size={14} /> Hoàn tiền: {order.returnRequest.status}
                          </div>
                        ) : (
                          <button
                            type="button"
                            style={{
                              background: '#ffffff',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              borderRadius: '8px',
                              padding: '0.48rem 0.95rem',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onClick={() => setOrderToReturn(order)}
                            title="Yêu cầu trả hàng hoàn tiền nếu sản phẩm bị lỗi hoặc sai mô tả"
                          >
                            <RotateCcw size={15} /> Hoàn hàng trả tiền
                          </button>
                        )}
                      </>
                    ) : null}

                    {/* Nút xem chi tiết đơn hàng */}
                    <button
                      type="button"
                      className="btn-order-view-detail"
                      onClick={() => setSelectedOrderForDetail(order)}
                      title="Xem toàn bộ thông tin chi tiết và hóa đơn"
                    >
                      <Eye size={15} /> Chi tiết đơn hàng
                    </button>

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

      {/* MODAL: XEM CHI TIẾT ĐƠN HÀNG */}
      <OrderDetailModal
        isOpen={Boolean(selectedOrderForDetail)}
        onClose={() => setSelectedOrderForDetail(null)}
        order={selectedOrderForDetail}
        onConfirmDelivery={(ord) => {
          setSelectedOrderForDetail(null);
          setOrderToConfirmDelivery(ord);
        }}
        onOrderUpdated={fetchOrdersFromApi}
        onOpenReviewModal={(ord) => setOrderToReview(ord)}
        onOpenReturnModal={(ord) => setOrderToReturn(ord)}
      />

      {/* MODAL: ĐÁNH GIÁ ĐƠN HÀNG VÀ CỬA HÀNG (TÁCH BIỆT) */}
      <OrderReviewModal
        isOpen={Boolean(orderToReview)}
        onClose={() => setOrderToReview(null)}
        order={orderToReview}
        onSuccess={() => {
          fetchOrdersFromApi();
        }}
      />

      {/* MODAL: YÊU CẦU HOÀN HÀNG & TRẢ TIỀN (TÁCH BIỆT) */}
      <OrderReturnModal
        isOpen={Boolean(orderToReturn)}
        onClose={() => setOrderToReturn(null)}
        order={orderToReturn}
        onSuccess={() => {
          fetchOrdersFromApi();
        }}
      />

      {/* MODAL: BẠN CHƯA NHẬN ĐƯỢC HÀNG? */}
      {orderNotReceived && (
        <div 
          className="order-not-received-modal-backdrop"
          onClick={() => setOrderNotReceived(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            className="order-not-received-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Bạn chưa nhận được kiện hàng này?
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Đơn hàng #{orderNotReceived.id} • {orderNotReceived.shopName || 'Shop đối tác'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#0f172a' }}>
                Xin đừng lo lắng, quyền lợi của bạn luôn được bảo vệ:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Nhân viên giao vận có thể đang trên đường tới giao trong ít phút tới.</li>
                <li>Bạn vui lòng kiểm tra mục <strong>"Chi tiết đơn hàng"</strong> để xem mã vận đơn và lộ trình vận chuyển.</li>
                <li>Nếu quá hạn dự kiến vẫn chưa nhận được, hệ thống Cyber cam kết sẽ can thiệp và hoàn tiền 100% cho bạn.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setOrderNotReceived(null)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = orderNotReceived;
                  setOrderNotReceived(null);
                  setSelectedOrderForDetail(target);
                }}
                style={{
                  padding: '0.55rem 1.2rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Eye size={15} /> Xem chi tiết vận chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN NHẬN HÀNG */}
      <ConfirmModal
        isOpen={Boolean(orderToConfirmDelivery)}
        onClose={() => setOrderToConfirmDelivery(null)}
        type="primary"
        title="Xác nhận đã nhận hàng"
        message={orderToConfirmDelivery ? `Bạn xác nhận đã nhận được kiện hàng #${orderToConfirmDelivery.id} và kiểm tra sản phẩm thành công? Trạng thái đơn sẽ được cập nhật thành Đã giao (DELIVERED).` : ''}
        confirmText="Tôi đã nhận hàng"
        cancelText="Chưa nhận được"
        onConfirm={async () => {
          if (orderToConfirmDelivery) {
            try {
              await confirmDelivery(orderToConfirmDelivery.id);
            } catch (e) {
              alert(e.message || 'Lỗi khi xác nhận nhận hàng');
            }
            setOrderToConfirmDelivery(null);
          }
        }}
      />

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
