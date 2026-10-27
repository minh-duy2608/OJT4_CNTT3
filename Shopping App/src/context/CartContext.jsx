import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

const CART_STORAGE_KEY = 'NOI_CART_V1';
const CART_SELECTED_KEY = 'CYBER_CART_SELECTED_V1';

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  // 1. Danh sách sản phẩm trong giỏ hàng
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 2. Danh sách ID sản phẩm được chọn để thanh toán (mặc định chọn tất cả)
  const [selectedItemIds, setSelectedItemIds] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_SELECTED_KEY);
      if (saved) return JSON.parse(saved);
      return cartItems.map((item) => item.id);
    } catch {
      return cartItems.map((item) => item.id);
    }
  });

  // 3. Trạng thái hiệu ứng bay vào giỏ hàng (Shopee style)
  const [flyingItem, setFlyingItem] = useState(null);
  const [cartBumping, setCartBumping] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);

  // Đồng bộ giỏ hàng vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to sync cart:', e);
    }
  }, [cartItems]);

  // Đồng bộ danh sách chọn vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_SELECTED_KEY, JSON.stringify(selectedItemIds));
    } catch (e) {
      console.error('Failed to sync selected items:', e);
    }
  }, [selectedItemIds]);

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Kích hoạt hiệu ứng bay vào giỏ hàng kiểu Shopee
  const triggerFlyToCart = (imageSrc, customStartRect = null) => {
    try {
      const cartBtn = document.getElementById('cyber-header-cart-btn') || 
                      document.querySelector('.cyber-action-btn[href="/cart"]');
      
      let startX = window.innerWidth / 2 - 50;
      let startY = window.innerHeight / 2 - 50;

      if (customStartRect) {
        startX = customStartRect.left + (customStartRect.width / 2) - 50;
        startY = customStartRect.top + (customStartRect.height / 2) - 50;
      } else {
        const productImg = document.querySelector('.detail-main-img') || 
                           document.querySelector('.modal-thumb-img');
        if (productImg) {
          const r = productImg.getBoundingClientRect();
          startX = r.left + (r.width / 2) - 50;
          startY = r.top + (r.height / 2) - 50;
        }
      }

      let targetX = window.innerWidth - 80;
      let targetY = 30;

      if (cartBtn) {
        const r = cartBtn.getBoundingClientRect();
        targetX = r.left + (r.width / 2) - 20;
        targetY = r.top + (r.height / 2) - 20;
      }

      const flyId = Date.now();
      setFlyingItem({
        id: flyId,
        image: imageSrc,
        startX,
        startY,
        targetX,
        targetY
      });

      // Kết thúc hiệu ứng bay sau 800ms -> Kích hoạt giỏ hàng rung nhún
      setTimeout(() => {
        setFlyingItem(null);
        setCartBumping(true);
        setTimeout(() => setCartBumping(false), 600);
      }, 800);
    } catch (e) {
      console.warn('Fly to cart animation error:', e);
    }
  };

  // Thêm sản phẩm vào giỏ hàng (tự động chọn sản phẩm vừa thêm)
  const addToCart = (product, quantity = 1, options = {}) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng và mua hàng!', 'warning');
      return { success: false, requireAuth: true };
    }

    setCartItems((prevItems) => {
      const existing = prevItems.find((item) => item.id === product.id);
      if (existing) {
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prevItems, { ...product, quantity }];
    });

    // Luôn tự động chọn sản phẩm vừa thêm để sẵn sàng thanh toán
    setSelectedItemIds((prev) => Array.from(new Set([...prev, product.id])));

    // Bật hiệu ứng bay nếu yêu cầu
    if (options.fly !== false) {
      triggerFlyToCart(product.image, options.startRect || null);
    }

    return { success: true };
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedItemIds((prev) => prev.filter((itemId) => itemId !== id));
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  // ================= QUẢN LÝ CHỌN SẢN PHẨM ĐỂ THANH TOÁN =================
  // Đảo trạng thái chọn của 1 sản phẩm
  const toggleSelectItem = (id) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Chọn tất cả sản phẩm
  const selectAllItems = () => {
    setSelectedItemIds(cartItems.map((item) => item.id));
  };

  // Bỏ chọn tất cả sản phẩm
  const deselectAllItems = () => {
    setSelectedItemIds([]);
  };

  // Xóa toàn bộ giỏ hàng
  const clearCart = () => {
    setCartItems([]);
    setSelectedItemIds([]);
  };

  // Xóa chỉ những sản phẩm đã chọn (dùng sau khi đặt hàng thành công)
  const clearSelectedFromCart = () => {
    setCartItems((prev) => prev.filter((item) => !selectedItemIds.includes(item.id)));
    setSelectedItemIds([]);
  };

  // Tính toán số liệu tổng thể giỏ hàng
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);

  // Tính toán số liệu CỦA RIÊNG CÁC SẢN PHẨM ĐƯỢC CHỌN
  const selectedItems = cartItems.filter((item) => selectedItemIds.includes(item.id));
  const selectedCount = selectedItems.reduce((acc, item) => acc + item.quantity, 0);
  const selectedTotal = selectedItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
  const isAllSelected = cartItems.length > 0 && selectedItems.length === cartItems.length;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartTotal,
        // Selection
        selectedItemIds,
        selectedItems,
        selectedCount,
        selectedTotal,
        isAllSelected,
        toggleSelectItem,
        selectAllItems,
        deselectAllItems,
        clearSelectedFromCart,
        // Actions
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toastMessage,
        setToastMessage,
        showToast,
        // Fly to cart animation
        flyingItem,
        cartBumping,
        triggerFlyToCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
