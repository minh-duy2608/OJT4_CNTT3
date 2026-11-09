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
      const error = new Error(data?.message || 'Lỗi xử lý đánh giá');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const shopReviewApi = {
  /**
   * STT 124: GET /shops/{shopId}/reviews - Danh sách đánh giá công khai của shop
   */
  async getPublicReviews(shopId, params = {}) {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/shops/${shopId}/reviews${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 125: GET /shops/{shopId}/reviews/summary - Tổng hợp điểm đánh giá của shop
   */
  async getReviewSummary(shopId) {
    return await request(`/shops/${shopId}/reviews/summary`, { method: 'GET' });
  },

  /**
   * STT 126: POST /orders/{orderId}/review - Tạo đánh giá cho cửa hàng từ đơn hàng
   */
  async createReview(orderId, payload) {
    return await request(`/orders/${orderId}/review`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 127: GET /orders/{orderId}/review - Xem đánh giá của đơn hàng
   */
  async getOrderReview(orderId) {
    return await request(`/orders/${orderId}/review`, { method: 'GET' });
  },

  /**
   * STT 128: PATCH /reviews/{reviewId} - Sửa đánh giá
   */
  async updateReview(reviewId, payload) {
    return await request(`/reviews/${reviewId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 129: DELETE /reviews/{reviewId} - Xóa đánh giá
   */
  async deleteReview(reviewId) {
    return await request(`/reviews/${reviewId}`, { method: 'DELETE' });
  },

  /**
   * STT 130: POST /shops/{shopId}/reviews/{reviewId}/reply - Cửa hàng phản hồi đánh giá
   */
  async replyReview(shopId, reviewId, payload) {
    return await request(`/shops/${shopId}/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 131: PATCH /shops/{shopId}/reviews/{reviewId}/reply - Sửa phản hồi của shop
   */
  async updateReplyReview(shopId, reviewId, payload) {
    return await request(`/shops/${shopId}/reviews/${reviewId}/reply`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  /**
   * STT 132: GET /shops/{shopId}/reviews/manage - Cửa hàng quản lý đánh giá
   */
  async getShopManageReviews(shopId, params = {}) {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/shops/${shopId}/reviews/manage${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 133: GET /admin/reviews - Quản trị viên xem tất cả đánh giá
   */
  async getAdminReviews(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.append('status', params.status.toUpperCase());
    if (params.page !== undefined) query.append('page', params.page);
    if (params.size !== undefined) query.append('size', params.size);

    const qs = query.toString();
    return await request(`/admin/reviews${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * STT 134: PATCH /admin/reviews/{reviewId}/moderation - Quản trị viên kiểm duyệt đánh giá
   */
  async moderateReview(reviewId, payload) {
    return await request(`/admin/reviews/${reviewId}/moderation`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};

