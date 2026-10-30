import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatVND } from '../data/products';
import { Trash2, ShoppingBag, ArrowRight, Lock, CreditCard } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const CartPage = () => {
  const { 
    cartItems, 
    cartCount, 
    cartTotal, 
    removeFromCart, 
    updateQuantity, 
    clearCart,
    selectedItemIds,
    selectedItems,
    selectedCount,
    selectedTotal,
    isAllSelected,
    toggleSelectItem,
    selectAllItems,
    deselectAllItems
  } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Đảm bảo xóa session Mua ngay khi người dùng vào xem giỏ hàng
  useEffect(() => {
    try {
      sessionStorage.removeItem('CYBER_BUY_NOW_ITEM');
    } catch {}
  }, []);

  // Các trạng thái Model Box xác nhận
  const [showCheckoutConfirmModal, setShowCheckoutConfirmModal] = useState(false);
  const [showClearCartConfirmModal, setShowClearCartConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  if (!isAuthenticated) {
    return (
      <section className="cart-page" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '2.5rem 1.5rem' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#fffbeb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Lock size={28} color="#f59e0b" />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Bạn chưa đăng nhập</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Vui lòng đăng nhập để xem các mặt hàng đã chọn và thực hiện đặt hàng thanh toán.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/auth?mode=login" className="btn">
              Đăng nhập ngay
            </Link>
            <Link to="/auth?mode=register" className="btn" style={{ backgroundColor: '#191c1a' }}>
              Đăng ký tài khoản
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container cart-page" style={{ padding: '3rem 0 5rem' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 800 }}>
          Giỏ hàng của {user.name}
        </h1>
        <p style={{ color: '#71717a' }}>Bạn đang có {cartCount} sản phẩm trong giỏ hàng.</p>
      </header>

      {cartItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <ShoppingBag size={48} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Giỏ hàng đang trống</h3>
          <p style={{ margin: '0.5rem 0 1.5rem', color: '#64748b' }}>
            Hãy dạo quanh cửa hàng và chọn những thiết bị công nghệ yêu thích nhé.
          </p>
          <Link to="/products" className="btn">
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.875rem' }}>
                  <th style={{ paddingBottom: '0.75rem', width: '44px', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => {
                        if (e.target.checked) selectAllItems();
                        else deselectAllItems();
                      }}
                      style={{ width: '18px', height: '18px', accentColor: '#000000', cursor: 'pointer', verticalAlign: 'middle' }}
                      title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    />
                  </th>
                  <th style={{ paddingBottom: '0.75rem' }}>
                    <span 
                      style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 700, color: '#18181b' }}
                      onClick={() => isAllSelected ? deselectAllItems() : selectAllItems()}
                    >
                      Sản phẩm ({selectedCount}/{cartCount} đã chọn)
                    </span>
                  </th>
                  <th style={{ paddingBottom: '0.75rem' }}>Đơn giá</th>
                  <th style={{ paddingBottom: '0.75rem' }}>Số lượng</th>
                  <th style={{ paddingBottom: '0.75rem' }}>Tạm tính</th>
                  <th style={{ paddingBottom: '0.75rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.015)' : 'transparent',
                        opacity: isSelected ? 1 : 0.6,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '1.25rem 0', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          style={{ width: '18px', height: '18px', accentColor: '#000000', cursor: 'pointer', verticalAlign: 'middle' }}
                          aria-label={`Chọn sản phẩm ${item.name} để thanh toán`}
                        />
                      </td>
                      <td style={{ padding: '1.25rem 0', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
                            />
                          )}
                          <div>
                            <div style={{ color: isSelected ? '#000000' : '#71717a' }}>{item.name}</div>
                            {item.selectedStorage && (
                              <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                                {item.selectedColor} • {item.selectedStorage}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 0' }}>{formatVND(item.price)}</td>
                      <td style={{ padding: '1.25rem 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            -
                          </button>
                          <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 0', fontWeight: 700, color: '#000000' }}>
                        {formatVND((item.price || 0) * item.quantity)}
                      </td>
                      <td style={{ padding: '1.25rem 0', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                          aria-label="Xóa sản phẩm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowClearCartConfirmModal(true)}
                  style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                >
                  Xóa tất cả
                </button>
                <span style={{ color: '#d4d4d8' }}>|</span>
                <button
                  type="button"
                  onClick={isAllSelected ? deselectAllItems : selectAllItems}
                  style={{ color: '#18181b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'underline' }}
                >
                  {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', color: '#71717a', marginBottom: '4px' }}>
                  Đã chọn: <strong style={{ color: '#000000' }}>{selectedCount}</strong> / {cartCount} sản phẩm
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Tổng thanh toán: <span style={{ color: '#000000', fontSize: '1.5rem' }}>{formatVND(selectedTotal)}</span>
                </p>
                <button
                  type="button"
                  className="btn"
                  disabled={selectedCount === 0}
                  onClick={() => setShowCheckoutConfirmModal(true)}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '0.85rem 1.75rem',
                    opacity: selectedCount === 0 ? 0.45 : 1,
                    cursor: selectedCount === 0 ? 'not-allowed' : 'pointer'
                  }}
                  title={selectedCount === 0 ? 'Vui lòng chọn ít nhất 1 sản phẩm để thanh toán' : ''}
                >
                  Tiến hành thanh toán ({selectedCount}) <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODEL BOX 1: XÁC NHẬN CHUYỂN SANG TRANG THANH TOÁN */}
      <ConfirmModal
        isOpen={showCheckoutConfirmModal}
        onClose={() => setShowCheckoutConfirmModal(false)}
        type="confirm"
        icon={<CreditCard size={28} strokeWidth={2} />}
        title="Xác nhận chuyển sang thanh toán"
        confirmText="Xác nhận & Đi đến thanh toán"
        cancelText="Kiểm tra lại giỏ"
        onConfirm={() => {
          try {
            sessionStorage.removeItem('CYBER_BUY_NOW_ITEM');
            sessionStorage.setItem('CYBER_FROM_CART', 'true');
          } catch {}
          setShowCheckoutConfirmModal(false);
          navigate('/checkout', { state: { fromCart: true } });
        }}
      >
        <div style={{ background: '#f9f9fa', padding: '14px', borderRadius: '10px', border: '1px solid #e4e4e7', fontSize: '0.875rem', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#71717a' }}>Sản phẩm đã chọn:</span>
            <strong style={{ color: '#000' }}>{selectedCount} món</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px dashed #e4e4e7', paddingBottom: '6px' }}>
            <span style={{ color: '#71717a' }}>Tổng tiền thanh toán:</span>
            <strong style={{ color: '#000', fontSize: '1.15rem' }}>{formatVND(selectedTotal)}</strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#52525b' }}>
            Hệ thống sẽ chuyển bạn sang trang chọn <strong>địa chỉ nhận hàng</strong>, áp dụng <strong>voucher giảm giá</strong> và phương thức thanh toán.
          </p>
        </div>
      </ConfirmModal>

      {/* MODEL BOX 2: XÁC NHẬN XÓA TẤT CẢ GIỎ HÀNG */}
      <ConfirmModal
        isOpen={showClearCartConfirmModal}
        onClose={() => setShowClearCartConfirmModal(false)}
        type="danger"
        title="Xác nhận xóa toàn bộ giỏ hàng"
        message="Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi giỏ hàng? Thao tác này không thể hoàn tác."
        confirmText="Xác nhận xóa tất cả"
        cancelText="Giữ lại giỏ hàng"
        onConfirm={() => {
          clearCart();
          setShowClearCartConfirmModal(false);
        }}
      />

      {/* MODEL BOX 3: XÁC NHẬN XÓA 1 SẢN PHẨM */}
      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        type="danger"
        title="Xác nhận xóa sản phẩm"
        message={itemToDelete ? `Bạn có chắc chắn muốn xóa "${itemToDelete.name}" khỏi giỏ hàng không?` : ''}
        confirmText="Xóa sản phẩm"
        cancelText="Hủy bỏ"
        onConfirm={() => {
          if (itemToDelete) {
            removeFromCart(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
      />
    </section>
  );
};
