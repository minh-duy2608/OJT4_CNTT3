import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Truck, RotateCcw, ShieldCheck, HelpCircle, FileText, Gift, CreditCard, Briefcase, Wallet } from 'lucide-react';
import './InfoPage.css';

const INFO_SECTIONS = [
  {
    path: '/shipping',
    title: 'Điều khoản giao hàng',
    icon: Truck,
    content: (
      <div>
        <h3>1. Thời gian giao hàng tiêu chuẩn</h3>
        <p>Cyber áp dụng quy trình đóng gói và vận chuyển tự động, hợp tác cùng các đơn vị vận chuyển hàng đầu Việt Nam (Viettel Post, Giao Hàng Tiết Kiệm, Shopee Xpress):</p>
        <ul>
          <li><strong>Nội thành TP. HCM & Hà Nội:</strong> Giao siêu tốc trong 2 - 4 giờ hoặc nhận hàng trong ngày.</li>
          <li><strong>Các tỉnh thành khác:</strong> Thời gian giao hàng từ 1 - 3 ngày làm việc.</li>
        </ul>
        <h3>2. Cước phí vận chuyển</h3>
        <p>Miễn phí 100% cước phí giao hàng cho tất cả đơn hàng có giá trị từ 5.000.000đ trở lên hoặc khi áp dụng mã FREESHIP.</p>
        <h3>3. Chính sách đồng kiểm</h3>
        <p>Khách hàng được quyền mở hộp kiểm tra ngoại quan sản phẩm, số lượng và tem niêm phong trước khi thanh toán cho nhân viên giao hàng.</p>
      </div>
    )
  },
  {
    path: '/returns',
    title: 'Trao đổi và trả hàng',
    icon: RotateCcw,
    content: (
      <div>
        <h3>1. Chính sách đổi trả 1 - 1 trong 30 ngày</h3>
        <p>Áp dụng đổi mới thiết bị 100% trong vòng 30 ngày đầu tiên kể từ ngày nhận hàng nếu sản phẩm phát sinh lỗi phần cứng do nhà sản xuất.</p>
        <h3>2. Điều kiện chấp nhận đổi trả</h3>
        <ul>
          <li>Sản phẩm còn nguyên hộp, đầy đủ phụ kiện và quà tặng kèm theo.</li>
          <li>Thân máy không bị trầy xước, móp méo, nứt vỡ hoặc có dấu hiệu can thiệp phần cứng trái phép.</li>
          <li>Có hóa đơn mua hàng hoặc số điện thoại đặt hàng trên hệ thống Cyber.</li>
        </ul>
        <h3>3. Quy trình hoàn tiền</h3>
        <p>Đối với đơn hàng trả lại được phê duyệt, tiền sẽ được hoàn về tài khoản ngân hàng của quý khách trong vòng 24 - 48 giờ làm việc.</p>
      </div>
    )
  },
  {
    path: '/warranty',
    title: 'Chính sách bảo hành',
    icon: ShieldCheck,
    content: (
      <div>
        <h3>1. Thời hạn bảo hành chính hãng</h3>
        <p>Tất cả sản phẩm điện thoại, máy tính bảng, laptop và thiết bị thông minh mua tại Cyber đều được hưởng chế độ bảo hành chính hãng từ 12 đến 24 tháng theo đúng tiêu chuẩn toàn cầu của hãng.</p>
        <h3>2. Địa điểm tiếp nhận bảo hành</h3>
        <p>Quý khách có thể mang sản phẩm đến trực tiếp Trung tâm bảo hành của Cyber hoặc bất kỳ Trung tâm bảo hành ủy quyền nào của Apple (CareS, TopCare), Samsung Care+, v.v. trên cả nước.</p>
      </div>
    )
  },
  {
    path: '/faq',
    title: 'Câu hỏi thường gặp (FAQ)',
    icon: HelpCircle,
    content: (
      <div>
        <h3>Q: Sản phẩm tại Cyber có phải hàng chính hãng không?</h3>
        <p>A: 100% sản phẩm phân phối bởi Cyber là hàng mới nguyên seal chính hãng, có hóa đơn VAT và bảo hành điện tử chính thống.</p>
        <h3>Q: Tôi có thể hủy đơn hàng sau khi đặt không?</h3>
        <p>A: Có. Quý khách có thể tự hủy đơn hàng trực tiếp trên trang "Đơn hàng của tôi" khi đơn hàng đang ở trạng thái "Chờ xác nhận" hoặc liên hệ tổng đài 1900 8989 để được hỗ trợ.</p>
      </div>
    )
  },
  {
    path: '/terms',
    title: 'Chính sách và điều khoản',
    icon: FileText,
    content: (
      <div>
        <h3>1. Điều khoản sử dụng dịch vụ</h3>
        <p>Khi truy cập và mua sắm tại Cyber, quý khách cam kết cung cấp thông tin chính xác phục vụ cho việc xác nhận và giao nhận hàng hóa.</p>
        <h3>2. Chính sách bảo mật thông tin</h3>
        <p>Mọi thông tin cá nhân và lịch sử mua sắm của quý khách đều được mã hóa theo chuẩn an toàn SSL/TLS, tuyệt đối không chia sẻ cho bên thứ ba vì mục đích thương mại.</p>
      </div>
    )
  },
  {
    path: '/gift-cards',
    title: 'Gift Cards (Thẻ quà tặng)',
    icon: Gift,
    content: (
      <div>
        <h3>Phiếu quà tặng công nghệ điện tử Cyber Gift</h3>
        <p>Món quà ý nghĩa dành cho người thân và bạn bè với các mệnh giá đa dạng từ 500.000đ đến 20.000.000đ. Áp dụng thanh toán cho tất cả các mặt hàng công nghệ tại website.</p>
      </div>
    )
  },
  {
    path: '/credit-payment',
    title: 'Tín dụng và thanh toán',
    icon: CreditCard,
    content: (
      <div>
        <h3>Chương trình Trả góp 0% Lãi suất</h3>
        <p>Hỗ trợ trả góp 0% qua thẻ tín dụng của hơn 25 ngân hàng liên kết (Vietcombank, Techcombank, MB, VPBank,...) với kỳ hạn linh hoạt 3, 6, 9, 12 tháng, duyệt hồ sơ online tức thì.</p>
      </div>
    )
  },
  {
    path: '/contract-services',
    title: 'Dịch vụ hợp đồng cho doanh nghiệp',
    icon: Briefcase,
    content: (
      <div>
        <h3>Giải pháp cung ứng thiết bị CNTT doanh nghiệp</h3>
        <p>Cyber cung cấp dịch vụ trang bị máy tính xách tay, thiết bị mạng và giải pháp số cho các tổ chức, doanh nghiệp với chính sách chiết khấu số lượng lớn và hợp đồng dịch vụ SLA bảo trì trọn gói.</p>
      </div>
    )
  },
  {
    path: '/crypto-wallet',
    title: 'Ví tiền điện tử & Công nghệ số',
    icon: Wallet,
    content: (
      <div>
        <h3>Tích hợp giải pháp thanh toán Web3 tương lai</h3>
        <p>Cyber đang nghiên cứu tích hợp ví số và các phương thức thanh toán không tiền mặt hiện đại nhất, nhằm mang lại trải nghiệm mua sắm công nghệ an toàn, tiện lợi và đột phá.</p>
      </div>
    )
  }
];

export const InfoPage = () => {
  const location = useLocation();

  const currentSection = useMemo(() => {
    return INFO_SECTIONS.find(s => s.path === location.pathname) || INFO_SECTIONS[0];
  }, [location.pathname]);

  const IconComponent = currentSection.icon;

  return (
    <div className="container info-page-wrapper">
      <div className="info-layout">
        {/* Sidebar điều hướng các chính sách */}
        <aside className="info-sidebar">
          <h3>Thông tin & Chính sách</h3>
          <nav className="info-nav-list">
            {INFO_SECTIONS.map((sec) => (
              <Link
                key={sec.path}
                to={sec.path}
                className={`info-nav-item ${location.pathname === sec.path ? 'is-active' : ''}`}
              >
                <sec.icon size={18} />
                <span>{sec.title}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Nội dung chi tiết */}
        <main className="info-main-content">
          <div className="info-header">
            <div className="info-header-icon">
              <IconComponent size={24} />
            </div>
            <h1>{currentSection.title}</h1>
          </div>

          <div className="info-body">
            {currentSection.content}
          </div>
        </main>
      </div>
    </div>
  );
};
