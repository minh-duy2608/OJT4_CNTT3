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
      let errorMessage = data?.message || data?.error || ('Lỗi xử lý mã giảm giá (' + response.status + ')');
      if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        const fieldErrors = Object.values(data.data).join(', ');
        if (fieldErrors) {
          errorMessage = errorMessage + ': ' + fieldErrors;
        }
      }
      const error = new Error(errorMessage);
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
   * GET /api/v1/admin/coupons - Danh sách mã giảm giá cho trang quản trị (Admin / Shop)
   */
  async getAdminCoupons({ shopId, status, keyword, page = 0, size = 10 } = {}) {
    const params = new URLSearchParams();
    if (shopId) params.append('shopId', shopId);
    if (status) params.append('status', status);
    if (keyword) params.append('keyword', keyword);
    params.append('page', page);
    params.append('size', size);
    return await request(`/api/v1/admin/coupons?${params.toString()}`, { method: 'GET' });
  },

  /**
   * GET /api/v1/admin/coupons/{id} - Lấy chi tiết mã giảm giá theo ID
   */
  async getAdminCouponById(couponId) {
    return await request(`/api/v1/admin/coupons/${couponId}`, { method: 'GET' });
  },

  /**
   * POST /api/v1/admin/coupons - Tạo mã giảm giá mới
   */
  async createCoupon(payload) {
    return await request('/api/v1/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * PUT /api/v1/admin/coupons/{id} - Cập nhật mã giảm giá
   */
  async updateCoupon(couponId, payload) {
    return await request(`/api/v1/admin/coupons/${couponId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  /**
   * PATCH /api/v1/admin/coupons/{id}/status - Cập nhật trạng thái mã giảm giá (ACTIVE, INACTIVE, DRAFT, EXPIRED)
   */
  async updateCouponStatus(couponId, status) {
    return await request(`/api/v1/admin/coupons/${couponId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  /**
   * DELETE /api/v1/admin/coupons/{id} - Xóa mã giảm giá
   */
  async deleteCoupon(couponId) {
    return await request(`/api/v1/admin/coupons/${couponId}`, {
      method: 'DELETE'
    });
  },

  /**
   * STT 91: GET /shops/{shopId}/coupons/manage - Danh sách mã giảm giá trong phạm vi quản lý của cửa hàng
   */
  async getShopManageCoupons(shopId, { status, keyword, page = 0, size = 10 } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (keyword) params.append('keyword', keyword);
    params.append('page', page);
    params.append('size', size);
    return await request(`/shops/${shopId}/coupons/manage?${params.toString()}`, { method: 'GET' });
  },

  /**
   * STT 92: POST /shops/{shopId}/coupons - Tạo mã giảm giá của cửa hàng
   */
  async createShopCoupon(shopId, payload) {
    return await request(`/shops/${shopId}/coupons`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 93: GET /shops/{shopId}/coupons/{couponId} - Chi tiết mã giảm giá trong phạm vi quản lý
   */
  async getShopCouponById(shopId, couponId) {
    return await request(`/shops/${shopId}/coupons/${couponId}`, { method: 'GET' });
  },

  /**
   * STT 94: PATCH /shops/{shopId}/coupons/{couponId} - Cập nhật thông tin mã giảm giá
   */
  async updateShopCoupon(shopId, couponId, payload) {
    return await request(`/shops/${shopId}/coupons/${couponId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 95: PATCH /shops/{shopId}/coupons/{couponId}/status - Thay đổi trạng thái mã giảm giá
   */
  async updateShopCouponStatus(shopId, couponId, status) {
    return await request(`/shops/${shopId}/coupons/${couponId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  /**
   * STT 96: DELETE /shops/{shopId}/coupons/{couponId} - Xóa hoặc vô hiệu hóa mã giảm giá
   */
  async deleteShopCoupon(shopId, couponId) {
    return await request(`/shops/${shopId}/coupons/${couponId}`, {
      method: 'DELETE'
    });
  },

  /**
   * STT 97: PUT /shops/{shopId}/coupons/{couponId}/products - Cập nhật phạm vi áp dụng sản phẩm cho coupon
   */
  async updateShopCouponProducts(shopId, couponId, productIds) {
    return await request(`/shops/${shopId}/coupons/${couponId}/products`, {
      method: 'PUT',
      body: JSON.stringify({ productIds })
    });
  },

  /**
   * Storefront: Lấy danh sách coupon hiển thị trên storefront (toàn sàn hoặc theo shop)
   */
  async getStorefrontCoupons(shopId) {
    const params = new URLSearchParams();
    if (shopId) params.append('shopId', shopId);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return await request(`/coupons/storefront${queryString}`, { method: 'GET' });
  },

  /**
   * Khách hàng lưu mã coupon vào ví voucher cá nhân theo couponId (Idempotent)
   */
  async saveCouponToWallet(couponId) {
    return await request(`/coupons/${couponId}/save`, { method: 'POST' });
  },

  /**
   * Khách hàng nhập mã code để lưu vào ví voucher (Idempotent)
   */
  async saveCouponCodeToWallet(code) {
    return await request(`/coupons/save`, {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },

  /**
   * Khách hàng lấy danh sách mã giảm giá đã lưu trong ví cá nhân
   */
  async getUserWalletCoupons() {
    return await request(`/user/coupons`, { method: 'GET' });
  },

  /**
   * Khách hàng gỡ mã giảm giá khỏi ví
   */
  async removeCouponFromWallet(couponId) {
    return await request(`/user/coupons/${couponId}`, { method: 'DELETE' });
  }
};
