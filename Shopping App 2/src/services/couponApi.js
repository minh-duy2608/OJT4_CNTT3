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
  },

  /**
   * GET /admin/coupons - Danh sách mã giảm giá cho trang quản trị (Admin / Shop)
   */
  async getAdminCoupons({ shopId, status, keyword, page = 0, size = 10 } = {}) {
    const params = new URLSearchParams();
    if (shopId) params.append('shopId', shopId);
    if (status) params.append('status', status);
    if (keyword) params.append('keyword', keyword);
    params.append('page', page);
    params.append('size', size);
    return await request(`/admin/coupons?${params.toString()}`, { method: 'GET' });
  },

  /**
   * GET /admin/coupons/{id} - Lấy chi tiết mã giảm giá theo ID
   */
  async getAdminCouponById(couponId) {
    return await request(`/admin/coupons/${couponId}`, { method: 'GET' });
  },

  /**
   * POST /admin/coupons - Tạo mã giảm giá mới
   */
  async createCoupon(payload) {
    return await request('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * PUT /admin/coupons/{id} - Cập nhật mã giảm giá
   */
  async updateCoupon(couponId, payload) {
    return await request(`/admin/coupons/${couponId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  /**
   * PATCH /admin/coupons/{id}/status - Cập nhật trạng thái mã giảm giá (ACTIVE, INACTIVE, DRAFT, EXPIRED)
   */
  async updateCouponStatus(couponId, status) {
    return await request(`/admin/coupons/${couponId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  /**
   * DELETE /admin/coupons/{id} - Xóa mã giảm giá
   */
  async deleteCoupon(couponId) {
    return await request(`/admin/coupons/${couponId}`, {
      method: 'DELETE'
    });
  }
};
