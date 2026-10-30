import iphone14Img from '../assets/products/iphone-14-pro.png';
import cameraImg from '../assets/products/blackmagic-camera.png';
import appleWatchImg from '../assets/products/apple-watch.png';
import airpodsMaxImg from '../assets/products/airpods-max.png';
import galaxyWatchImg from '../assets/products/galaxy-watch.png';
import galaxyFoldImg from '../assets/products/galaxy-fold.png';
import galaxyBudsImg from '../assets/products/galaxy-buds.png';
import ipad9Img from '../assets/products/ipad-9.png';

// Hàm định dạng tiền tệ Việt Nam Đồng chuẩn
export const formatVND = (amount) => {
  if (typeof amount !== 'number') return '0₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount).replace('₫', '').trim() + '₫';
};

// ==========================================================================
// 1. DANH SÁCH 8 SẢN PHẨM CHÍNH (CHUẨN 100% THEO FILE FIGMA - TẦNG PRODUCTS)
// ==========================================================================
export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Apple iPhone 14 Pro Max 128GB Deep Purple',
    price: 22990000,
    originalPrice: 25990000,
    formattedPrice: '22.990.000₫',
    formattedOriginalPrice: '25.990.000₫',
    category: 'phones',
    tag: 'new',
    isLiked: false,
    image: iphone14Img,
    description: 'Dynamic Island, màn hình Always-On 6.7 inch Super Retina XDR với ProMotion, camera chính 48MP và chip A16 Bionic mạnh mẽ.'
  },
  {
    id: 'prod-2',
    name: 'Blackmagic Pocket Cinema Camera 6k',
    price: 64990000,
    originalPrice: 71990000,
    formattedPrice: '64.990.000₫',
    formattedOriginalPrice: '71.990.000₫',
    category: 'cameras',
    tag: 'bestseller',
    isLiked: false,
    image: cameraImg,
    description: 'Máy quay điện ảnh cảm biến Super 35 HDR độ phân giải 6144 x 3456, ISO kép lên tới 25,600 và ngàm EF linh hoạt.'
  },
  {
    id: 'prod-3',
    name: 'Apple Watch Series 9 GPS 41mm Starlight Aluminium',
    price: 9990000,
    originalPrice: 11490000,
    formattedPrice: '9.990.000₫',
    formattedOriginalPrice: '11.490.000₫',
    category: 'smartwatches',
    tag: 'featured',
    isLiked: false,
    image: appleWatchImg,
    description: 'Chip S9 SiP đột phá, thao tác chạm hai lần Double Tap kỳ diệu, màn hình sáng gấp đôi và theo dõi sức khỏe chuyên sâu.'
  },
  {
    id: 'prod-4',
    name: 'AirPods Max Silver',
    price: 13990000,
    originalPrice: 15990000,
    formattedPrice: '13.990.000₫',
    formattedOriginalPrice: '15.990.000₫',
    category: 'headphones',
    tag: 'new',
    isLiked: false,
    image: airpodsMaxImg,
    description: 'Âm thanh độ trung thực cao, Chống Ồn Chủ Động hàng đầu với chế độ Xuyên Âm và Spatial Audio sống động như rạp hát.'
  },
  {
    id: 'prod-5',
    name: 'Samsung Galaxy Watch6 Classic 47mm Black',
    price: 8990000,
    originalPrice: 9990000,
    formattedPrice: '8.990.000₫',
    formattedOriginalPrice: '9.990.000₫',
    category: 'smartwatches',
    tag: 'bestseller',
    isLiked: false,
    image: galaxyWatchImg,
    description: 'Viền xoay vật lý cổ điển, theo dõi giấc ngủ nâng cao và đo thành phần cơ thể BIA chuẩn y tế.'
  },
  {
    id: 'prod-6',
    name: 'Galaxy Z Fold5 Unlocked | 256GB | Phantom Black',
    price: 41990000,
    originalPrice: 46990000,
    formattedPrice: '41.990.000₫',
    formattedOriginalPrice: '46.990.000₫',
    category: 'phones',
    tag: 'featured',
    isLiked: true, // Trái tim đỏ theo đúng thiết kế Figma
    image: galaxyFoldImg,
    description: 'Màn hình gập Dynamic AMOLED 2X 7.6 inch, bản lề Flex mỏng gọn không khe hở và đa nhiệm máy tính bảng đỉnh cao.'
  },
  {
    id: 'prod-7',
    name: 'Galaxy Buds FE Graphite',
    price: 1990000,
    originalPrice: 2490000,
    formattedPrice: '1.990.000₫',
    formattedOriginalPrice: '2.490.000₫',
    category: 'headphones',
    tag: 'new',
    isLiked: false,
    image: galaxyBudsImg,
    description: 'Thiết kế wingtip công thái học ôm khít tai, chống ồn chủ động ANC mạnh mẽ và âm trầm sâu lắng.'
  },
  {
    id: 'prod-8',
    name: 'Apple iPad 9 10.2" 64GB Wi-Fi Silver (MK2L3) 2021',
    price: 7990000,
    originalPrice: 8990000,
    formattedPrice: '7.990.000₫',
    formattedOriginalPrice: '8.990.000₫',
    category: 'laptops',
    tag: 'bestseller',
    isLiked: false,
    image: ipad9Img,
    description: 'Màn hình Retina 10.2 inch với công nghệ True Tone, chip A13 Bionic và camera trước 12MP Ultra Wide với Center Stage.'
  },

  // --- TRANG 2: CÁC PHIÊN BẢN MỞ RỘNG ---
  {
    id: 'prod-9',
    name: 'Apple iPhone 14 Pro Max 256GB Space Black',
    price: 25490000,
    originalPrice: 28490000,
    formattedPrice: '25.490.000₫',
    formattedOriginalPrice: '28.490.000₫',
    category: 'phones',
    tag: 'new',
    isLiked: true,
    image: iphone14Img,
    description: 'Phiên bản dung lượng 256GB màu Space Black lịch lãm, camera 48MP ProRAW sắc nét và pin dùng cả ngày dài.'
  },
  {
    id: 'prod-10',
    name: 'Blackmagic Cinema Camera 6K Full Frame',
    price: 78990000,
    originalPrice: 85990000,
    formattedPrice: '78.990.000₫',
    formattedOriginalPrice: '85.990.000₫',
    category: 'cameras',
    tag: 'featured',
    isLiked: false,
    image: cameraImg,
    description: 'Cảm biến Full Frame 6K cao cấp, ngàm L-Mount hiện đại và hỗ trợ ghi định dạng Blackmagic RAW trực tiếp lên SSD.'
  },
  {
    id: 'prod-11',
    name: 'Apple Watch Series 9 GPS 45mm Midnight Aluminium',
    price: 10990000,
    originalPrice: 12490000,
    formattedPrice: '10.990.000₫',
    formattedOriginalPrice: '12.490.000₫',
    category: 'smartwatches',
    tag: 'bestseller',
    isLiked: false,
    image: appleWatchImg,
    description: 'Kích thước mặt lớn 45mm Midnight nam tính, đo nhịp tim điện tâm đồ ECG và sạc nhanh siêu tốc.'
  },
  {
    id: 'prod-12',
    name: 'AirPods Max Space Gray',
    price: 13990000,
    originalPrice: 15990000,
    formattedPrice: '13.990.000₫',
    formattedOriginalPrice: '15.990.000₫',
    category: 'headphones',
    tag: 'featured',
    isLiked: true,
    image: airpodsMaxImg,
    description: 'Màu xám không gian sang trọng, đệm tai dạng lưới thoáng khí và chip Apple H1 tối ưu âm thanh đỉnh cao.'
  },
  {
    id: 'prod-13',
    name: 'Samsung Galaxy Watch6 Classic 43mm Silver',
    price: 7990000,
    originalPrice: 8990000,
    formattedPrice: '7.990.000₫',
    formattedOriginalPrice: '8.990.000₫',
    category: 'smartwatches',
    tag: 'new',
    isLiked: false,
    image: galaxyWatchImg,
    description: 'Màu bạc thanh lịch với kích thước mặt 43mm vừa vặn cổ tay, mặt kính Sapphire chống trầy xước.'
  },
  {
    id: 'prod-14',
    name: 'Galaxy Z Fold5 Unlocked | 512GB | Icy Blue',
    price: 45990000,
    originalPrice: 50990000,
    formattedPrice: '45.990.000₫',
    formattedOriginalPrice: '50.990.000₫',
    category: 'phones',
    tag: 'bestseller',
    isLiked: false,
    image: galaxyFoldImg,
    description: 'Màu Xanh Icy Blue độc quyền, dung lượng lưu trữ khổng lồ 512GB tha hồ lưu video 4K và tài liệu công việc.'
  },
  {
    id: 'prod-15',
    name: 'Galaxy Buds FE White Edition',
    price: 1990000,
    originalPrice: 2490000,
    formattedPrice: '1.990.000₫',
    formattedOriginalPrice: '2.490.000₫',
    category: 'headphones',
    tag: 'new',
    isLiked: false,
    image: galaxyBudsImg,
    description: 'Phiên bản màu trắng tinh khôi, hỗ trợ kết nối liền mạch Auto Switch và thời lượng pin lên đến 30 giờ.'
  },
  {
    id: 'prod-16',
    name: 'Apple iPad 9 10.2" 256GB Wi-Fi Space Gray',
    price: 11490000,
    originalPrice: 12990000,
    formattedPrice: '11.490.000₫',
    formattedOriginalPrice: '12.990.000₫',
    category: 'laptops',
    tag: 'featured',
    isLiked: false,
    image: ipad9Img,
    description: 'Bộ nhớ dung lượng 256GB rộng rãi cho học tập và đồ họa, hỗ trợ Apple Pencil và Smart Keyboard tiện ích.'
  }
];

// ==========================================================================
// 2. DANH SÁCH 4 SẢN PHẨM GIẢM GIÁ (CHUẨN FIGMA: TẦNG "DISCOUNT PRODUCTS")
// ==========================================================================
export const DISCOUNT_PRODUCTS = [
  {
    id: 'disc-1',
    name: 'Apple iPhone 14 Pro 512GB Gold (MQ223)',
    price: 34990000,
    originalPrice: 38990000,
    formattedPrice: '34.990.000₫',
    formattedOriginalPrice: '38.990.000₫',
    category: 'phones',
    tag: 'discount',
    isLiked: false,
    image: iphone14Img,
    description: 'Phiên bản Vàng Gold quý phái dung lượng 512GB, camera 48MP ProRAW sắc nét và Dynamic Island linh hoạt.'
  },
  {
    id: 'disc-2',
    name: 'AirPods Max Silver',
    price: 13990000,
    originalPrice: 15990000,
    formattedPrice: '13.990.000₫',
    formattedOriginalPrice: '15.990.000₫',
    category: 'headphones',
    tag: 'discount',
    isLiked: false,
    image: airpodsMaxImg,
    description: 'Âm thanh độ trung thực cao, Chống Ồn Chủ Động hàng đầu với Spatial Audio sống động như rạp hát.'
  },
  {
    id: 'disc-3',
    name: 'Apple Watch Series 9 GPS 41mm Starlight Aluminium',
    price: 9990000,
    originalPrice: 11490000,
    formattedPrice: '9.990.000₫',
    formattedOriginalPrice: '11.490.000₫',
    category: 'smartwatches',
    tag: 'discount',
    isLiked: false,
    image: appleWatchImg,
    description: 'Chip S9 SiP tiên tiến, thao tác chạm hai lần Double Tap kỳ diệu và màn hình sáng rực rỡ theo dõi sức khỏe chuyên sâu.'
  },
  {
    id: 'disc-4',
    name: 'Apple iPhone 14 Pro 1TB Gold (MQ2V3)',
    price: 36990000,
    originalPrice: 42990000,
    formattedPrice: '36.990.000₫',
    formattedOriginalPrice: '42.990.000₫',
    category: 'phones',
    tag: 'discount',
    isLiked: false,
    image: iphone14Img,
    description: 'Phiên bản dung lượng cực đại 1TB màu Gold sang trọng quý phái, màn hình Super Retina XDR đỉnh cao.'
  },
  // --- DANH MỤC LAPTOP CHUẨN THƯƠNG HIỆU ---
  {
    id: 'lap-1',
    name: 'Apple MacBook Air M2 2024 16GB 256GB',
    price: 18500000,
    originalPrice: 21990000,
    formattedPrice: '18.500.000₫',
    formattedOriginalPrice: '21.990.000₫',
    category: 'laptops',
    brand: 'Apple',
    tag: 'new',
    isLiked: true,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
    description: 'MacBook Air M2 thiết kế mỏng nhẹ đẳng cấp, màn hình Liquid Retina 13.6 inch và pin lên tới 18 giờ liên tục.'
  },
  {
    id: 'lap-2',
    name: 'Laptop Asus ROG Zephyrus G14 OLED GA403',
    price: 39990000,
    originalPrice: 44990000,
    formattedPrice: '39.990.000₫',
    formattedOriginalPrice: '44.990.000₫',
    category: 'laptops',
    brand: 'Asus',
    tag: 'bestseller',
    isLiked: false,
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800',
    description: 'Laptop Gaming màn OLED 3K 120Hz siêu mỏng nhẹ, CPU AMD Ryzen 9 AI, Card đồ họa RTX 4060, vỏ nhôm CNC cao cấp.'
  },
  {
    id: 'lap-3',
    name: 'Laptop Gaming MSI Cyborg 15 A12V RTX 4050',
    price: 21990000,
    originalPrice: 24990000,
    formattedPrice: '21.990.000₫',
    formattedOriginalPrice: '24.990.000₫',
    category: 'laptops',
    brand: 'MSI',
    tag: 'new',
    isLiked: false,
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800',
    description: 'Thiết kế cyberpunk xuyên thấu đậm chất tương lai, màn hình 144Hz IPS, CPU Intel Core i7 và card đồ họa RTX 4050.'
  },
  {
    id: 'lap-4',
    name: 'Laptop Acer Nitro V 15 ANV15 Core i5 RTX 4050',
    price: 19990000,
    originalPrice: 22990000,
    formattedPrice: '19.990.000₫',
    formattedOriginalPrice: '22.990.000₫',
    category: 'laptops',
    brand: 'Acer',
    tag: 'bestseller',
    isLiked: false,
    image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800',
    description: 'Chiến binh gaming quốc dân, tản nhiệt 2 quạt mát lạnh, màn hình 144Hz siêu mượt và card rời RTX 4050 6GB.'
  },
  {
    id: 'lap-5',
    name: 'Laptop Dell XPS 13 Plus 9320 Core i7',
    price: 36990000,
    originalPrice: 41990000,
    formattedPrice: '36.990.000₫',
    formattedOriginalPrice: '41.990.000₫',
    category: 'laptops',
    brand: 'Dell',
    tag: 'featured',
    isLiked: false,
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800',
    description: 'Kiệt tác thiết kế siêu mỏng nhẹ, màn hình OLED 3.5K cảm ứng, bàn phím tràn cạnh và thanh cảm ứng điện dung.'
  },
  {
    id: 'lap-6',
    name: 'Laptop Lenovo Legion 5 Pro 16ARH7H RTX 3070',
    price: 29990000,
    originalPrice: 33990000,
    formattedPrice: '29.990.000₫',
    formattedOriginalPrice: '33.990.000₫',
    category: 'laptops',
    brand: 'Lenovo',
    tag: 'featured',
    isLiked: false,
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800',
    description: 'Đỉnh cao hiệu năng Gaming & Đồ họa, màn hình 16 inch 2.5K 165Hz chuẩn màu 100% sRGB, bàn phím TrueStrike.'
  }
];
