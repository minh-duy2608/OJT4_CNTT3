import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  ChevronRight,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { formatVND } from '../data/products';
import { validatePhone } from '../utils/validation';
import { ConfirmModal } from '../components/ConfirmModal';
import { PayOSPaymentModal } from '../components/PayOSPaymentModal';
import { couponApi } from '../services/couponApi';
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
  const location = useLocation();

  // Kiểm tra xem đây có phải luồng Mua ngay (Buy Now trực tiếp) hay không
  const [buyNowItem] = useState(() => {
    if (location.state?.fromCart) return null;
    if (location.state?.buyNowItem) {
      return location.state.buyNowItem;
    }
    try {
      const saved = sessionStorage.getItem('CYBER_BUY_NOW_ITEM');
      if (saved && !sessionStorage.getItem('CYBER_FROM_CART')) {
        return JSON.parse(saved);
      }
    } catch { }
    return null;
  });

  const isBuyNowMode = Boolean(buyNowItem);

  // Lưu snapshot sản phẩm và tổng tiền thanh toán để không bị reset khi giỏ hàng được clear sau khi tạo đơn
  const [checkoutSessionItems, setCheckoutSessionItems] = useState(() => {
    if (isBuyNowMode) return [buyNowItem];
    return selectedItems && selectedItems.length > 0 ? selectedItems : [];
  });
  const [checkoutSessionSubtotal, setCheckoutSessionSubtotal] = useState(() => {
    if (isBuyNowMode) return Number(buyNowItem?.price || 0) * Number(buyNowItem?.quantity || 1);
    return selectedTotal;
  });

  // Chỉ đồng bộ lại nếu chưa tạo đơn và chưa mở modal thanh toán PayOS
  useEffect(() => {
    if (!payOSModalOpen && !activePayOSOrderId && !isBuyNowMode) {
      if (selectedItems && selectedItems.length > 0) {
        setCheckoutSessionItems(selectedItems);
        setCheckoutSessionSubtotal(selectedTotal);
      }
    }
  }, [selectedItems, selectedTotal, payOSModalOpen, activePayOSOrderId, isBuyNowMode]);

  // PHÂN BIỆT RÕ RÀNG:
  // - Nếu Mua ngay từ trang chi tiết: CHỈ thanh toán DUY NHẤT 1 sản phẩm buyNowItem, KHÔNG ảnh hưởng giỏ hàng
  // - Nếu từ Giỏ hàng: Chỉ thanh toán các sản phẩm ĐƯỢC CHỌN (selectedItems)
  const itemsToCheckout = isBuyNowMode
    ? [buyNowItem]
    : (checkoutSessionItems.length > 0 ? checkoutSessionItems : selectedItems);

  const subtotalToCheckout = isBuyNowMode
    ? Number(buyNowItem.price || 0) * Number(buyNowItem.quantity || 1)
    : (checkoutSessionSubtotal > 0 ? checkoutSessionSubtotal : selectedTotal);

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

  // Phương thức thanh toán: COD hoặc PAYOS (VietQR)
  const [paymentMethod, setPaymentMethod] = useState('PAYOS');
  const [payOSModalOpen, setPayOSModalOpen] = useState(false);
  const [activePayOSOrderId, setActivePayOSOrderId] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // Tự động nhận diện Shop ID từ các sản phẩm đang được thanh toán
  const detectedShopId = useMemo(() => {
    for (const item of itemsToCheckout) {
      if (item.shopId) return Number(item.shopId);
      if (item.shop?.id) return Number(item.shop.id);
      if (item.product?.shopId) return Number(item.product.shopId);
    }
    return null;
  }, [itemsToCheckout]);

  // Voucher / Mã giảm giá thực tế từ hệ thống
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Tải danh sách mã ưu đãi có sẵn thực tế từ Backend (Shop, Storefront, Ví cá nhân)
  useEffect(() => {
    let isMounted = true;
    const fetchRealCoupons = async () => {
      setLoadingCoupons(true);
      try {
        const promises = [];
        if (detectedShopId) {
          promises.push(couponApi.getShopCoupons(detectedShopId));
        } else {
          promises.push(couponApi.getStorefrontCoupons());
        }
        if (isAuthenticated) {
          promises.push(couponApi.getUserWalletCoupons());
        }

        const results = await Promise.allSettled(promises);
        const allFetched = [];
        results.forEach((res) => {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            allFetched.push(...res.value);
          }
        });

        // Hợp nhất và loại bỏ trùng lặp theo coupon code
        const couponMap = new Map();
        allFetched.forEach((c) => {
          if (!c || !c.code) return;
          const key = c.code.trim().toUpperCase();
          if (!couponMap.has(key)) {
            couponMap.set(key, c);
          } else {
            const existing = couponMap.get(key);
            couponMap.set(key, { ...existing, ...c, isSaved: existing.isSaved || c.isSaved });
          }
        });

        const currentProductIds = itemsToCheckout.map((it) => {
          const rawId = it.productId || it.product?.id || (typeof it.id === 'string' && it.id.includes('-') ? it.id.split('-')[0] : it.id);
          return Number(rawId);
        }).filter(Boolean);

        const now = new Date();
        const activeRealCoupons = Array.from(couponMap.values()).filter((c) => {
          // Phải có trạng thái ACTIVE
          if (c.status && c.status !== 'ACTIVE') return false;
          // Kiểm tra thời gian bắt đầu
          if (c.startAt && new Date(c.startAt) > now) return false;
          // Kiểm tra thời gian kết thúc
          if (c.endAt && new Date(c.endAt) < now) return false;
          // Kiểm tra giới hạn số lượt sử dụng chung
          if (c.usageLimit !== null && c.usageLimit !== undefined && c.usageCount !== null && c.usageCount !== undefined && c.usageCount >= c.usageLimit) {
            return false;
          }
          // Kiểm tra số lượt sử dụng của chính user này
          if (c.perUserLimit !== null && c.perUserLimit !== undefined && c.userUsageCount !== null && c.userUsageCount !== undefined && c.userUsageCount >= c.perUserLimit) {
            return false;
          }
          // Nếu coupon quy định cho 1 shop cụ thể và đơn hàng thuộc 1 shop khác
          if (c.shopId && detectedShopId && Number(c.shopId) !== Number(detectedShopId)) {
            return false;
          }

          // Nghiệp vụ cốt lõi: Khi mua sản phẩm chỉ render ra những mã giảm giá thuộc về sản phẩm đó (sản phẩm có thể add mã đó)
          const isSpecific = c.applicableToAllProducts === false || (Array.isArray(c.productIds) && c.productIds.length > 0);
          if (isSpecific) {
            const applicableProductIds = Array.isArray(c.productIds) ? c.productIds.map(Number) : [];
            if (applicableProductIds.length === 0) {
              return false; // Mã chỉ định cụ thể nhưng không có sản phẩm nào hợp lệ -> không render
            }
            const hasMatchingProduct = currentProductIds.some((pid) => applicableProductIds.includes(pid));
            if (!hasMatchingProduct) {
              return false; // Không có sản phẩm nào trong giỏ thanh toán khớp với mã này -> không render
            }
          }

          return true;
        });

        if (isMounted) {
          setAvailableCoupons(activeRealCoupons);
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách mã giảm giá có sẵn:', err);
        if (isMounted) {
          setAvailableCoupons([]);
        }
      } finally {
        if (isMounted) {
          setLoadingCoupons(false);
        }
      }
    };

    fetchRealCoupons();

    return () => {
      isMounted = false;
    };
  }, [detectedShopId, isAuthenticated]);

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
    if (appliedVoucher.discountAmount !== undefined) {
      discountAmount = Number(appliedVoucher.discountAmount);
    } else if (appliedVoucher.type === 'percent' || appliedVoucher.type === 'PERCENTAGE') {
      discountAmount = Math.min((subtotalToCheckout * appliedVoucher.value) / 100, appliedVoucher.maxDiscount || Infinity);
    } else if (appliedVoucher.type === 'fixed' || appliedVoucher.type === 'FIXED_AMOUNT') {
      discountAmount = appliedVoucher.value;
    } else if (appliedVoucher.type === 'shipping') {
      discountAmount = Math.min(finalShippingFee, appliedVoucher.value);
      finalShippingFee = Math.max(0, finalShippingFee - discountAmount);
    }
  }

  // Tổng thanh toán cuối cùng
  const finalTotal = Math.max(0, subtotalToCheckout + finalShippingFee - (appliedVoucher?.type === 'shipping' ? 0 : discountAmount));

  // Hạn mức giao dịch chuẩn sàn Thương mại Điện tử
  const MAX_ONLINE_ORDER_AMOUNT = 500000000; // 500.000.000₫ (500 triệu)
  const MAX_COD_AMOUNT = 20000000; // 20.000.000₫ (20 triệu)

  // Tự động chuyển phương thức nếu vượt quá hạn mức thanh toán tiền mặt (COD)
  useEffect(() => {
    if (finalTotal > MAX_COD_AMOUNT && paymentMethod === 'COD') {
      setPaymentMethod('PAYOS');
    }
  }, [finalTotal, paymentMethod]);

  // Xử lý áp dụng Voucher thực tế qua API Backend (STT 90: POST /coupons/validate)
  const handleApplyVoucher = async (codeToApply) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    setVoucherError('');
    setVoucherSuccess('');

    if (!code) {
      setVoucherError('Vui lòng nhập mã giảm giá.');
      return;
    }

    try {
      const itemsPayload = itemsToCheckout.map((it) => ({
        productId: it.productId || (typeof it.id === 'string' ? parseInt(it.id.split('-')[0], 10) : it.id),
        variantId: it.variantId || (typeof it.id === 'number' ? it.id : null),
        quantity: it.quantity || 1
      }));

      const res = await couponApi.validateCoupon({
        code,
        shopId: detectedShopId || undefined,
        items: itemsPayload
      });

      if (res && res.valid) {
        const discountVal = Number(res.discountAmount || 0);
        const resolvedCode = res.code || res.couponCode || code;
        setAppliedVoucher({
          code: resolvedCode,
          couponId: res.couponId,
          type: 'fixed',
          value: discountVal,
          discountAmount: discountVal,
          title: res.name ? `${res.name} (-${formatVND(discountVal)})` : `Giảm giá mã ${resolvedCode}`
        });
        setVoucherCodeInput(resolvedCode);
        setVoucherSuccess(res.message || `Đã áp dụng mã giảm giá ${resolvedCode} (-${formatVND(discountVal)})`);
        return;
      } else {
        setVoucherError(res?.message || 'Mã giảm giá không hợp lệ hoặc đơn hàng chưa đủ điều kiện.');
        setAppliedVoucher(null);
        return;
      }
    } catch (err) {
      setVoucherError(err.message || 'Mã giảm giá không tồn tại hoặc đã hết hạn.');
      setAppliedVoucher(null);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setVoucherSuccess('');
    setVoucherError('');
  };

  // Lưu địa chỉ mới nhanh
  const handleQuickSaveAddress = async (e) => {
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

    try {
      const newAddr = await addAddress({
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
    } catch (err) {
      showToast(err.message || 'Lỗi thêm địa chỉ.', 'error');
    }
  };

  // Mở Model Box xác nhận đặt hàng
  const hasOutOfStockItems = itemsToCheckout.some((it) => it.inStock === false || (it.availableQuantity !== undefined && it.availableQuantity <= 0));

  const handlePlaceOrder = () => {
    if (itemsToCheckout.length === 0) {
      showToast('Chưa có sản phẩm nào được chọn để thanh toán!', 'warning');
      return;
    }

    const outOfStockItem = itemsToCheckout.find((it) => it.inStock === false || (it.availableQuantity !== undefined && it.availableQuantity <= 0));
    if (outOfStockItem) {
      showToast(`Sản phẩm "${outOfStockItem.name}" hiện đã hết hàng trong kho! Không thể đặt hàng.`, 'error');
      return;
    }

    if (finalTotal > MAX_ONLINE_ORDER_AMOUNT) {
      showToast(`Đơn hàng (${formatVND(finalTotal)}) vượt quá hạn mức tối đa cho phép mua trực tuyến (${formatVND(MAX_ONLINE_ORDER_AMOUNT)}). Quý khách vui lòng chia nhỏ đơn hàng hoặc liên hệ Hotline 1900 6868 để được hỗ trợ mua số lượng lớn/doanh nghiệp!`, 'warning');
      return;
    }

    if (paymentMethod === 'COD' && finalTotal > MAX_COD_AMOUNT) {
      showToast(`Phương thức COD chỉ áp dụng cho đơn hàng dưới ${formatVND(MAX_COD_AMOUNT)}. Quý khách vui lòng chọn Thanh toán trực tuyến PayOS qua VietQR!`, 'warning');
      setPaymentMethod('PAYOS');
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
  const handleExecutePlaceOrder = async () => {
    setShowConfirmOrderModal(false);
    const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddr) return;

    const outOfStockItem = itemsToCheckout.find((it) => it.inStock === false || (it.availableQuantity !== undefined && it.availableQuantity <= 0));
    if (outOfStockItem) {
      showToast(`Sản phẩm "${outOfStockItem.name}" hiện đã hết hàng trong kho! Không thể đặt hàng.`, 'error');
      return;
    }

    setIsSubmitting(true);
    setCheckoutError('');

    try {
      const detectedShopId = itemsToCheckout[0]?.shopId || null;
      const orderPayload = {
        shopId: detectedShopId,
        shippingAddress: selectedAddr,
        items: itemsToCheckout.map((item) => ({
          id: item.id,
          variantId: item.variantId || (typeof item.id === 'number' ? item.id : null),
          productId: item.productId || (typeof item.id === 'string' ? parseInt(item.id.split('-')[0], 10) : item.id),
          shopId: item.shopId || null,
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
        paymentMethod: paymentMethod === 'COD' ? 'COD (Thanh toán khi nhận hàng)' : 'PAYOS (Thanh toán trực tuyến VietQR)',
        notes: orderNotes.trim()
      };

      const newOrder = await createOrder(orderPayload);

      if (isBuyNowMode) {
        // Luồng Mua ngay: chỉ dọn session mua ngay, TUYỆT ĐỐI KHÔNG XÓA GIỎ HÀNG
        try {
          sessionStorage.removeItem('CYBER_BUY_NOW_ITEM');
        } catch { }
      } else {
        // Luồng Giỏ hàng: chỉ xóa các sản phẩm ĐÃ ĐƯỢC CHỌN trong giỏ
        clearSelectedFromCart();
        try {
          sessionStorage.removeItem('CYBER_FROM_CART');
        } catch { }
      }

      const payOSOrderId = newOrder?.backendId || newOrder?.orderId || (typeof newOrder?.id === 'number' ? newOrder.id : null);
      const isPayOS = paymentMethod === 'PAYOS' || String(paymentMethod).toUpperCase().includes('PAYOS') || String(paymentMethod).toUpperCase().includes('VIETQR');

      if (isPayOS && payOSOrderId) {
        setActivePayOSOrderId(payOSOrderId);
        setPayOSModalOpen(true);
        return;
      }

      showToast('Đặt hàng thành công! Đơn hàng được tạm giữ tồn kho trong 15 phút.', 'success');
      navigate('/orders');
    } catch (err) {
      const errMsg = err.message || 'Lỗi đặt hàng';
      setCheckoutError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (itemsToCheckout.length === 0 && !payOSModalOpen && !activePayOSOrderId) {
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
        {isBuyNowMode ? (
          <Link
            to={buyNowItem?.productId ? `/products/${buyNowItem.productId}` : '/products'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#71717a', marginBottom: '0.75rem', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} /> Quay lại trang sản phẩm
          </Link>
        ) : (
          <Link
            to="/cart"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#71717a', marginBottom: '0.75rem', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} /> Quay lại giỏ hàng
          </Link>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 className="checkout-page-title" style={{ margin: 0 }}>Xác nhận đơn hàng</h1>
          {isBuyNowMode ? (
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78125rem', fontWeight: 600 }}>
              ⚡ Mua ngay trực tiếp (1 sản phẩm)
            </span>
          ) : (
            <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78125rem', fontWeight: 600 }}>
              🛒 Thanh toán từ giỏ ({itemsToCheckout.length} sản phẩm đã chọn)
            </span>
          )}
        </div>

        <p className="checkout-page-subtitle" style={{ marginTop: '0.5rem' }}>
          {isBuyNowMode
            ? 'Bạn đang thực hiện thanh toán trực tiếp cho sản phẩm vừa bấm Mua ngay. Giỏ hàng hiện có của bạn vẫn được giữ nguyên an toàn.'
            : 'Vui lòng kiểm tra kỹ địa chỉ nhận hàng, phương thức thanh toán và áp dụng voucher ưu đãi trước khi đặt hàng.'}
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
                className={`payment-method-card ${paymentMethod === 'PAYOS' ? 'is-selected' : ''}`}
                onClick={() => setPaymentMethod('PAYOS')}
              >
                <input
                  type="radio"
                  id="pay-payos"
                  name="paymentMethod"
                  checked={paymentMethod === 'PAYOS'}
                  onChange={() => setPaymentMethod('PAYOS')}
                  style={{ accentColor: '#000', cursor: 'pointer' }}
                />
                <CreditCard size={20} color="#000000" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#000000', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Thanh toán trực tuyến PayOS (VietQR)</span>
                    <span style={{ fontSize: '0.68rem', color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                      ⚡ Xác nhận tự động 24/7
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 400, marginTop: '2px' }}>
                    Quét mã QR bằng 40+ app ngân hàng & ví điện tử (MB, VCB, Techcombank, MoMo...)
                  </div>
                </div>
              </div>

              <div
                className={`payment-method-card ${paymentMethod === 'COD' ? 'is-selected' : ''}`}
                onClick={() => {
                  if (finalTotal > MAX_COD_AMOUNT) {
                    showToast(`Phương thức COD chỉ áp dụng cho đơn hàng dưới ${formatVND(MAX_COD_AMOUNT)}. Đơn hàng giá trị cao vui lòng chọn Thanh toán PayOS VietQR!`, 'warning');
                    return;
                  }
                  setPaymentMethod('COD');
                }}
                style={finalTotal > MAX_COD_AMOUNT ? { opacity: 0.6, cursor: 'not-allowed', background: '#f8fafc' } : {}}
              >
                <input
                  type="radio"
                  id="pay-cod"
                  name="paymentMethod"
                  disabled={finalTotal > MAX_COD_AMOUNT}
                  checked={paymentMethod === 'COD'}
                  onChange={() => {
                    if (finalTotal <= MAX_COD_AMOUNT) {
                      setPaymentMethod('COD');
                    }
                  }}
                  style={{ accentColor: '#000', cursor: finalTotal > MAX_COD_AMOUNT ? 'not-allowed' : 'pointer' }}
                />
                <Truck size={20} color={finalTotal > MAX_COD_AMOUNT ? '#94a3b8' : '#000000'} />
                <div>
                  <div style={{ fontWeight: 700, color: finalTotal > MAX_COD_AMOUNT ? '#64748b' : '#000000', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Thanh toán khi nhận hàng (COD)</span>
                    {finalTotal > MAX_COD_AMOUNT && (
                      <span style={{ fontSize: '0.68rem', color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        Tối đa 20tr
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 400 }}>
                    {finalTotal > MAX_COD_AMOUNT 
                      ? `Chỉ áp dụng cho đơn dưới ${formatVND(MAX_COD_AMOUNT)}`
                      : 'Kiểm tra hàng rồi thanh toán tiền mặt'}
                  </div>
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
              {itemsToCheckout.map((item) => {
                const isOutOfStock = item.inStock === false || (item.availableQuantity !== undefined && item.availableQuantity <= 0);
                return (
                  <div key={item.id} className="summary-item-row" style={isOutOfStock ? { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px' } : {}}>
                    <img src={item.image} alt={item.name} className="summary-item-img" />
                    <div className="summary-item-details">
                      <div className="summary-item-name" title={item.name}>
                        {item.name}
                        {isOutOfStock && (
                          <span style={{ marginLeft: '6px', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700, background: '#fee2e2', padding: '1px 6px', borderRadius: '4px', display: 'inline-block' }}>
                            Hết hàng
                          </span>
                        )}
                      </div>
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
                );
              })}
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

                  {/* Danh sách voucher gợi ý sẵn có thực tế từ hệ thống */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Tag size={13} color="#2563eb" /> Mã ưu đãi có sẵn:
                    </div>
                    {loadingCoupons && (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Đang tải...</span>
                    )}
                  </div>

                  {loadingCoupons ? (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '1rem' }}>
                      Đang kiểm tra mã giảm giá thực tế...
                    </div>
                  ) : availableCoupons.length === 0 ? (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#94a3b8',
                      backgroundColor: '#f8fafc',
                      border: '1px dashed #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      marginBottom: '1rem',
                      textAlign: 'center'
                    }}>
                      Không có mã ưu đãi nào có sẵn cho đơn hàng này.
                    </div>
                  ) : (
                    <div className="quick-vouchers-list">
                      {availableCoupons.map((c) => {
                        const minOrder = Number(c.minOrderAmount || 0);
                        const isEligible = subtotalToCheckout >= minOrder;
                        const isSelected = appliedVoucher?.code === c.code;

                        let discountBadge = '';
                        if (c.discountType === 'PERCENTAGE' || c.discountType === 'percent') {
                          discountBadge = `-${c.discountValue}%`;
                          if (c.maxDiscountAmount) {
                            discountBadge += ` (tối đa ${formatVND(c.maxDiscountAmount)})`;
                          }
                        } else {
                          discountBadge = `-${formatVND(c.discountValue)}`;
                        }

                        return (
                          <button
                            key={c.id || c.code}
                            type="button"
                            disabled={!isEligible}
                            className={`voucher-card-item ${isSelected ? 'is-selected' : ''} ${!isEligible ? 'is-disabled' : 'is-eligible'}`}
                            onClick={() => {
                              if (!isEligible) return;
                              if (isSelected) {
                                handleRemoveVoucher();
                              } else {
                                handleApplyVoucher(c.code);
                              }
                            }}
                            title={!isEligible ? `Cần đơn hàng tối thiểu ${formatVND(minOrder)} để áp dụng mã này` : (c.description || c.name || `Mã ${c.code}`)}
                          >
                            <div className="voucher-card-info">
                              <div className="voucher-card-header">
                                <span className="voucher-code-text">{c.code}</span>
                                <span className="voucher-badge-text">{discountBadge}</span>
                                {c.shopName && (
                                  <span className="voucher-shop-tag">{c.shopName}</span>
                                )}
                              </div>
                              <div className={`voucher-min-text ${!isEligible ? 'is-not-met' : ''}`}>
                                {minOrder > 0 ? `Đơn tối thiểu ${formatVND(minOrder)}` : 'Áp dụng cho mọi giá trị đơn'}
                                {!isEligible && ` (Thiếu ${formatVND(minOrder - subtotalToCheckout)})`}
                              </div>
                            </div>

                            <div className="voucher-card-action">
                              {isSelected ? (
                                <span className="voucher-applied-tag">
                                  <Check size={13} /> Đã chọn
                                </span>
                              ) : isEligible ? (
                                <span className="voucher-apply-tag">
                                  Áp dụng
                                </span>
                              ) : (
                                <span className="voucher-ineligible-tag">
                                  Chưa đủ ĐK
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
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

            {hasOutOfStockItems && (
              <div style={{ color: '#dc2626', background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>Trong đơn có sản phẩm đã hết hàng trong kho. Vui lòng quay lại giỏ hàng để bỏ chọn trước khi đặt hàng!</span>
              </div>
            )}

            {finalTotal > MAX_ONLINE_ORDER_AMOUNT && (
              <div style={{
                color: '#b45309',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                lineHeight: '1.5',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
                <div>
                  <strong style={{ color: '#92400e', display: 'block', marginBottom: '2px' }}>
                    Vượt hạn mức đặt hàng trực tuyến:
                  </strong>
                  <div>
                    Đơn hàng có tổng thanh toán (<strong>{formatVND(finalTotal)}</strong>) vượt quá hạn mức tối đa cho phép mua trực tuyến (<strong>{formatVND(MAX_ONLINE_ORDER_AMOUNT)}</strong>).
                  </div>
                  <div style={{ marginTop: '4px', color: '#78350f' }}>
                    Quý khách vui lòng chia nhỏ đơn hàng hoặc liên hệ Hotline <strong>1900 6868</strong> để được hỗ trợ báo giá và ký hợp đồng thương mại (B2B).
                  </div>
                </div>
              </div>
            )}

            {checkoutError && (
              <div style={{
                color: '#991b1b',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '0.825rem',
                lineHeight: '1.5',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px', color: '#7f1d1d' }}>
                    Không thể hoàn tất đặt hàng:
                  </strong>
                  <div>{checkoutError}</div>
                  {(checkoutError.includes('giỏ hàng') || checkoutError.includes('kho') || checkoutError.includes('khả dụng')) && (
                    <div style={{ marginTop: '6px' }}>
                      <Link to="/cart" style={{ color: '#dc2626', fontWeight: 700, textDecoration: 'underline' }}>
                        → Nhấn vào đây để quay lại giỏ hàng và điều chỉnh số lượng
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Thông báo cơ chế giữ hàng */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '14px',
              fontSize: '0.775rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Clock size={16} style={{ flexShrink: 0, color: '#2563eb' }} />
              <span>
                <strong>Cơ chế giữ hàng:</strong> Đơn hàng sẽ được tạm giữ tồn kho 15 phút để quý khách thanh toán.
              </span>
            </div>

            {/* NÚT XÁC NHẬN ĐẶT HÀNG */}
            <button
              type="button"
              className="checkout-submit-btn"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || addresses.length === 0 || hasOutOfStockItems || finalTotal > MAX_ONLINE_ORDER_AMOUNT}
              style={(hasOutOfStockItems || finalTotal > MAX_ONLINE_ORDER_AMOUNT) ? { opacity: 0.5, cursor: 'not-allowed', background: '#9ca3af' } : {}}
              title={finalTotal > MAX_ONLINE_ORDER_AMOUNT ? `Đơn hàng vượt hạn mức tối đa ${formatVND(MAX_ONLINE_ORDER_AMOUNT)}` : ''}
            >
              {isSubmitting ? 'Đang tạo đơn hàng...' : (
                <>
                  <span>{finalTotal > MAX_ONLINE_ORDER_AMOUNT ? 'Đơn hàng vượt hạn mức trực tuyến' : 'Xác nhận đặt hàng'}</span>
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
                {paymentMethod === 'COD' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : 'Thanh toán trực tuyến PayOS (VietQR)'}
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

      {/* MODAL THANH TOÁN PAYOS VIETQR 15 PHÚT VỚI ANIMATION DẤU TÍCH THÀNH CÔNG */}
      <PayOSPaymentModal
        isOpen={payOSModalOpen}
        orderId={activePayOSOrderId}
        onClose={() => {
          setPayOSModalOpen(false);
          navigate('/orders');
        }}
        onPaymentSuccess={() => {
          setPayOSModalOpen(false);
          showToast('Thanh toán PayOS thành công! Cửa hàng đã xác nhận đơn hàng.', 'success');
          navigate('/orders');
        }}
      />
    </div>
  );
};
