import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  AlertTriangle, 
  RefreshCw, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Landmark, 
  CreditCard, 
  Edit3, 
  ShieldCheck,
  Calendar,
  X,
  Check,
  BarChart3,
  PieChart,
  ArrowUpRight,
  FileText,
  ChevronDown,
  Filter,
  Layers,
  Store,
  AlertCircle,
  BadgePercent,
  Wallet
} from 'lucide-react';
import { revenueApi } from '../../services/revenueApi';
import { shopApi } from '../../services/shopApi';
import { paymentApi } from '../../services/paymentApi';
import { formatVND } from '../../data/products';

export const ShopDashboardTab = ({ shopId, shopName }) => {
  const [summary, setSummary] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [shopDetail, setShopDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  // Bộ lọc chu kỳ báo cáo: 'day' | 'month' | 'quarter' | 'year'
  const [reportCycle, setReportCycle] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal cập nhật tài khoản ngân hàng
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankBin, setBankBin] = useState('970418');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  const fetchShopData = async () => {
    if (!shopId) return;
    try {
      setLoading(true);
      const [sumRes, revRes, topRes, shopRes, payoutRes] = await Promise.all([
        revenueApi.getShopDashboardSummary(shopId).catch(() => null),
        revenueApi.getShopDashboardRevenue(shopId, 'day').catch(() => null),
        revenueApi.getShopTopProducts(shopId, 5).catch(() => []),
        shopApi.getShopById(shopId).catch(() => null),
        paymentApi.getShopPayouts(shopId).catch(() => null)
      ]);

      setSummary(sumRes);
      setRevenueData(revRes);
      setTopProducts(Array.isArray(topRes) ? topRes : (topRes?.data || []));

      if (shopRes) {
        setShopDetail(shopRes);
        setBankName(shopRes.bankName || 'BIDV (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)');
        setBankBin(shopRes.bankBin || '970418');
        setBankAccountNumber(shopRes.bankAccountNumber || '8814310515');
        setBankAccountName(shopRes.bankAccountName || 'HOANG THIEN SON');
      }

      if (payoutRes) {
        setPayoutSummary(payoutRes);
      }
    } catch (err) {
      console.error('Lỗi tải thống kê doanh thu cửa hàng', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [shopId]);

  const handleSaveBankAccount = async (e) => {
    e.preventDefault();
    if (!bankAccountNumber.trim() || !bankAccountName.trim()) {
      alert('Vui lòng điền đầy đủ số tài khoản và tên chủ tài khoản!');
      return;
    }
    setSavingBank(true);
    try {
      const res = await paymentApi.updateShopBankAccount(shopId, {
        bankName: bankName.trim(),
        bankBin: bankBin.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim().toUpperCase()
      });
      if (res) {
        setShopDetail(res);
      }
      setIsBankModalOpen(false);
      fetchShopData();
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu tài khoản ngân hàng');
    } finally {
      setSavingBank(false);
    }
  };

  // =========================================================================
  // TÍNH TOÁN CÁC CHỈ SỐ DOANH THU & QUYẾT TOÁN CỐT LÕI
  // =========================================================================
  const {
    grossRevenue,
    netRevenue,
    totalFee,
    totalOrdersCount,
    completedOrdersCount,
    processingOrdersCount,
    cancelledOrdersCount,
    averageOrderValue,
    totalHoldingAmount,
    totalReadyAmount,
    totalPaidOutAmount,
    unsettledAmount,
    unsettledCount,
    paidOutCount,
    allOrders
  } = useMemo(() => {
    const ordersList = payoutSummary?.orders || payoutSummary?.payoutOrders || [];
    
    // GMV & Doanh thu
    let gmv = Number(revenueData?.grossMerchandiseValue || summary?.totalRevenue || 0);
    let net = Number(revenueData?.totalRevenue || summary?.totalRevenue || 0);
    let fee = Number(revenueData?.totalPlatformFee || (net * 0.025) || 0);

    // Nếu gmv nhỏ hơn net thì gmv = net / 0.975
    if (gmv <= net && net > 0) {
      gmv = Math.round(net / 0.975);
      fee = gmv - net;
    }

    // Đơn hàng
    const totalOrders = Number(revenueData?.totalOrders || summary?.totalOrders || ordersList.length || 0);
    const completedOrders = Number(revenueData?.completedOrders || summary?.deliveredOrders || 0);
    const processingOrders = Number(revenueData?.processingOrders || summary?.processingOrders || 0);
    const cancelledOrders = Number(revenueData?.cancelledOrders || summary?.cancelledOrders || 0);
    const aov = totalOrders > 0 ? Math.round(gmv / totalOrders) : (Number(revenueData?.averageOrderValue) || 0);

    // Tiến độ quyết toán Escrow
    const holdingAmt = Number(payoutSummary?.totalHoldingAmount || 0);
    const readyAmt = Number(payoutSummary?.totalReadyAmount || 0);
    const paidAmt = Number(payoutSummary?.totalPaidOutAmount || 0);

    let unAmt = holdingAmt + readyAmt;
    let unCount = Number(payoutSummary?.totalHoldingCount || 0) + Number(payoutSummary?.totalReadyCount || 0);
    const pCount = Number(payoutSummary?.totalPaidOutCount || 0);

    // Trường hợp shop có doanh thu thực nhận nhưng Admin chưa tạo lệnh/chưa thanh toán
    if (unAmt === 0 && paidAmt === 0 && net > 0) {
      unAmt = net;
      unCount = completedOrders || totalOrders || 1;
    }

    return {
      grossRevenue: gmv,
      netRevenue: net,
      totalFee: fee,
      totalOrdersCount: totalOrders,
      completedOrdersCount: completedOrders,
      processingOrdersCount: processingOrders,
      cancelledOrdersCount: cancelledOrders,
      averageOrderValue: aov,
      totalHoldingAmount: holdingAmt,
      totalReadyAmount: readyAmt,
      totalPaidOutAmount: paidAmt,
      unsettledAmount: unAmt,
      unsettledCount: unCount,
      paidOutCount: pCount,
      allOrders: ordersList
    };
  }, [summary, revenueData, payoutSummary]);

  // =========================================================================
  // TỔNG HỢP SỐ LIỆU THEO CHU KỲ: THEO NGÀY / THEO THÁNG / THEO QUÝ / THEO NĂM
  // =========================================================================
  const periodicData = useMemo(() => {
    // 1. THEO NGÀY (7 ngày gần nhất)
    if (reportCycle === 'day') {
      if (revenueData?.dailyRevenues && revenueData.dailyRevenues.length > 0) {
        return revenueData.dailyRevenues.map(d => {
          const rev = Number(d.revenue) || 0;
          const gmv = Math.round(rev / 0.975);
          const fee = gmv - rev;
          // Ước tính phần chưa quyết toán theo tỷ lệ
          const unsettledRatio = netRevenue > 0 ? (unsettledAmount / netRevenue) : 1;
          const unAmt = Math.round(rev * unsettledRatio);
          const paidAmt = rev - unAmt;
          return {
            label: d.date,
            subLabel: `${d.orderCount || 0} đơn`,
            orders: d.orderCount || 0,
            gmv: gmv,
            fee: fee,
            netRevenue: rev,
            paidOut: paidAmt,
            unsettled: unAmt,
            settlementStatus: unAmt > 0 ? (paidAmt > 0 ? 'Đang quyết toán' : 'Chưa quyết toán') : 'Đã quyết toán'
          };
        });
      }

      // Mặc định tạo 7 ngày gần nhất nếu chưa có dailyRevenues
      const days = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const isToday = i === 0;
        const dayOrders = isToday ? completedOrdersCount : 0;
        const dayNet = isToday ? netRevenue : 0;
        const dayGmv = isToday ? grossRevenue : 0;
        const dayFee = isToday ? totalFee : 0;
        const dayUnsettled = isToday ? unsettledAmount : 0;
        const dayPaid = isToday ? totalPaidOutAmount : 0;

        days.push({
          label: dateStr,
          subLabel: `${dayOrders} đơn`,
          orders: dayOrders,
          gmv: dayGmv,
          fee: dayFee,
          netRevenue: dayNet,
          paidOut: dayPaid,
          unsettled: dayUnsettled,
          settlementStatus: dayUnsettled > 0 ? 'Chưa quyết toán' : (dayNet > 0 ? 'Đã quyết toán' : 'Không có đơn')
        });
      }
      return days;
    }

    // 2. THEO THÁNG (12 tháng của năm được chọn)
    if (reportCycle === 'month') {
      const currentMonthIndex = new Date().getMonth(); // 0 - 11
      const isCurrentYear = selectedYear === new Date().getFullYear();

      const months = [];
      for (let m = 0; m < 12; m++) {
        const monthNum = m + 1;
        const monthLabel = `Tháng ${monthNum < 10 ? '0' + monthNum : monthNum}/${selectedYear}`;
        
        // Lọc các đơn hàng trong tháng này nếu allOrders có dữ liệu
        const matchedOrders = allOrders.filter(ord => {
          if (!ord.createdAt) return false;
          const orderDate = new Date(ord.createdAt);
          return orderDate.getFullYear() === selectedYear && orderDate.getMonth() === m;
        });

        let monthGmv = 0;
        let monthFee = 0;
        let monthNet = 0;
        let monthPaid = 0;
        let monthUnsettled = 0;
        let monthOrders = matchedOrders.length;

        if (matchedOrders.length > 0) {
          matchedOrders.forEach(ord => {
            const pAmt = Number(ord.productAmount || ord.totalAmount || 0);
            const pFee = Number(ord.platformFee || (pAmt * 0.025) || 0);
            const pPayout = Number(ord.shopPayoutAmount || (pAmt - pFee) || 0);
            monthGmv += pAmt;
            monthFee += pFee;
            monthNet += pPayout;
            if (ord.shopPayoutStatus === 'PAID_OUT') {
              monthPaid += pPayout;
            } else {
              monthUnsettled += pPayout;
            }
          });
        } else if (isCurrentYear && m === currentMonthIndex) {
          // Phân bổ dữ liệu hiện tại vào tháng hiện hành nếu không có mảng chi tiết
          monthGmv = grossRevenue;
          monthFee = totalFee;
          monthNet = netRevenue;
          monthPaid = totalPaidOutAmount;
          monthUnsettled = unsettledAmount;
          monthOrders = totalOrdersCount;
        }

        months.push({
          label: `Tháng ${monthNum < 10 ? '0' + monthNum : monthNum}`,
          fullLabel: monthLabel,
          subLabel: `${monthOrders} đơn`,
          orders: monthOrders,
          gmv: monthGmv,
          fee: monthFee,
          netRevenue: monthNet,
          paidOut: monthPaid,
          unsettled: monthUnsettled,
          settlementStatus: monthNet === 0 ? 'Không có đơn' : (monthUnsettled === 0 ? 'Đã quyết toán' : (monthPaid > 0 ? 'Quyết toán 1 phần' : 'Chưa quyết toán'))
        });
      }
      return months;
    }

    // 3. THEO QUÝ (4 Quý: Q1, Q2, Q3, Q4)
    if (reportCycle === 'quarter') {
      const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
      const isCurrentYear = selectedYear === new Date().getFullYear();

      const quarters = [
        { q: 1, name: 'Quý 1', range: 'Tháng 1 - Tháng 3', startM: 0, endM: 2 },
        { q: 2, name: 'Quý 2', range: 'Tháng 4 - Tháng 6', startM: 3, endM: 5 },
        { q: 3, name: 'Quý 3', range: 'Tháng 7 - Tháng 9', startM: 6, endM: 8 },
        { q: 4, name: 'Quý 4', range: 'Tháng 10 - Tháng 12', startM: 9, endM: 11 }
      ];

      return quarters.map(q => {
        const matchedOrders = allOrders.filter(ord => {
          if (!ord.createdAt) return false;
          const orderDate = new Date(ord.createdAt);
          const m = orderDate.getMonth();
          return orderDate.getFullYear() === selectedYear && m >= q.startM && m <= q.endM;
        });

        let qGmv = 0;
        let qFee = 0;
        let qNet = 0;
        let qPaid = 0;
        let qUnsettled = 0;
        let qOrders = matchedOrders.length;

        if (matchedOrders.length > 0) {
          matchedOrders.forEach(ord => {
            const pAmt = Number(ord.productAmount || ord.totalAmount || 0);
            const pFee = Number(ord.platformFee || (pAmt * 0.025) || 0);
            const pPayout = Number(ord.shopPayoutAmount || (pAmt - pFee) || 0);
            qGmv += pAmt;
            qFee += pFee;
            qNet += pPayout;
            if (ord.shopPayoutStatus === 'PAID_OUT') {
              qPaid += pPayout;
            } else {
              qUnsettled += pPayout;
            }
          });
        } else if (isCurrentYear && q.q === currentQuarter) {
          qGmv = grossRevenue;
          qFee = totalFee;
          qNet = netRevenue;
          qPaid = totalPaidOutAmount;
          qUnsettled = unsettledAmount;
          qOrders = totalOrdersCount;
        }

        return {
          label: `${q.name}`,
          fullLabel: `${q.name}/${selectedYear} (${q.range})`,
          subLabel: `${qOrders} đơn`,
          orders: qOrders,
          gmv: qGmv,
          fee: qFee,
          netRevenue: qNet,
          paidOut: qPaid,
          unsettled: qUnsettled,
          settlementStatus: qNet === 0 ? 'Không có đơn' : (qUnsettled === 0 ? 'Đã quyết toán' : (qPaid > 0 ? 'Quyết toán 1 phần' : 'Chưa quyết toán'))
        };
      });
    }

    // 4. THEO NĂM (Các năm 2024, 2025, 2026)
    if (reportCycle === 'year') {
      const years = [2024, 2025, 2026];
      return years.map(yr => {
        const isThisYear = yr === new Date().getFullYear();
        const matchedOrders = allOrders.filter(ord => {
          if (!ord.createdAt) return false;
          return new Date(ord.createdAt).getFullYear() === yr;
        });

        let yGmv = 0;
        let yFee = 0;
        let yNet = 0;
        let yPaid = 0;
        let yUnsettled = 0;
        let yOrders = matchedOrders.length;

        if (matchedOrders.length > 0) {
          matchedOrders.forEach(ord => {
            const pAmt = Number(ord.productAmount || ord.totalAmount || 0);
            const pFee = Number(ord.platformFee || (pAmt * 0.025) || 0);
            const pPayout = Number(ord.shopPayoutAmount || (pAmt - pFee) || 0);
            yGmv += pAmt;
            yFee += pFee;
            yNet += pPayout;
            if (ord.shopPayoutStatus === 'PAID_OUT') {
              yPaid += pPayout;
            } else {
              yUnsettled += pPayout;
            }
          });
        } else if (isThisYear) {
          yGmv = grossRevenue;
          yFee = totalFee;
          yNet = netRevenue;
          yPaid = totalPaidOutAmount;
          yUnsettled = unsettledAmount;
          yOrders = totalOrdersCount;
        }

        return {
          label: `Năm ${yr}`,
          fullLabel: `Năm ${yr}`,
          subLabel: `${yOrders} đơn`,
          orders: yOrders,
          gmv: yGmv,
          fee: yFee,
          netRevenue: yNet,
          paidOut: yPaid,
          unsettled: yUnsettled,
          settlementStatus: yNet === 0 ? 'Chưa có đơn' : (yUnsettled === 0 ? 'Đã quyết toán' : 'Chưa quyết toán')
        };
      });
    }

    return [];
  }, [reportCycle, selectedYear, revenueData, summary, grossRevenue, netRevenue, totalFee, unsettledAmount, totalPaidOutAmount, totalOrdersCount, completedOrdersCount, allOrders]);

  // Giá trị max để tính chiều cao cột biểu đồ
  const maxBarValue = useMemo(() => {
    const maxVal = Math.max(...periodicData.map(d => d.netRevenue || d.gmv || 0), 100000);
    return maxVal;
  }, [periodicData]);

  // Tổng hợp dòng footer của bảng báo cáo
  const tableTotals = useMemo(() => {
    return periodicData.reduce((acc, curr) => {
      acc.orders += curr.orders || 0;
      acc.gmv += curr.gmv || 0;
      acc.fee += curr.fee || 0;
      acc.netRevenue += curr.netRevenue || 0;
      acc.paidOut += curr.paidOut || 0;
      acc.unsettled += curr.unsettled || 0;
      return acc;
    }, { orders: 0, gmv: 0, fee: 0, netRevenue: 0, paidOut: 0, unsettled: 0 });
  }, [periodicData]);

  return (
    <div className="admin-content-card" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
      {/* =================================================================== */}
      {/* 1. HEADER BÁO CÁO DOANH THU CỬA HÀNG */}
      {/* =================================================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.28rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Báo cáo Doanh thu & Thống kê Cửa hàng
              </h2>
              <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                Cửa hàng: <strong style={{ color: '#059669' }}>{shopName || `Shop #${shopId}`}</strong> • Phân tích doanh thu chuyên sâu theo Tháng / Quý / Năm & theo dõi quyết toán Escrow
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => setIsBankModalOpen(true)}
            style={{
              background: '#f8fafc',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Landmark size={15} /> Cài đặt STK nhận tiền
          </button>

          <button
            type="button"
            onClick={fetchShopData}
            className="admin-btn-refresh"
            style={{
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)'
            }}
            title="Làm mới toàn bộ số liệu thống kê doanh thu"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. BANNER CHÍNH SÁCH QUYẾT TOÁN ĐỊNH KỲ VÀ THÔNG TIN STK */}
      {/* =================================================================== */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1px solid #a7f3d0',
        borderRadius: '12px',
        padding: '0.9rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#d1fae5', padding: '6px', borderRadius: '8px', color: '#059669', display: 'flex' }}>
            <Calendar size={18} />
          </div>
          <div style={{ fontSize: '0.84rem', color: '#065f46', lineHeight: 1.5 }}>
            <strong>Chính sách quyết toán định kỳ Sàn Cyber Shop:</strong> Doanh thu được chốt đối soát vào <strong>ngày 19 hàng tháng</strong> (Hạn giải ngân: <strong>2 ngày</strong>, chậm nhất ngày 21). Mức phí sàn tự động trích trừ: <strong>2.5%</strong> trên doanh số sản phẩm.
          </div>
        </div>
        <div style={{ fontSize: '0.82rem', color: '#047857', background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Landmark size={15} color="#059669" />
          <span>STK nhận tiền: <strong>{shopDetail?.bankName || bankName}</strong> - <strong>{shopDetail?.bankAccountNumber || bankAccountNumber}</strong> ({shopDetail?.bankAccountName || bankAccountName})</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. 4 THẺ KPI CHÍNH (GRADIENT CAO CẤP NHƯ ADMIN) */}
      {/* =================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1rem',
        marginTop: '1.25rem'
      }}>
        {/* Card 1: Doanh thu thực nhận của Shop */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          color: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.22)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Doanh thu thực nhận (97.5%)
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                {formatVND(netRevenue)}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.55rem', borderRadius: '10px' }}>
              <TrendingUp size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ✓ Thu nhập thực tế của shop sau khi trừ 2.5% phí sàn
          </div>
        </div>

        {/* Card 2: Tổng giá trị GMV tiền hàng */}
        <div style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          color: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.22)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tổng doanh số bán ra (GMV)
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                {formatVND(grossRevenue)}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.55rem', borderRadius: '10px' }}>
              <DollarSign size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            📊 Toàn bộ giá trị sản phẩm khách hàng đã đặt mua
          </div>
        </div>

        {/* Card 3: Tổng đơn hàng */}
        <div style={{
          background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
          color: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 4px 14px rgba(217, 119, 6, 0.22)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tổng đơn hàng Cửa hàng
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                {totalOrdersCount} <span style={{ fontSize: '1rem', fontWeight: 600 }}>đơn</span>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.55rem', borderRadius: '10px' }}>
              <ShoppingBag size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.76rem', opacity: 0.95, marginTop: '0.75rem' }}>
            {completedOrdersCount} hoàn tất • {processingOrdersCount} đang xử lý • {cancelledOrdersCount} đã hủy
          </div>
        </div>

        {/* Card 4: Giá trị trung bình đơn AOV */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          color: '#fff',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 4px 14px rgba(124, 58, 237, 0.22)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Giá trị TB / đơn (AOV)
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                {formatVND(averageOrderValue)}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.55rem', borderRadius: '10px' }}>
              <CreditCard size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ⚡ Mức chi tiêu trung bình trên mỗi giao dịch của shop
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. KHỐI ĐỐI SOÁT & DOANH THU CHƯA QUYẾT TOÁN (TÂM ĐIỂM THEO YÊU CẦU) */}
      {/* =================================================================== */}
      <div style={{
        marginTop: '1.25rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={20} color="#ea580c" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Tình trạng Đối soát & Quyết toán Tiền hàng từ Admin Sàn
            </h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#ffffff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            Cơ chế bảo vệ Escrow PayOS & Giải ngân tự động
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Card A: DOANH THU CHƯA QUYẾT TOÁN (NỔI BẬT NHẤT) */}
          <div style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
            border: '2px solid #fdba74',
            borderRadius: '12px',
            padding: '1.2rem',
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.1)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c2410c', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <Clock size={16} /> DOANH THU CHƯA QUYẾT TOÁN
              </div>
              <span style={{
                background: '#ea580c',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                Chờ Admin giải ngân
              </span>
            </div>

            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#c2410c', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
              {formatVND(unsettledAmount)}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#9a3412', marginTop: '0.4rem', lineHeight: 1.45, fontWeight: 500 }}>
              Tiền hàng đã bán ({unsettledCount} đơn) nhưng <strong>chưa được Admin web quyết toán chuyển khoản</strong> về STK ngân hàng của bạn.
            </div>

            <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed #fdba74', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#7c2d12' }}>
              <span>• Đang giao (Tạm giữ Escrow): <strong>{formatVND(totalHoldingAmount)}</strong></span>
              <span>• Khách đã nhận (Chờ chi): <strong>{formatVND(totalReadyAmount || (unsettledAmount - totalHoldingAmount))}</strong></span>
            </div>
          </div>

          {/* Card B: DOANH THU ĐÃ QUYẾT TOÁN (ĐÃ VỀ TÀI KHOẢN NGÂN HÀNG) */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #86efac',
            borderRadius: '12px',
            padding: '1.2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <CheckCircle2 size={16} /> DOANH THU ĐÃ QUYẾT TOÁN
              </div>
              <span style={{
                background: '#16a34a',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                Đã về STK ngân hàng
              </span>
            </div>

            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803d', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
              {formatVND(totalPaidOutAmount)}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '0.4rem', lineHeight: 1.45 }}>
              Số tiền Admin đã chuyển khoản thành công về số tài khoản của bạn ({paidOutCount} đơn hoàn tất chuyển khoản).
            </div>

            <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed #86efac', fontSize: '0.75rem', color: '#14532d' }}>
              ✓ STK nhận: <strong>{shopDetail?.bankAccountNumber || bankAccountNumber} ({shopDetail?.bankName || bankName})</strong>
            </div>
          </div>

          {/* Card C: PHÍ DỊCH VỤ SÀN TRÍCH TRỪ (2.5%) */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            border: '1px solid #93c5fd',
            borderRadius: '12px',
            padding: '1.2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1d4ed8', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <BadgePercent size={16} /> PHÍ DỊCH VỤ SÀN CYBER (2.5%)
              </div>
              <span style={{
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                Khấu trừ tự động
              </span>
            </div>

            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
              {formatVND(totalFee)}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#1e40af', marginTop: '0.4rem', lineHeight: 1.45 }}>
              Chi phí nền tảng hỗ trợ cổng thanh toán trực tuyến, hạ tầng máy chủ và chính sách bảo vệ người bán.
            </div>

            <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed #93c5fd', fontSize: '0.75rem', color: '#1e3a8a' }}>
              ⚡ Tỷ lệ khấu trừ cố định: <strong>2.5%</strong> trên mỗi sản phẩm bán ra
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. BỘ LỌC CHU KỲ BÁO CÁO: THEO NGÀY / THEO THÁNG / THEO QUÝ / THEO NĂM */}
      {/* =================================================================== */}
      <div style={{
        marginTop: '1.5rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
            <Filter size={16} color="#059669" />
            <span>Chu kỳ thống kê:</span>
          </div>

          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setReportCycle('day')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: reportCycle === 'day' ? '#ffffff' : 'transparent',
                color: reportCycle === 'day' ? '#059669' : '#64748b',
                boxShadow: reportCycle === 'day' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Theo Ngày (7 ngày)
            </button>

            <button
              type="button"
              onClick={() => setReportCycle('month')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: reportCycle === 'month' ? '#ffffff' : 'transparent',
                color: reportCycle === 'month' ? '#059669' : '#64748b',
                boxShadow: reportCycle === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Theo Tháng (12 tháng)
            </button>

            <button
              type="button"
              onClick={() => setReportCycle('quarter')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: reportCycle === 'quarter' ? '#ffffff' : 'transparent',
                color: reportCycle === 'quarter' ? '#059669' : '#64748b',
                boxShadow: reportCycle === 'quarter' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Theo Quý (4 quý)
            </button>

            <button
              type="button"
              onClick={() => setReportCycle('year')}
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: reportCycle === 'year' ? '#ffffff' : 'transparent',
                color: reportCycle === 'year' ? '#059669' : '#64748b',
                boxShadow: reportCycle === 'year' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Theo Năm
            </button>
          </div>
        </div>

        {/* Bộ chọn Năm */}
        {reportCycle !== 'year' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Năm báo cáo:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#1e293b',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={2026}>Năm 2026</option>
              <option value={2025}>Năm 2025</option>
              <option value={2024}>Năm 2024</option>
            </select>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 6. BIỂU ĐỒ CỘT TRỰC QUAN DOANH THU THEO KỲ CHỌN */}
      {/* =================================================================== */}
      <div style={{
        marginTop: '1.25rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color="#059669" />
            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
              Biểu đồ Doanh thu {reportCycle === 'day' ? '7 ngày gần nhất' : reportCycle === 'month' ? `12 Tháng năm ${selectedYear}` : reportCycle === 'quarter' ? `4 Quý năm ${selectedYear}` : 'theo các Năm'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }}></span>
              Doanh thu thực nhận
            </span>
            <span>Đơn vị: VNĐ</span>
          </div>
        </div>

        {periodicData.length > 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: reportCycle === 'month' ? '8px' : '16px',
            height: '180px',
            paddingTop: '25px',
            borderBottom: '1px solid #cbd5e1',
            overflowX: 'auto'
          }}>
            {periodicData.map((item, idx) => {
              const val = Number(item.netRevenue) || 0;
              const heightPct = Math.min(100, Math.max(12, (val / maxBarValue) * 100));
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    minWidth: reportCycle === 'month' ? '45px' : '65px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end'
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: val > 0 ? '#059669' : '#94a3b8', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                    {val > 0 ? (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`) : '0'}
                  </div>
                  <div
                    title={`${item.fullLabel || item.label}: GMV ${formatVND(item.gmv)} | Thực nhận: ${formatVND(item.netRevenue)} | Chưa quyết toán: ${formatVND(item.unsettled)} (${item.orders} đơn)`}
                    style={{
                      width: '75%',
                      maxWidth: '44px',
                      height: `${heightPct}%`,
                      background: val > 0 ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.35s ease',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', marginTop: '6px', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {item.orders} đơn
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            Không có dữ liệu trong chu kỳ này.
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 7. BẢNG BÁO CÁO THỐNG KÊ CHI TIẾT THEO KỲ (CÓ CỘT CHƯA QUYẾT TOÁN) */}
      {/* =================================================================== */}
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <FileText size={18} color="#059669" />
            Bảng Thống kê Doanh thu & Phân bổ Quyết toán Chi tiết ({reportCycle === 'day' ? 'Theo Ngày' : reportCycle === 'month' ? `Theo Tháng (Năm ${selectedYear})` : reportCycle === 'quarter' ? `Theo Quý (Năm ${selectedYear})` : 'Theo Từng Năm'})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Tổng cộng: <strong>{periodicData.length}</strong> kỳ thống kê
          </span>
        </div>

        <div className="admin-table-wrapper" style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>Kỳ Báo Cáo</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155', textAlign: 'center' }}>Số Đơn</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155', textAlign: 'right' }}>Tổng Doanh Số (GMV)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155', textAlign: 'right' }}>Phí Sàn (2.5%)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#059669', textAlign: 'right' }}>Thực Nhận (97.5%)</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#15803d', textAlign: 'right' }}>Đã Quyết Toán</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#c2410c', textAlign: 'right', background: '#fff7ed' }}>Chưa Quyết Toán</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#334155', textAlign: 'center' }}>Trạng Thái Quyết Toán</th>
              </tr>
            </thead>
            <tbody>
              {periodicData.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                    {row.fullLabel || row.label}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: '#334155', fontWeight: 600 }}>
                    {row.orders}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e293b', fontWeight: 600 }}>
                    {formatVND(row.gmv)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                    {formatVND(row.fee)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>
                    {formatVND(row.netRevenue)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                    {formatVND(row.paidOut)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#c2410c', fontWeight: 700, background: '#fff7ed' }}>
                    {row.unsettled > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ea580c' }}></span>
                        {formatVND(row.unsettled)}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontWeight: 500 }}>0 ₫</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {row.unsettled > 0 ? (
                      <span style={{
                        background: '#ffedd5',
                        color: '#c2410c',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        ⏳ Chưa quyết toán
                      </span>
                    ) : row.netRevenue > 0 ? (
                      <span style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        ✓ Đã thanh toán
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* DÒNG TỔNG CỘNG */}
            <tfoot>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                <td style={{ padding: '12px', color: '#0f172a' }}>TỔNG CỘNG</td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#0f172a' }}>{tableTotals.orders}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#0f172a' }}>{formatVND(tableTotals.gmv)}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>{formatVND(tableTotals.fee)}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#059669', fontSize: '0.92rem' }}>{formatVND(tableTotals.netRevenue)}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#15803d' }}>{formatVND(tableTotals.paidOut)}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#c2410c', fontSize: '0.92rem', background: '#ffedd5' }}>
                  {formatVND(tableTotals.unsettled)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {tableTotals.unsettled > 0 ? (
                    <span style={{ color: '#c2410c', fontSize: '0.78rem', fontWeight: 700 }}>
                      Chờ duyệt: {formatVND(tableTotals.unsettled)}
                    </span>
                  ) : (
                    <span style={{ color: '#15803d', fontSize: '0.78rem' }}>Hoàn tất</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 8. BẢNG TOP SẢN PHẨM BÁN CHẠY NHẤT CỦA SHOP */}
      {/* =================================================================== */}
      <div style={{ marginTop: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={18} color="#059669" />
          Top 5 Sản phẩm Bán chạy nhất của Cửa hàng
        </h3>
        {topProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Chưa có dữ liệu sản phẩm bán chạy.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topProducts.map((p, idx) => (
              <div key={p.productId || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : '#ffedd5',
                    color: idx === 0 ? '#d97706' : idx === 1 ? '#475569' : '#c2410c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem'
                  }}>
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>{p.productName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Đã bán: <strong>{p.totalSold || 0}</strong> chiếc</div>
                  </div>
                </div>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>
                  {formatVND(p.totalRevenue || 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* 9. MODAL CÀI ĐẶT / CẬP NHẬT TÀI KHOẢN NGÂN HÀNG */}
      {/* =================================================================== */}
      {isBankModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Landmark size={20} color="#2563eb" />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Cài đặt Tài khoản Ngân hàng</h4>
              </div>
              <button type="button" onClick={() => setIsBankModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} style={{ padding: '1.25rem' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                Tài khoản này dùng để Admin chuyển tiền thanh toán đơn hàng (PayOS) về cho cửa hàng của bạn vào kỳ quyết toán định kỳ ngày 19 hàng tháng.
              </p>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tên Ngân hàng
                </label>
                <select
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    if (e.target.value.includes('MB')) setBankBin('970422');
                    else if (e.target.value.includes('Vietcombank')) setBankBin('970436');
                    else if (e.target.value.includes('Techcombank')) setBankBin('970407');
                    else if (e.target.value.includes('ACB')) setBankBin('970416');
                    else if (e.target.value.includes('BIDV')) setBankBin('970418');
                    else if (e.target.value.includes('VPBank')) setBankBin('970432');
                    else if (e.target.value.includes('VietinBank')) setBankBin('970415');
                    else if (e.target.value.includes('TPBank')) setBankBin('970423');
                  }}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="MB Bank (Ngân hàng Quân Đội)">MB Bank (Ngân hàng Quân Đội)</option>
                  <option value="Vietcombank (Ngoại Thương Việt Nam)">Vietcombank (Ngoại Thương Việt Nam)</option>
                  <option value="Techcombank (Kỹ Thương Việt Nam)">Techcombank (Kỹ Thương Việt Nam)</option>
                  <option value="VietinBank (Công Thương Việt Nam)">VietinBank (Công Thương Việt Nam)</option>
                  <option value="BIDV (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)">BIDV (Đầu Tư & Phát Triển)</option>
                  <option value="ACB (Á Châu)">ACB (Á Châu)</option>
                  <option value="VPBank (Việt Nam Thịnh Vượng)">VPBank (Việt Nam Thịnh Vượng)</option>
                  <option value="TPBank (Tiên Phong)">TPBank (Tiên Phong)</option>
                  <option value="Ngân hàng khác">Ngân hàng khác</option>
                </select>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Số tài khoản nhận tiền
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 8814310515"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tên chủ tài khoản (In hoa không dấu)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: HOANG THIEN SON"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                  style={{ width: '100%', height: '38px', padding: '0 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', fontWeight: 600, textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsBankModalOpen(false)}
                  style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.84rem', cursor: 'pointer', color: '#475569' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  style={{ background: '#059669', color: '#fff', border: 'none', padding: '0.45rem 1.1rem', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingBank ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
