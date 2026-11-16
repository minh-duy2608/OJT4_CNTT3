import { getStoredAccessToken } from './authApi';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}` 
  : '';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getStoredAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `HTTP error! status: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data?.data !== undefined ? data.data : data;
}

export const paymentApi = {
  /**
   * Tạo liên kết và mã QR thanh toán PayOS (VietQR) cho đơn hàng
   */
  createPayOSLink(orderId) {
    return request(`/api/v1/payment/payos/create-link/${orderId}`, {
      method: 'POST'
    });
  },

  /**
   * Kiểm tra trạng thái thanh toán đơn hàng (polling)
   */
  getPayOSStatus(orderId) {
    return request(`/api/v1/payment/payos/status/${orderId}`, {
      method: 'GET'
    });
  },

  /**
   * Hủy thanh toán PayOS
   */
  cancelPayOSLink(orderId) {
    return request(`/api/v1/payment/payos/cancel/${orderId}`, {
      method: 'POST'
    });
  },

  /**
   * Giả lập thanh toán thành công (Test Demo)
   */
  simulateSuccess(orderId) {
    return request(`/api/v1/payment/payos/simulate-success/${orderId}`, {
      method: 'POST'
    });
  }
};
