import React, { createContext, useContext, useState, useEffect } from 'react';

const OrderContext = createContext();

const ORDERS_STORAGE_KEY = 'CYBER_ORDERS_V1';

// 5 Trạng thái đơn hàng theo đúng yêu cầu
export const ORDER_STATUSES = [
  { key: 'pending', label: 'Chờ xác nhận', step: 1, color: '#f59e0b', bg: '#fef3c7' },
  { key: 'confirmed', label: 'Đã xác nhận', step: 2, color: '#3b82f6', bg: '#eff6ff' },
  { key: 'pickup', label: 'Chờ shipper lấy hàng', step: 3, color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'delivering', label: 'Đang giao', step: 4, color: '#06b6d4', bg: '#ecfeff' },
  { key: 'delivered', label: 'Đã giao', step: 5, color: '#10b981', bg: '#ecfdf5' }
];

const INITIAL_ORDERS = [
  {
    id: 'CYBER-89234',
    createdAt: '2026-10-27T14:30:00Z',
    status: 'delivering', // Đang giao
    shippingAddress: {
      fullName: 'Hoàng Sơn',
      phone: '0362490374',
      detailAddress: 'Số 12, Đường Nguyễn Văn Cừ, Phường 4, Quận 5',
      city: 'TP. Hồ Chí Minh'
    },
    items: [
      {
        id: 'prod-1',
        name: 'Apple iPhone 14 Pro Max 128GB Deep Purple (Deep Purple, 128GB)',
        price: 22990000,
        quantity: 1,
        image: '/src/assets/products/iphone-14-pro.png'
      }
    ],
    voucherCode: 'CYBER10',
    discountAmount: 1000000,
    subtotal: 22990000,
    shippingFee: 0,
    totalPayment: 21990000,
    paymentMethod: 'COD' // Thanh toán khi nhận hàng
  },
  {
    id: 'CYBER-67120',
    createdAt: '2026-10-25T09:15:00Z',
    status: 'delivered', // Đã giao
    shippingAddress: {
      fullName: 'Hoàng Sơn',
      phone: '0362490374',
      detailAddress: 'Tòa nhà Cyber Tower, 285 Cách Mạng Tháng Tám, Quận 10',
      city: 'TP. Hồ Chí Minh'
    },
    items: [
      {
        id: 'prod-4',
        name: 'AirPods Max Silver',
        price: 13990000,
        quantity: 1,
        image: '/src/assets/products/airpods-max.png'
      }
    ],
    voucherCode: 'FREESHIP',
    discountAmount: 50000,
    subtotal: 13990000,
    shippingFee: 0,
    totalPayment: 13990000,
    paymentMethod: 'Bank Transfer'
  }
];

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to sync orders:', e);
    }
  }, [orders]);

  // Tạo đơn hàng mới
  const createOrder = (orderData) => {
    const newOrder = {
      ...orderData,
      id: `CYBER-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString(),
      status: 'pending' // Luôn bắt đầu ở trạng thái "Chờ xác nhận"
    };

    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  // Cập nhật trạng thái đơn hàng (để mô phỏng quá trình giao hàng)
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  // Hủy đơn hàng
  const cancelOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      )
    );
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        createOrder,
        updateOrderStatus,
        cancelOrder
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

