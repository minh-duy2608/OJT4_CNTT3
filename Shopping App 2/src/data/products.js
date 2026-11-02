// Hàm định dạng tiền tệ Việt Nam Đồng chuẩn
export const formatVND = (amount) => {
  if (typeof amount !== 'number') return '0₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount).replace('₫', '').trim() + '₫';
};

export const INITIAL_PRODUCTS = [];
export const DISCOUNT_PRODUCTS = [];
