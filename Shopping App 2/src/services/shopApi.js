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
      const error = new Error(data?.message || 'Lỗi thao tác cửa hàng');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const shopApi = {
  /**
   * Đăng ký mở cửa hàng mới
   */
  async registerShop(payload) {
    return await request('/shops/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Lấy thông tin cửa hàng của người dùng hiện tại
   */
  async getMyShop() {
    return await request('/shops/my-shop', { method: 'GET' });
  },

  /**
   * Lấy danh sách tất cả các cửa hàng
   */
  async getAllShops() {
    return await request('/shops', { method: 'GET' });
  },

  /**
   * Lấy chi tiết cửa hàng theo ID
   */
  async getShopById(shopId) {
    return await request(`/shops/${shopId}`, { method: 'GET' });
  },

  /**
   * Cập nhật thông tin cửa hàng
   */
  async updateShop(shopId, payload) {
    return await request(`/shops/${shopId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }
};
