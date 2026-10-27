import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  Plus, 
  CreditCard, 
  Truck, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Check, 
  ShieldCheck, 
  Home, 
  Briefcase,
  X,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { formatVND } from '../data/products';
import { AVAILABLE_VOUCHERS, calculateVoucherDiscount } from '../data/vouchers';
import { validatePhone } from '../utils/validation';
import { ConfirmModal } from '../components/ConfirmModal';
import './CheckoutPage.css';

export const CheckoutPage = () => {
  const { user, isAuthenticated, addresses, addAddress } = useAuth();
  const { 
    cartItems, 
    cartTotal, 
    selectedItems, 
    selectedTotal, 
    clearSelectedFromCart, 
    clearCart, 
    showToast 
  } = useCart();
  const { createOrder } = useOrders();
  const navigate = useNavigate();

  // Chỉ thanh toán các mặt hàng được chọn từ Giỏ hàng (nếu không có thì fallback cartItems)
  const itemsToCheckout = selectedItems.length > 0 ? selectedItems : cartItems;
  const subtotalToCheckout = selectedItems.length > 0 ? selectedTotal : cartTotal;

  // Model Box xác nhận đặt hàng
  const [showConfirmOrderModal, setShowConfirmOrderModal] = useState(false);
  const [showMissingAddressModal, setShowMissingAddressModal] = useState(false);

  // Validation lỗi SĐT khi thêm nhanh địa chỉ
  const [newPhoneError, setNewPhoneError] = useState('');

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth?mode=login');
    }
  }, [isAuthenticated, navigate]);

  // Chọn địa chỉ nhận hàng (Mặc định chọn địa chỉ isDefault hoặc địa chỉ đầu tiên)
  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddr?.id || null);

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  // Phương thức thanh toán: COD hoặc BANK_TRANSFER
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [orderNotes, setOrderNotes] = useState('');

  // Voucher
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');

  // Form thêm nhanh địa chỉ tại trang Checkout
  const [showQuickAddAddress, setShowQuickAddAddress] = useState(false);
  const [newFullName, setNewFullName] = useState(user?.name || '');
  const [newPhone, setNewPhone] = useState(user?.phone || '');
  const [newDetail, setNewDetail] = useState('');
  const [newCity, setNewCity] = useState('TP. Hồ Chí Minh');
  const [newType, setNewType] = useState('home');

  // Đang xử lý đặt hàng
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phí giao hàng tiêu chuẩn (50.000₫, miễn phí nếu đơn > 10.000.000₫)
  const baseShippingFee = subtotalToCheckout >= 10000000 ? 0 : 50000;

  // Tính giảm giá khi áp dụng Voucher
  let discountAmount = 0;
  let finalShippingFee = baseShippingFee;

  if (appliedVoucher) {
    if (appliedVoucher.type === 'percent') {
      discountAmount = Math.min((subtotalToCheckout * appliedVoucher.value) / 100, appliedVoucher.maxDiscount || Infinity);
    } else if (appliedVoucher.type === 'fixed') {
      discountAmount = appliedVoucher.value;
    } else if (appliedVoucher.type === 'shipping') {
      discountAmount = Math.min(finalShippingFee, appliedVoucher.value);
      finalShippingFee = Math.max(0, finalShippingFee - discountAmount);
    }
  }

  // Tổng thanh toán cuối cùng
  const finalTotal = Math.max(0, subtotalToCheckout + finalShippingFee - (appliedVoucher?.type === 'shipping' ? 0 : discountAmount));

  // Xử lý áp dụng Voucher
  const handleApplyVoucher = (codeToApply) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    setVoucherError('');
    setVoucherSuccess('');

    if (!code) {
      setVoucherError('Vui lòng nhập mã giảm giá.');
      return;
    }

    const result = calculateVoucherDiscount(code, subtotalToCheckout, baseShippingFee);
    if (!result.valid) {
      setVoucherError(result.message);
      return;
    }

    setAppliedVoucher(result.voucher);
    setVoucherCodeInput(result.voucher.code);
    setVoucherSuccess(result.message);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setVoucherSuccess('');
    setVoucherError('');
  };

  // Lưu địa chỉ mới nhanh
  const handleQuickSaveAddress = (e) => {
    e.preventDefault();
    if (!newFullName.trim() || !newPhone.trim() || !newDetail.trim()) {
      showToast('Vui lòng điền họ tên, số điện thoại và địa chỉ chi tiết.', 'warning');
      return;
    }

    // Validate số điện thoại đúng 10 số
    const phoneErr = validatePhone(newPhone);
    if (phoneErr) {
      setNewPhoneError(phoneErr);
      showToast(phoneErr, 'warning');
      return;
    }

    const newAddr = addAddress({
      fullName: newFullName.trim(),
      phone: newPhone.trim(),
      detailAddress: newDetail.trim(),
      city: newCity.trim(),
      type: newType,
      isDefault: addresses.length === 0
    });

    if (newAddr) {
      setSelectedAddressId(newAddr.id);
    }
    setNewPhoneError('');
    setShowQuickAddAddress(false);
    showToast('Đã thêm địa chỉ giao hàng mới!', 'success');
  };

  // Mở Model Box xác nhận đặt hàng
  const handlePlaceOrder = () => {
    if (itemsToCheckout.length === 0) {
      showToast('Chưa có sản phẩm nào được chọn để thanh toán!', 'warning');
      return;
    }

    const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddr) {
      setShowMissingAddressModal(true);
      return;
    }

    setShowConfirmOrderModal(true);
  };

  // Tiến hành ghi nhận đơn hàng sau khi người dùng bấm xác nhận trên Model Box
  const handleExecutePlaceOrder = () => {
    setShowConfirmOrderModal(false);
    const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddr) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const orderPayload = {
        shippingAddress: selectedAddr,
        items: itemsToCheckout.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          selectedColor: item.selectedColor || null,
          selectedStorage: item.selectedStorage || null
        })),
        voucherCode: appliedVoucher ? appliedVoucher.code : null,
        discountAmount: discountAmount,
        subtotal: subtotalToCheckout,
        shippingFee: finalShippingFee,
        totalPayment: finalTotal,
        paymentMethod: paymentMethod === 'COD' ? 'COD (Thanh toán khi nhận hàng)' : 'Chuyển khoản QR Ngân hàng',
        notes: orderNotes.trim()
      };

      const created = createOrder(orderPayload);
      // Xóa các sản phẩm đã được thanh toán (các sản phẩm chưa chọn vẫn giữ lại trong giỏ)
      clearSelectedFromCart();
      setIsSubmitting(false);
      navigate('/orders');
    }, 700);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (itemsToCheckout.length === 0) {
    return (
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>Chưa chọn sản phẩm nào để thanh toán</h2>
        <p style={{ color: '#71717a', marginBottom: '2rem' }}>
          Bạn chưa chọn sản phẩm nào trong giỏ hàng để tiến hành thanh toán. Hãy vào giỏ hàng và tích chọn các món bạn muốn mua nhé!
        </p>
        <Link to="/cart" className="btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} /> Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="container checkout-page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/cart" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#71717a', marginBottom: '0.75rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Quay lại giỏ hàng
        </Link>
        <h1 className="checkout-page-title">Xác nhận đơn hàng</h1>
        <p className="checkout-page-subtitle">
          Vui lòng kiểm tra kỹ địa chỉ nhận hàng, phương thức thanh toán và áp dụng voucher ưu đãi trước khi đặt hàng.
        </p>
      </div>

      <div className="checkout-grid-layout">
        {/* ================= CỘT TRÁI: ĐỊA CHỈ & PHƯƠNG THỨC THANH TOÁN ================= */}
        <div className="checkout-main-content">
          {/* PHẦN 1: ĐỊA CHỈ NHẬN HÀNG */}
          <section className="checkout-section-box">
            <div className="checkout-section-title">
              <div className="checkout-section-title-left">
                <MapPin size={20} />
                <span>1. Chọn địa chỉ nhận hàng</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddAddress(!showQuickAddAddress)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                <Plus size={15} /> Thêm địa chỉ mới
              </button>
            </div>

            {/* Form thêm địa chỉ nhanh nếu click mở */}
            {showQuickAddAddress && (
              <form onSubmit={handleQuickSaveAddress} style={{ background: '#f9f9fa', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid #e4e4e7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Thêm địa chỉ giao hàng mới</span>
                  <button type="button" onClick={() => setShowQuickAddAddress(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Họ và tên người nhận</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="VD: Hoàng Sơn"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Số điện thoại (10 chữ số) *</label>
                    <input
                      type="tel"
                      className={`form-input ${newPhoneError ? 'has-error' : ''}`}
                      value={newPhone}
                      onChange={(e) => {
                        setNewPhone(e.target.value);
                        if (newPhoneError) setNewPhoneError(validatePhone(e.target.value) || '');
                      }}
                      onBlur={() => setNewPhoneError(validatePhone(newPhone) || '')}
                      placeholder="VD: 0362490374"
                      maxLength={11}
                      required
                    />
                    {newPhoneError && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '3px', display: 'block' }}>
                        {newPhoneError}
                      </span>
                    )}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Địa chỉ chi tiết (Số nhà, ngõ/đường, Phường/Xã)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newDetail}
                    onChange={(e) => setNewDetail(e.target.value)}
                    placeholder="VD: Số 12 Đường Nguyễn Văn Cừ, Phường 4, Quận 5"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Tỉnh / Thành phố</label>
                    <select
                      className="form-input"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                    >
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Bình Dương">Bình Dương</option>
                      <option value="Đồng Nai">Đồng Nai</option>
                      <option value="Khác">Tỉnh thành khác</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Loại địa chỉ</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setNewType('home')}
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          borderRadius: '6px',
                          border: newType === 'home' ? '1.5px solid #000' : '1px solid #d4d4d8',
                          background: newType === 'home' ? '#000' : '#fff',
                          color: newType === 'home' ? '#fff' : '#000',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Nhà riêng
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewType('office')}
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          borderRadius: '6px',
                          border: newType === 'office' ? '1.5px solid #000' : '1px solid #d4d4d8',
                          background: newType === 'office' ? '#000' : '#fff',
                          color: newType === 'office' ? '#fff' : '#000',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Văn phòng
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddAddress(false)}
                    style={{ padding: '0.45rem 1rem', border: '1px solid #d4d4d8', borderRadius: '6px', background: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '0.45rem 1.25rem', border: 'none', borderRadius: '6px', background: '#000', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Lưu địa chỉ
                  </button>
                </div>
              </form>
            )}

            {/* Danh sách địa chỉ đã lưu */}
            {addresses.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#fafafa', borderRadius: '8px', border: '1px dashed #d4d4d8' }}>
                <p style={{ color: '#71717a', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  Bạn chưa có địa chỉ nhận hàng nào. Vui lòng bấm "Thêm địa chỉ mới" ở trên để tiếp tục.
                </p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowQuickAddAddress(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  <Plus size={15} /> Thêm địa chỉ nhận hàng
                </button>
              </div>
            ) : (
              <div className="checkout-address-list">
                {addresses.map((addr) => {
                  const isSelected = addr.id === selectedAddressId;
                  return (
                    <div
                      key={addr.id}
                      className={`checkout-address-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedAddressId(addr.id)}
                    >
                      <input
                        type="radio"
                        id={`addr-${addr.id}`}
                        name="shippingAddress"
                        className="address-radio"
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addr.id)}
                      />
                      <div className="address-content-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#000000' }}>{addr.fullName}</span>
                          <span style={{ color: '#71717a', fontSize: '0.875rem' }}>|</span>
                          <span style={{ color: '#27272a', fontWeight: 600, fontSize: '0.875rem' }}>{addr.phone}</span>
                          
                          {addr.isDefault && (
                            <span style={{ background: '#000000', color: '#ffffff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                              Mặc định
                            </span>
                          )}

                          <span style={{ background: '#f4f4f5', color: '#52525b', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {addr.type === 'office' ? <Briefcase size={10} /> : <Home size={10} />}
                            {addr.type === 'office' ? 'Văn phòng' : 'Nhà riêng'}
                          </span>
                        </div>
                        <p style={{ color: '#3f3f46', fontSize: '0.875rem', lineHeight: '1.4', margin: 0 }}>
                          {addr.detailAddress}, {addr.city}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* PHẦN 2: PHƯƠNG THỨC THANH TOÁN */}
          <section className="checkout-section-box">
            <div className="checkout-section-title">
              <div className="checkout-section-title-left">
                <CreditCard size={20} />
                <span>2. Chọn phương thức thanh toán</span>
              </div>
            </div>

            <div className="payment-methods-grid">
              <div
                className={`payment-method-card ${paymentMethod === 'COD' ? 'is-selected' : ''}`}
                onClick={() => setPaymentMethod('COD')}
              >
                <input
                  type="radio"
                  id="pay-cod"
                  name="paymentMethod"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  style={{ accentColor: '#000', cursor: 'pointer' }}
                />
                <Truck size={20} color="#000000" />
                <div>
                  <div style={{ fontWeight: 700, color: '#000000' }}>Thanh toán khi nhận hàng (COD)</div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 400 }}>Kiểm tra hàng rồi thanh toán tiền mặt</div>
                </div>
              </div>

              <div
                className={`payment-method-card ${paymentMethod === 'BANK' ? 'is-selected' : ''}`}
                onClick={() => setPaymentMethod('BANK')}
              >
                <input
                  type="radio"
                  id="pay-bank"
                  name="paymentMethod"
                  checked={paymentMethod === 'BANK'}
                  onChange={() => setPaymentMethod('BANK')}
                  style={{ accentColor: '#000', cursor: 'pointer' }}
                />
                <CreditCard size={20} color="#000000" />
                <div>
                  <div style={{ fontWeight: 700, color: '#000000' }}>Chuyển khoản QR Ngân hàng</div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 400 }}>Quét mã VietQR 24/7 tự động xác nhận</div>
                </div>
              </div>
            </div>

            {/* Ghi chú đơn hàng */}
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#27272a', marginBottom: '0.35rem' }}>
                Ghi chú cho shipper / Cyber (Tùy chọn)
              </label>
              <textarea
                className="form-input"
                rows="2"
                placeholder="VD: Giao giờ hành chính, gọi điện trước khi tới..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                style={{ resize: 'none', fontSize: '0.85rem' }}
              />
            </div>
          </section>
        </div>

        {/* ================= CỘT PHẢI: TÓM TẮT ĐƠN HÀNG & MÃ GIẢM GIÁ ================= */}
        <aside className="checkout-summary-sidebar">
          <div className="checkout-summary-box">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', color: '#000' }}>
              Đơn hàng của bạn ({itemsToCheckout.reduce((acc, i) => acc + i.quantity, 0)} món)
            </h3>

            {/* Danh sách món hàng */}
            <div className="summary-items-list">
              {itemsToCheckout.map((item) => (
                <div key={item.id} className="summary-item-row">
                  <img src={item.image} alt={item.name} className="summary-item-img" />
                  <div className="summary-item-details">
                    <div className="summary-item-name" title={item.name}>{item.name}</div>
                    <div className="summary-item-qty">
                      {item.selectedColor && <span>{item.selectedColor} • </span>}
                      {item.selectedStorage && <span>{item.selectedStorage} • </span>}
                      Số lượng: {item.quantity}
                    </div>
                  </div>
                  <div className="summary-item-price">
                    {formatVND((item.price || 0) * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* VOUCHER / MÃ GIẢM GIÁ */}
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.65rem' }}>
                <Tag size={16} /> Mã giảm giá Cyber
              </div>

              {appliedVoucher ? (
                <div className="voucher-applied-pill">
                  <div>
                    <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>{appliedVoucher.code}</span>
                    <span style={{ marginLeft: '6px', fontSize: '0.75rem' }}>- {appliedVoucher.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Bỏ mã giảm giá"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="voucher-input-wrapper">
                    <input
                      type="text"
                      className="voucher-input"
                      placeholder="NHẬP MÃ VOUCHER"
                      value={voucherCodeInput}
                      onChange={(e) => setVoucherCodeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                    />
                    <button
                      type="button"
                      className="voucher-apply-btn"
                      onClick={() => handleApplyVoucher()}
                    >
                      Áp dụng
                    </button>
                  </div>

                  {voucherError && (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> {voucherError}
                    </div>
                  )}

                  {voucherSuccess && (
                    <div style={{ color: '#059669', fontSize: '0.75rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> {voucherSuccess}
                    </div>
                  )}

                  {/* Danh sách voucher gợi ý sẵn */}
                  <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: '0.4rem', fontWeight: 500 }}>
                    Mã ưu đãi có sẵn:
                  </div>
                  <div className="quick-vouchers-list">
                    {AVAILABLE_VOUCHERS.map((v) => (
                      <button
                        key={v.code}
                        type="button"
                        className="voucher-chip-btn"
                        onClick={() => handleApplyVoucher(v.code)}
                        title={v.description}
                      >
                        {v.code} ({v.type === 'percent' ? `-${v.value}%` : v.type === 'shipping' ? 'Freeship' : `-${formatVND(v.value)}`})
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* TÍNH TOÁN TIỀN */}
            <div className="summary-calc-list">
              <div className="calc-row">
                <span>Tạm tính hàng hóa:</span>
                <span style={{ fontWeight: 600, color: '#000' }}>{formatVND(subtotalToCheckout)}</span>
              </div>
              <div className="calc-row">
                <span>Phí vận chuyển:</span>
                <span>{finalShippingFee === 0 ? <strong style={{ color: '#059669' }}>Miễn phí</strong> : formatVND(finalShippingFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="calc-row discount">
                  <span>Giảm giá Voucher ({appliedVoucher?.code}):</span>
                  <span>-{formatVND(discountAmount)}</span>
                </div>
              )}
              <div className="calc-row total">
                <span>Tổng cộng:</span>
                <span>{formatVND(finalTotal)}</span>
              </div>
            </div>

            {/* NÚT XÁC NHẬN ĐẶT HÀNG */}
            <button
              type="button"
              className="checkout-submit-btn"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || addresses.length === 0}
            >
              {isSubmitting ? 'Đang tạo đơn hàng...' : (
                <>
                  <span>Xác nhận đặt hàng</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '1rem', color: '#71717a', fontSize: '0.75rem' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Bảo mật thông tin & Đổi trả dễ dàng trong 15 ngày</span>
            </div>
          </div>
        </aside>
      </div>

      {/* MODEL BOX: XÁC NHẬN TẠO ĐƠN HÀNG */}
      <ConfirmModal
        isOpen={showConfirmOrderModal}
        onClose={() => setShowConfirmOrderModal(false)}
        type="confirm"
        title="Xác nhận đặt hàng"
        confirmText="Đồng ý đặt hàng"
        cancelText="Kiểm tra lại"
        onConfirm={handleExecutePlaceOrder}
      >
        {selectedAddr && (
          <div style={{ background: '#f9f9fa', padding: '14px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.875rem' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#71717a', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>GIAO ĐẾN ĐỊA CHỈ:</span>
              <strong style={{ color: '#000' }}>{selectedAddr.fullName}</strong> ({selectedAddr.phone})
              <div style={{ color: '#3f3f46', fontSize: '0.8rem', marginTop: '2px' }}>
                {selectedAddr.detailAddress}, {selectedAddr.city}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #e4e4e7', paddingTop: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#71717a', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>PHƯƠNG THỨC:</span>
              <span style={{ color: '#000', fontWeight: 600 }}>
                {paymentMethod === 'COD' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản QR Ngân hàng'}
              </span>
            </div>

            {appliedVoucher && (
              <div style={{ borderTop: '1px dashed #e4e4e7', paddingTop: '8px', marginBottom: '8px', color: '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
                Voucher áp dụng: {appliedVoucher.code} (-{formatVND(discountAmount)})
              </div>
            )}

            <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: '#000' }}>Tổng thanh toán:</span>
              <strong style={{ color: '#000', fontSize: '1.25rem' }}>{formatVND(finalTotal)}</strong>
            </div>
          </div>
        )}
      </ConfirmModal>

      {/* MODEL BOX: THÔNG BÁO CHƯA CHỌN ĐỊA CHỈ */}
      <ConfirmModal
        isOpen={showMissingAddressModal}
        onClose={() => setShowMissingAddressModal(false)}
        type="info"
        title="Chưa chọn địa chỉ nhận hàng"
        message="Vui lòng chọn 1 địa chỉ nhận hàng hoặc bấm 'Thêm địa chỉ mới' trước khi xác nhận đặt hàng."
        confirmText="Đã hiểu"
        showCancel={false}
        onConfirm={() => setShowMissingAddressModal(false)}
      />
    </div>
  );
};
