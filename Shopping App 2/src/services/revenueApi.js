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
        }
      }
    }

    if (!response.ok) {
      throw new Error(data?.message || `Lỗi HTTP ${response.status}`);
    }

    return data?.data !== undefined ? data.data : data;
  } catch (error) {
    throw error;
  }
}

export const revenueApi = {
  // Legacy / Direct endpoints
  async getPlatformRevenue(params = {}) {
    const query = new URLSearchParams();
    if (params.shopId) query.append('shopId', params.shopId);
    if (params.timeRange) query.append('timeRange', params.timeRange);
    const qs = query.toString();
    const res = await request(`/admin/revenue${qs ? `?${qs}` : ''}`, { method: 'GET' });
    return res?.data !== undefined ? res.data : res;
  },

  // STT 147: GET /admin/dashboard/summary - Thống kê tổng quan hệ thống
  async getAdminDashboardSummary() {
    return await request('/admin/dashboard/summary', { method: 'GET' });
  },

  // STT 148: GET /admin/dashboard/revenue - Doanh thu hệ thống theo thời gian
  async getAdminDashboardRevenue(period = 'day') {
    return await request(`/admin/dashboard/revenue?period=${period}`, { method: 'GET' });
  },

  // STT 149: GET /admin/dashboard/orders - Thống kê đơn hàng toàn hệ thống
  async getAdminDashboardOrders() {
    return await request('/admin/dashboard/orders', { method: 'GET' });
  },

  // STT 150: GET /admin/dashboard/users - Thống kê người dùng
  async getAdminDashboardUsers() {
    return await request('/admin/dashboard/users', { method: 'GET' });
  },

  // STT 151: GET /admin/dashboard/shops - Thống kê cửa hàng
  async getAdminDashboardShops() {
    return await request('/admin/dashboard/shops', { method: 'GET' });
  },

  // STT 152: GET /admin/reports/revenue - Báo cáo doanh thu khoảng thời gian
  async getAdminReportRevenue(startDate, endDate) {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    const qs = query.toString();
    return await request(`/admin/reports/revenue${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  // STT 153: GET /admin/reports/top-products - Top sản phẩm bán chạy nhất
  async getAdminTopProducts(limit = 10) {
    return await request(`/admin/reports/top-products?limit=${limit}`, { method: 'GET' });
  },

  // STT 154: GET /admin/reports/top-shops - Top cửa hàng doanh thu cao nhất
  async getAdminTopShops(limit = 10) {
    return await request(`/admin/reports/top-shops?limit=${limit}`, { method: 'GET' });
  },

  // STT 155: GET /shops/{shopId}/dashboard/summary - Thống kê tổng quan shop
  async getShopDashboardSummary(shopId) {
    return await request(`/shops/${shopId}/dashboard/summary`, { method: 'GET' });
  },

  // STT 156: GET /shops/{shopId}/dashboard/revenue - Doanh thu shop theo thời gian
  async getShopDashboardRevenue(shopId, period = 'day') {
    return await request(`/shops/${shopId}/dashboard/revenue?period=${period}`, { method: 'GET' });
  },

  // STT 157: GET /shops/{shopId}/dashboard/orders - Thống kê đơn hàng shop
  async getShopDashboardOrders(shopId) {
    return await request(`/shops/${shopId}/dashboard/orders`, { method: 'GET' });
  },

  // STT 158: GET /shops/{shopId}/reports/top-products - Top sản phẩm bán chạy shop
  async getShopTopProducts(shopId, limit = 10) {
    return await request(`/shops/${shopId}/reports/top-products?limit=${limit}`, { method: 'GET' });
  },

  // STT 159: GET /shops/{shopId}/reports/revenue - Báo cáo doanh thu shop
  async getShopReportRevenue(shopId, startDate, endDate) {
    const query = new URLSearchParams();
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);
    const qs = query.toString();
    return await request(`/shops/${shopId}/reports/revenue${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }
};
