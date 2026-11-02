import { getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens, authApi } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}` 
  : '';

async function request(endpoint, options = {}, isRetry = false) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (response.status === 401 && !isRetry) {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        try {
          const refreshRes = await authApi.refresh(refreshToken);
          if (refreshRes && refreshRes.accessToken) {
            setStoredTokens(refreshRes.accessToken, refreshRes.refreshToken);
            return request(endpoint, options, true);
          }
        } catch (refreshErr) {
          clearStoredTokens();
        }
      }
    }

    if (!response.ok) {
      const error = new Error(data?.message || 'Lỗi thao tác giỏ hàng');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const cartApi = {
  /**
   * Lấy giỏ hàng từ server
   */
  async getCart() {
    return await request('/cart', { method: 'GET' });
  },

  /**
   * Thêm sản phẩm vào giỏ hàng
   */
  async addToCart(variantId, quantity = 1) {
    return await request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ variantId, quantity })
    });
  },

  /**
   * Cập nhật số lượng của một sản phẩm
   */
  async updateQuantity(itemId, quantity) {
    return await request(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity })
    });
  },

  /**
   * Xóa sản phẩm khỏi giỏ hàng
   */
  async removeItem(itemId) {
    return await request(`/cart/items/${itemId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Xóa sạch toàn bộ giỏ hàng
   */
  async clearCart() {
    return await request('/cart', {
      method: 'DELETE'
    });
  },

  /**
   * STT 78: DELETE /cart/items - Xóa toàn bộ sản phẩm trong giỏ
   */
  async clearCartItems() {
    return await request('/cart/items', {
      method: 'DELETE'
    });
  },

  /**
   * Đồng bộ các sản phẩm từ local lên server
   */
  async syncCart(items) {
    return await request('/cart/sync', {
      method: 'POST',
      body: JSON.stringify(items)
    });
  }
};

