/**
 * Hệ thống Voucher / Mã giảm giá mẫu cho Cyber Shopping App
 */

export const AVAILABLE_VOUCHERS = [
  {
    code: 'CYBER10',
    title: 'Giảm 10% đơn hàng',
    description: 'Giảm tối đa 1.000.000₫ cho đơn hàng từ 5.000.000₫',
    type: 'percent',
    value: 10,
    maxDiscount: 1000000,
    minOrder: 5000000
  },
  {
    code: 'GIAM500K',
    title: 'Giảm ngay 500.000₫',
    description: 'Áp dụng cho mọi đơn hàng từ 10.000.000₫',
    type: 'fixed',
    value: 500000,
    minOrder: 10000000
  },
  {
    code: 'FREESHIP',
    title: 'Miễn phí vận chuyển',
    description: 'Giảm 50.000₫ phí giao hàng toàn quốc',
    type: 'shipping',
    value: 50000,
    minOrder: 0
  },
  {
    code: 'CYBERVIP',
    title: 'Ưu đãi VIP 1.5 Triệu',
    description: 'Giảm ngay 1.500.000₫ cho đơn hàng công nghệ từ 25.000.000₫',
    type: 'fixed',
    value: 1500000,
    minOrder: 25000000
  }
];

export const calculateVoucherDiscount = (voucherCode, subtotal, shippingFee = 50000) => {
  if (!voucherCode) return { valid: false, discount: 0, message: '' };

  const voucher = AVAILABLE_VOUCHERS.find(
    (v) => v.code.toUpperCase() === voucherCode.trim().toUpperCase()
  );

  if (!voucher) {
    return {
      valid: false,
      discount: 0,
      message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.'
    };
  }

  if (subtotal < voucher.minOrder) {
    return {
      valid: false,
      discount: 0,
      message: `Đơn hàng tối thiểu cần ${new Intl.NumberFormat('vi-VN').format(voucher.minOrder)}₫ để áp dụng mã này.`
    };
  }

  let discount = 0;
  if (voucher.type === 'percent') {
    discount = Math.min((subtotal * voucher.value) / 100, voucher.maxDiscount || Infinity);
  } else if (voucher.type === 'fixed') {
    discount = voucher.value;
  } else if (voucher.type === 'shipping') {
    discount = Math.min(shippingFee, voucher.value);
  }

  return {
    valid: true,
    discount,
    voucher,
    message: `Áp dụng thành công mã "${voucher.code}"!`
  };
};

