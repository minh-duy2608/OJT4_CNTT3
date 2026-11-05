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
          const newToken = refreshRes?.data?.accessToken || refreshRes?.accessToken;
          if (newToken) {
            setStoredTokens(newToken, refreshToken);
            return request(endpoint, options, true);
          }
        } catch (e) {
          clearStoredTokens();
          window.location.href = '/login';
          throw new Error('Phiên đăng nhập đã hết hạn.');
        }
      }
    }

    if (!response.ok) {
      throw new Error(data?.message || `Lỗi HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export const revenueApi = {
  /**
   * Lấy báo cáo thống kê doanh thu toàn hệ thống (Admin)
   */
  async getPlatformRevenue(params = {}) {
    const query = new URLSearchParams();
    if (params.shopId) query.append('shopId', params.shopId);
    if (params.timeRange) query.append('timeRange', params.timeRange);
    const qs = query.toString();
    const res = await request(`/api/v1/admin/revenue${qs ? `?${qs}` : ''}`, { method: 'GET' });
    return res?.data;
  }
};

