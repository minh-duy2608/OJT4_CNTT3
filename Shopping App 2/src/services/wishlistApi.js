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
        } catch {
          clearStoredTokens();
        }
      }
    }

    if (!response.ok) {
      const error = new Error(data?.message || 'Lỗi thao tác danh sách yêu thích');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const wishlistApi = {
  /**
   * STT 79: GET /wishlist - Lấy danh sách yêu thích
   */
  async getWishlist() {
    return await request('/wishlist', { method: 'GET' });
  },

  /**
   * STT 80: POST /wishlist/items - Thêm sản phẩm vào yêu thích
   */
  async addToWishlist(productId) {
    return await request('/wishlist/items', {
      method: 'POST',
      body: JSON.stringify({ productId: Number(productId) })
    });
  },

  /**
   * STT 81: DELETE /wishlist/items/{itemId} - Xóa sản phẩm khỏi yêu thích
   */
  async removeFromWishlist(itemId) {
    return await request(`/wishlist/items/${itemId}`, {
      method: 'DELETE'
    });
  },

  /**
   * STT 82: DELETE /wishlist/items - Xóa toàn bộ danh sách yêu thích
   */
  async clearWishlist() {
    return await request('/wishlist/items', {
      method: 'DELETE'
    });
  }
};

