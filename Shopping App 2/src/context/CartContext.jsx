import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { cartApi } from '../services/cartApi';

const CartContext = createContext();

const CART_STORAGE_KEY = 'NOI_CART_V1';
const CART_SELECTED_KEY = 'CYBER_CART_SELECTED_V1';

export const isItemOutOfStock = (item) => {
  if (!item) return false;
  return item.inStock === false || 
         item.stockQuantity === 0 || 
         (item.stockQuantity !== undefined && item.stockQuantity !== null && item.stockQuantity <= 0) ||
         (item.availableQuantity !== undefined && item.availableQuantity !== null && item.availableQuantity <= 0);
};

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

  // 2. Danh sách ID sản phẩm được chọn để thanh toán (mặc định chỉ chọn các sản phẩm CÒN HÀNG)
  const [selectedItemIds, setSelectedItemIds] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_SELECTED_KEY);
      const parsed = saved ? JSON.parse(saved) : cartItems.map((item) => item.id);
      return Array.isArray(parsed) 
        ? parsed.filter(id => {
            const it = cartItems.find(i => i.id === id);
            return it ? !isItemOutOfStock(it) : false;
          })
        : [];
    } catch {
      return cartItems.filter(it => !isItemOutOfStock(it)).map((item) => item.id);
    }
  });

  // 3. Trạng thái hiệu ứng bay vào giỏ hàng (Shopee style)
  const [flyingItem, setFlyingItem] = useState(null);
  const [cartBumping, setCartBumping] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);

  // Tự động đồng bộ giỏ hàng với Backend khi người dùng đăng nhập
  const syncWithBackendCart = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await cartApi.getCart();
      if (res && res.items) {
        if (res.items.length > 0) {
          const beMapped = res.items.map(it => ({
            id: it.id,
            backendItemId: it.id,
            variantId: it.variantId,
            productId: it.productId,
            shopId: it.shopId,
            shopName: it.shopName,
            name: `${it.productName}${it.variantName ? ` (${it.variantName})` : ''}`,
            price: Number(it.salePrice || it.price || 0),
            quantity: it.quantity,
            image: it.imageUrl,
            stockQuantity: it.stockQuantity,
            availableQuantity: it.stockQuantity,
            inStock: it.stockQuantity != null ? it.stockQuantity > 0 : true
          }));
          setCartItems(beMapped);
          setSelectedItemIds(prev => {
            const inStockIds = beMapped.filter(it => !isItemOutOfStock(it)).map(i => i.id);
            if (prev && prev.length > 0) {
              const filteredPrev = prev.filter(id => inStockIds.includes(id));
              return filteredPrev.length > 0 ? filteredPrev : inStockIds;
            }
            return inStockIds;
          });
        } else if (cartItems.length > 0) {
          // Nếu giỏ hàng trên DB đang rỗng mà local có hàng -> đẩy từ local lên DB
          const syncItems = cartItems
            .filter(it => it.variantId || (typeof it.id === 'number'))
            .map(it => ({
              variantId: it.variantId || it.id,
              quantity: it.quantity
            }));
          if (syncItems.length > 0) {
            await cartApi.syncCart(syncItems);
          }
        }
      }
    } catch (err) {
      console.warn('Backend cart sync warning:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    syncWithBackendCart();
  }, [syncWithBackendCart]);

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
  const addToCart = async (product, quantity = 1, options = {}) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng và mua hàng!', 'warning');
      return { success: false, requireAuth: true };
    }

    const isOutOfStock = product.inStock === false || product.stockQuantity === 0 || (product.availableQuantity !== undefined && product.availableQuantity <= 0);
    if (isOutOfStock) {
      showToast('Sản phẩm này hiện đã hết hàng trong kho, không thể thêm vào giỏ hàng!', 'error');
      return { success: false, error: 'out_of_stock' };
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

    // Đồng bộ ngay lên Backend
    const varId = product.variantId || (typeof product.id === 'number' ? product.id : null);
    if (varId) {
      try {
        await cartApi.addToCart(varId, quantity);
        syncWithBackendCart();
      } catch (err) {
        console.warn('Could not sync addToCart with backend:', err);
        // Rollback lại giỏ hàng local nếu backend từ chối (vd hết hàng)
        setCartItems((prevItems) => {
          const existing = prevItems.find((item) => item.id === product.id);
          if (existing) {
            if (existing.quantity <= quantity) {
              return prevItems.filter((item) => item.id !== product.id);
            }
            return prevItems.map((item) =>
              item.id === product.id ? { ...item, quantity: item.quantity - quantity } : item
            );
          }
          return prevItems;
        });
        const errMessage = err.response?.data?.message || 'Không thể thêm sản phẩm vào giỏ hàng do lỗi kho';
        showToast(errMessage, 'error');
        return { success: false, error: errMessage };
      }
    }

    return { success: true };
  };

  const removeFromCart = async (id) => {
    const target = cartItems.find((item) => item.id === id);
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedItemIds((prev) => prev.filter((itemId) => itemId !== id));

    if (target?.backendItemId) {
      try {
        await cartApi.removeItem(target.backendItemId);
      } catch (err) {
        console.warn('Could not remove item from backend cart:', err);
      }
    }
  };

  const updateQuantity = async (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    const target = cartItems.find((item) => item.id === id);
    if (!target) return;

    const maxStock = target.availableQuantity ?? target.stockQuantity;
    const isOutOfStock = target.inStock === false || target.stockQuantity === 0 || (target.availableQuantity !== undefined && target.availableQuantity <= 0);

    // Chặn tăng số lượng nếu sản phẩm đã hết hàng
    if (quantity > target.quantity && (isOutOfStock || (maxStock !== undefined && maxStock <= 0))) {
      showToast('Sản phẩm này hiện đã hết hàng, không thể tăng thêm số lượng!', 'error');
      return;
    }

    // Chặn tăng vượt quá tồn kho khả dụng
    if (quantity > target.quantity && maxStock !== undefined && quantity > maxStock) {
      showToast(`Số lượng vượt quá tồn kho khả dụng (chỉ còn ${maxStock} sản phẩm)!`, 'warning');
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );

    if (target?.backendItemId) {
      try {
        const res = await cartApi.updateQuantity(target.backendItemId, quantity);
        if (res && res.items) {
          const updatedTarget = res.items.find((i) => i.id === target.backendItemId);
          if (updatedTarget) {
            setCartItems((prev) =>
              prev.map((it) =>
                it.id === id
                  ? {
                      ...it,
                      quantity: updatedTarget.quantity,
                      stockQuantity: updatedTarget.stockQuantity,
                      availableQuantity: updatedTarget.stockQuantity,
                      inStock: updatedTarget.stockQuantity > 0
                    }
                  : it
              )
            );
          }
        }
      } catch (err) {
        console.warn('Could not update quantity on backend cart:', err);
        // Rollback lại số lượng cũ nếu backend từ chối
        setCartItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, quantity: target.quantity } : item))
        );
        const errMsg = err.message || err.response?.data?.message || err.data?.message || 'Không thể cập nhật số lượng do lỗi tồn kho';
        showToast(errMsg, 'warning');
      }
    }
  };

  // ================= QUẢN LÝ CHỌN SẢN PHẨM ĐỂ THANH TOÁN =================
  // Đảo trạng thái chọn của 1 sản phẩm (chặn chọn nếu sản phẩm hết hàng)
  const toggleSelectItem = (id) => {
    const target = cartItems.find((i) => i.id === id);
    if (target && isItemOutOfStock(target)) {
      showToast(`Sản phẩm "${target.name}" hiện đã hết hàng, không thể chọn để thanh toán!`, 'warning');
      return;
    }
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Chọn tất cả sản phẩm (chỉ chọn các sản phẩm CÒN HÀNG)
  const selectAllItems = () => {
    const inStockIds = cartItems.filter((it) => !isItemOutOfStock(it)).map((item) => item.id);
    setSelectedItemIds(inStockIds);
  };

  // Bỏ chọn tất cả sản phẩm
  const deselectAllItems = () => {
    setSelectedItemIds([]);
  };

  // Xóa toàn bộ giỏ hàng
  const clearCart = async () => {
    setCartItems([]);
    setSelectedItemIds([]);
    try {
      await cartApi.clearCart();
    } catch (err) {
      console.warn('Could not clear backend cart:', err);
    }
  };

  // Xóa chỉ những sản phẩm đã chọn (dùng sau khi đặt hàng thành công)
  const clearSelectedFromCart = () => {
    setCartItems((prev) => prev.filter((item) => !selectedItemIds.includes(item.id)));
    setSelectedItemIds([]);
  };

  // Tính toán số liệu tổng thể giỏ hàng (chỉ tính tiền các mặt hàng CÒN HÀNG)
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems
    .filter((item) => !isItemOutOfStock(item))
    .reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);

  // Tính toán số liệu CỦA RIÊNG CÁC SẢN PHẨM ĐƯỢC CHỌN (và phải CÒN HÀNG)
  const selectedItems = cartItems.filter((item) => selectedItemIds.includes(item.id) && !isItemOutOfStock(item));
  const selectedCount = selectedItems.reduce((acc, item) => acc + item.quantity, 0);
  const selectedTotal = selectedItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
  const inStockItems = cartItems.filter((item) => !isItemOutOfStock(item));
  const isAllSelected = inStockItems.length > 0 && inStockItems.every((item) => selectedItemIds.includes(item.id));

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
        // Helpers
        isItemOutOfStock,
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
