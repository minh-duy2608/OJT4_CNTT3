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
   * Admin: Lấy danh sách đối soát & chuyển tiền cho Shop (Escrow Payouts)
   */
  getPayoutSummary(status = 'ALL') {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/api/v1/payment/payouts${query}`, {
      method: 'GET'
    });
  },

  /**
   * Shop: Lấy danh sách đối soát tiền của Shop
   */
  getShopPayouts(shopId) {
    return request(`/api/v1/payment/payouts/shop/${shopId}`, {
      method: 'GET'
    });
  },

  /**
   * Admin: Xác nhận đã chuyển tiền cho Shop
   */
  confirmShopPayout(orderId, payload = {}) {
    return request(`/api/v1/payment/payouts/${orderId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Shop: Cập nhật thông tin tài khoản ngân hàng nhận tiền
   */
  updateShopBankAccount(shopId, payload) {
    return request(`/api/v1/shops/${shopId}/bank-account`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }
};

