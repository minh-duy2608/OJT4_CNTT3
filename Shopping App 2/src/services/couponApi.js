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
      const error = new Error(data?.message || 'Lỗi xử lý mã giảm giá');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const couponApi = {
  /**
   * STT 89: GET /shops/{shopId}/coupons - Danh sách mã giảm giá công khai của cửa hàng
   */
  async getShopCoupons(shopId) {
    return await request(`/shops/${shopId}/coupons`, { method: 'GET' });
  },

  /**
   * STT 90: POST /coupons/validate - Kiểm tra mã giảm giá với giỏ hàng hoặc đơn hàng dự kiến
   * @param {Object} payload { code: string, shopId?: number, items: Array<{ productId, variantId, quantity }> }
   */
  async validateCoupon(payload) {
    return await request('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

