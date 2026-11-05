import { getStoredAccessToken, getStoredRefreshToken, setStoredTokens, clearStoredTokens, authApi } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1` 
  : '/api/v1';

async function request(endpoint = '', options = {}, isRetry = false) {
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
      const errorMsg = data?.message || data?.error || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    throw err;
  }
}

export const productReviewApi = {
  /**
   * Lấy danh sách đánh giá & thống kê sao (PUBLIC)
   */
  getReviews: async (productId, { rating, page = 1, size = 10, sortBy = 'createdAt', sortDir = 'desc' } = {}) => {
    const query = new URLSearchParams();
    if (rating) query.append('rating', rating);
    if (page) query.append('page', page);
    if (size) query.append('size', size);
    if (sortBy) query.append('sortBy', sortBy);
    if (sortDir) query.append('sortDir', sortDir);

    const queryString = query.toString();
    const endpoint = `/products/${productId}/reviews${queryString ? `?${queryString}` : ''}`;
    return request(endpoint, { method: 'GET' });
  },

  /**
   * Lấy bài đánh giá của user hiện tại cho sản phẩm này
   */
  getMyReview: async (productId) => {
    return request(`/products/${productId}/reviews/my-review`, { method: 'GET' });
  },

  /**
   * Viết đánh giá sản phẩm (Mỗi người mua chỉ được 1 bài)
   */
  createReview: async (productId, reviewData) => {
    return request(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  },

  /**
   * Chỉnh sửa bài đánh giá
   */
  updateReview: async (productId, reviewId, reviewData) => {
    return request(`/products/${productId}/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(reviewData)
    });
  },

  /**
   * Xóa bài đánh giá
   */
  deleteReview: async (productId, reviewId) => {
    return request(`/products/${productId}/reviews/${reviewId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Người bán / Admin phản hồi đánh giá
   */
  replyReview: async (productId, reviewId, replyData) => {
    return request(`/products/${productId}/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify(replyData)
    });
  },

  /**
   * Xóa phản hồi của người bán
   */
  deleteReply: async (productId, reviewId) => {
    return request(`/products/${productId}/reviews/${reviewId}/reply`, {
      method: 'DELETE'
    });
  }
};
