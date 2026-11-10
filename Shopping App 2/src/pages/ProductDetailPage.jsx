import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  ShoppingCart, 
  Lock, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  Star, 
  Check, 
  Copy, 
  Zap, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Store,
  Layers,
  Sparkles,
  AlertCircle,
  Tag
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatVND } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { productApi } from '../services/productApi';
import { wishlistApi } from '../services/wishlistApi';
import { couponApi } from '../services/couponApi';
import { productReviewApi } from '../services/productReviewApi';
import { parseProductSpecs } from '../utils/productSpecs';
import { ProductReviewsSection } from '../components/ProductReviews/ProductReviewsSection';
import './ProductDetailPage.css';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, showToast } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [shopCoupons, setShopCoupons] = useState([]);
  const [savedCouponIds, setSavedCouponIds] = useState(new Set());
  const [copiedCouponCode, setCopiedCouponCode] = useState(null);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, totalReviews: 0 });

  // Model box yêu cầu đăng nhập
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);

  // Danh sách toàn bộ ảnh của sản phẩm phục vụ Gallery & Slider
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const urls = [];
    const seen = new Set();

    const addUrl = (url) => {
      if (url && typeof url === 'string') {
        const trimmed = url.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          urls.push(trimmed);
        }
      }
    };

    if (product.primaryImageUrl) addUrl(product.primaryImageUrl);
    if (product.image) addUrl(product.image);

    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (typeof img === 'string') addUrl(img);
        else if (img?.imageUrl) addUrl(img.imageUrl);
      });
    }

    if (Array.isArray(product?.variants)) {
      product.variants.forEach((v) => {
        if (v?.imageUrl) addUrl(v.imageUrl);
      });
    }

    return urls.length > 0 ? urls : [product?.image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'];
  }, [product]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const thumbnailContainerRef = useRef(null);
  const thumbnailRefs = useRef([]);

  // Mouse drag trên thanh thumbnail
  const isThumbDraggingRef = useRef(false);
  const thumbStartXRef = useRef(0);
  const thumbScrollLeftRef = useRef(0);
  const hasThumbMovedRef = useRef(false);

  // Tự động cuộn thumbnail active vào giữa dải xem với tọa độ chính xác tuyệt đối
  const scrollThumbnailToCenter = (index) => {
    const targetThumb = thumbnailRefs.current[index];
    const container = thumbnailContainerRef.current;
    if (targetThumb && container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetThumb.getBoundingClientRect();
      const relativeLeft = targetRect.left - containerRect.left + container.scrollLeft;
      const scrollPos = relativeLeft - (containerRect.width / 2) + (targetRect.width / 2);
      container.scrollTo({
        left: Math.max(0, scrollPos),
        behavior: 'smooth'
      });
    }
  };

  // Đồng bộ index khi selectedImage hoặc galleryImages thay đổi
  useEffect(() => {
    if (galleryImages.length > 0) {
      if (selectedImage) {
        const idx = galleryImages.indexOf(selectedImage);
        if (idx !== -1) {
          setActiveImageIndex(idx);
          scrollThumbnailToCenter(idx);
        } else {
          setActiveImageIndex(0);
        }
      } else {
        setSelectedImage(galleryImages[0]);
        setActiveImageIndex(0);
      }
    }
  }, [galleryImages, selectedImage]);

  // Chọn ảnh bằng click trực tiếp (hỗ trợ bấm ảnh ở rìa để cuộn hiển thị các ảnh ẩn)
  const handleSelectImageByIndex = (index) => {
    if (hasThumbMovedRef.current) return;
    if (index < 0 || index >= galleryImages.length) return;
    setActiveImageIndex(index);
    setSelectedImage(galleryImages[index]);
    scrollThumbnailToCenter(index);
  };

  // Nút Previous: quay về ảnh trước
  const handlePrevImage = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (galleryImages.length <= 1) return;
    const nextIdx = (activeImageIndex - 1 + galleryImages.length) % galleryImages.length;
    handleSelectImageByIndex(nextIdx);
  };

  // Nút Next: chuyển sang ảnh sau
  const handleNextImage = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (galleryImages.length <= 1) return;
    const nextIdx = (activeImageIndex + 1) % galleryImages.length;
    handleSelectImageByIndex(nextIdx);
  };

  // Cuộn thanh thumbnail sang trái hoặc phải
  const handleScrollThumbnails = (direction) => {
    if (thumbnailContainerRef.current) {
      const scrollAmount = direction === 'left' ? -164 : 164;
      thumbnailContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Xử lý kéo trượt chuột trên thanh thumbnail
  const handleThumbMouseDown = (e) => {
    if (!thumbnailContainerRef.current) return;
    isThumbDraggingRef.current = true;
    hasThumbMovedRef.current = false;
    thumbStartXRef.current = e.pageX;
    thumbScrollLeftRef.current = thumbnailContainerRef.current.scrollLeft;
  };

  const handleThumbMouseMove = (e) => {
    if (!isThumbDraggingRef.current || !thumbnailContainerRef.current) return;
    const delta = e.pageX - thumbStartXRef.current;
    if (Math.abs(delta) > 5) {
      hasThumbMovedRef.current = true;
      thumbnailContainerRef.current.scrollLeft = thumbScrollLeftRef.current - delta;
    }
  };

  const handleThumbMouseUp = () => {
    isThumbDraggingRef.current = false;
  };

  // Touch Swipe Gesture (Điện thoại / Tablet)
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const isSwipingRef = useRef(false);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = e.touches[0].clientX;
    isSwipingRef.current = true;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isSwipingRef.current) return;
    isSwipingRef.current = false;
    const diff = touchStartXRef.current - touchEndXRef.current;
    const threshold = 40;
    if (diff > threshold) {
      handleNextImage();
    } else if (diff < -threshold) {
      handlePrevImage();
    }
  };

  // Mouse Drag Gesture (Desktop)
  const isMouseDownRef = useRef(false);
  const mouseStartXRef = useRef(0);

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;
    isMouseDownRef.current = true;
    mouseStartXRef.current = e.clientX;
  };

  const handleMouseUp = (e) => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    const diff = mouseStartXRef.current - e.clientX;
    const threshold = 50;
    if (diff > threshold) {
      handleNextImage();
    } else if (diff < -threshold) {
      handlePrevImage();
    }
  };

  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
  };

  // Kiểm tra sản phẩm đã nằm trong Wishlist chưa
  useEffect(() => {
    if (isAuthenticated && id) {
      wishlistApi.getWishlist()
        .then((res) => {
          const items = res?.items || [];
          setIsLiked(items.some((it) => String(it.productId) === String(id)));
        })
        .catch(() => {});
    }
  }, [id, isAuthenticated]);

  // Fetch product detail from API (STT 40)
  useEffect(() => {
    let isMounted = true;
    if (id) {
      setIsLoading(true);
      productApi.getProductById(id)
        .then((data) => {
          if (!isMounted || !data) return;
          const minP = data.minPrice ?? 0;
          const maxP = data.maxPrice ?? minP;
          const sortedImages = Array.isArray(data.images)
            ? [...data.images].sort((a, b) => (b.primary || b.isPrimary ? 1 : 0) - (a.primary || a.isPrimary ? 1 : 0))
            : [];
          const primaryImg = data.primaryImageUrl || sortedImages[0]?.imageUrl || '';

          const resolvedShopId = data.shopId || data.shop?.id || null;

          // Kiểm tra xem sản phẩm có biến thể nào có giảm giá thực tế từ API hay không (salePrice < price)
          const rawVariants = Array.isArray(data.variants) ? data.variants : [];
          const variantWithSale = rawVariants.find(v => v.salePrice && Number(v.salePrice) > 0 && Number(v.salePrice) < Number(v.price));
          const hasRealSale = Boolean(variantWithSale);
          const realPrice = variantWithSale ? Number(variantWithSale.salePrice) : minP;
          const realOriginalPrice = variantWithSale ? Number(variantWithSale.price) : (maxP > minP ? maxP : null);

          // Tính toán tồn kho thực tế từ danh sách biến thể
          const hasAnyStock = rawVariants.length > 0
            ? rawVariants.some(v => (v.availableQuantity != null ? v.availableQuantity > 0 : (v.stockQuantity != null ? v.stockQuantity > 0 : true)))
            : (data.inStock !== false);
          const totalStock = rawVariants.reduce((sum, v) => sum + (v.availableQuantity ?? v.stockQuantity ?? 0), 0);

          const liveProduct = {
            id: data.id,
            name: data.name,
            shortDescription: data.shortDescription || '',
            description: data.description || '',
            price: realPrice,
            originalPrice: realOriginalPrice,
            hasRealSale,
            formattedPrice: realPrice ? formatVND(realPrice) : 'Liên hệ',
            formattedOriginalPrice: realOriginalPrice && realOriginalPrice > realPrice ? formatVND(realOriginalPrice) : null,
            image: primaryImg,
            primaryImageUrl: primaryImg,
            images: sortedImages,
            variants: rawVariants,
            category: data.categoryName || data.category?.name || 'Công nghệ',
            categoryId: data.categoryId || data.category?.id,
            brand: data.brandName || data.brand?.name || 'Cyber Official',
            brandLogo: data.brand?.logoUrl,
            shopId: resolvedShopId,
            shop: data.shopName || data.shop?.name || 'Cyber Flagship Store',
            inStock: data.inStock !== false && hasAnyStock,
            totalStockQuantity: data.totalStockQuantity ?? (rawVariants.length > 0 ? totalStock : (hasAnyStock ? 100 : 0)),
            warrantyMonths: data.warrantyMonths || 12
          };

          setProduct(liveProduct);
          setSelectedImage(primaryImg);

          // Tải mã giảm giá áp dụng THẬT cho sản phẩm này từ API (chỉ hiện mã thật của shop và sản phẩm này)
          couponApi.getProductCoupons(data.id)
            .then((coupons) => {
              if (isMounted && Array.isArray(coupons)) {
                setShopCoupons(coupons);
                const savedIds = new Set(coupons.filter(c => c.isSaved).map(c => c.id));
                setSavedCouponIds(savedIds);
              }
            })
            .catch(() => {
              if (resolvedShopId) {
                couponApi.getShopCoupons(resolvedShopId)
                  .then((coupons) => {
                    if (isMounted && Array.isArray(coupons)) {
                      setShopCoupons(coupons);
                      const savedIds = new Set(coupons.filter(c => c.isSaved).map(c => c.id));
                      setSavedCouponIds(savedIds);
                    }
                  })
                  .catch(() => {});
              }
            });

          // Tải tóm tắt đánh giá thật từ API
          productReviewApi.getReviews(data.id, { page: 1, size: 1 })
            .then((revData) => {
              if (isMounted && revData) {
                setReviewSummary({
                  averageRating: revData.averageRating || 0,
                  totalReviews: revData.totalReviews || 0
                });
              }
            })
            .catch(() => {});

          // Tải sản phẩm liên quan cùng danh mục từ Backend API
          if (data.categoryId) {
            productApi.getProducts({ categoryId: data.categoryId, size: 5 })
              .then((relRes) => {
                if (!isMounted) return;
                const items = (relRes?.content || []).filter((p) => String(p.id) !== String(data.id)).slice(0, 4);
                setRelatedProducts(items);
              })
              .catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('API getProductById error:', err);
          if (isMounted) setProduct(null);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  // 1. Phân tích các thông số kỹ thuật (Specifications) từ mô tả sản phẩm
  const { specs, cleanDescription } = useMemo(() => {
    return parseProductSpecs(product?.description || '');
  }, [product?.description]);

  // 2. Phân tích các biến thể (Variants): Tách biệt Dung lượng / Phiên bản và Màu sắc
  const { storageOptions, colorOptions, variantsMap } = useMemo(() => {
    const rawVariants = Array.isArray(product?.variants) ? product.variants : [];
    const storages = new Set();
    const colors = new Set();
    const map = {};

    rawVariants.forEach((v) => {
      let color = '';
      let storage = '';

      if (v.attributes) {
        try {
          const attr = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
          if (attr.color) color = attr.color;
          if (attr.storage) storage = attr.storage;
        } catch {}
      }

      if (!color || !storage) {
        const matchStorage = (v.variantName || '').match(/\b(64GB|128GB|256GB|512GB|1TB|2TB)\b/i);
        if (matchStorage) storage = matchStorage[1].toUpperCase();

        const matchColor = (v.variantName || '')
          .replace(/\b(64GB|128GB|256GB|512GB|1TB|2TB)\b/gi, '')
          .replace(/iPhone|Samsung|Sony|Dell|Asus|Xiaomi|\d+/gi, '')
          .trim();
        if (matchColor) color = matchColor;
      }

      if (!color) color = 'Tiêu chuẩn';
      if (!storage) storage = v.variantName || 'Tiêu chuẩn';

      storages.add(storage);
      colors.add(color);
      map[`${color}_${storage}`] = v;
      if (!map[`storage_${storage}`]) map[`storage_${storage}`] = v;
      if (!map[`color_${color}`]) map[`color_${color}`] = v;
    });

    const storagesList = Array.from(storages);
    const colorsList = Array.from(colors);

    return {
      storageOptions: storagesList.length > 0 ? storagesList : ['128GB', '256GB', '512GB'],
      colorOptions: colorsList.length > 0 ? colorsList : ['Đen', 'Bạc', 'Tự Nhiên', 'Vàng'],
      variantsMap: map
    };
  }, [product?.variants]);

  // Xử lý Thêm/Xóa sản phẩm vào Danh sách yêu thích (Wishlist - STT 80, 81)
  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }
    try {
      if (isLiked) {
        await wishlistApi.removeFromWishlist(id);
        setIsLiked(false);
        showToast('Đã xóa khỏi danh sách yêu thích');
      } else {
        await wishlistApi.addToWishlist(id);
        setIsLiked(true);
        showToast('Đã thêm sản phẩm vào danh sách yêu thích');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi thao tác yêu thích', 'error');
    }
  };

  // State chọn phiên bản & màu sắc - Khởi tạo rỗng để người dùng BẮT BUỘC phải bấm chọn trước khi mua
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [attemptedAction, setAttemptedAction] = useState(false);

  // Tìm biến thể khớp nhất với cấu hình đang chọn
  const matchedVariant = useMemo(() => {
    if (!selectedColor && !selectedStorage) return null;
    return (
      variantsMap[`${selectedColor}_${selectedStorage}`] ||
      (selectedStorage ? variantsMap[`storage_${selectedStorage}`] : null) ||
      (selectedColor ? variantsMap[`color_${selectedColor}`] : null) ||
      (Array.isArray(product?.variants) ? product.variants[0] : null)
    );
  }, [variantsMap, selectedColor, selectedStorage, product?.variants]);

  // Tự động chuyển ảnh hiển thị khi người dùng đổi màu sắc / biến thể có ảnh riêng
  useEffect(() => {
    if (matchedVariant?.imageUrl) {
      setSelectedImage(matchedVariant.imageUrl);
    }
  }, [matchedVariant]);

  // Tính toán giá tiền bán và giá gốc động theo phiên bản đang chọn
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    if (matchedVariant) {
      return Number(matchedVariant.salePrice || matchedVariant.price || product.price || 0);
    }
    let extra = 0;
    if (selectedStorage === '256GB') extra = 2500000;
    else if (selectedStorage === '512GB') extra = 5500000;
    else if (selectedStorage === '1TB') extra = 9500000;
    return Number(product.price || 15000000) + extra;
  }, [matchedVariant, selectedStorage, product?.price]);

  const originalPrice = useMemo(() => {
    if (!product) return null;
    if (matchedVariant) {
      if (matchedVariant.salePrice && Number(matchedVariant.price) > Number(matchedVariant.salePrice)) {
        return Number(matchedVariant.price);
      }
      return null;
    }
    if (product.originalPrice && product.originalPrice > currentPrice) {
      return Number(product.originalPrice);
    }
    return null;
  }, [matchedVariant, product?.originalPrice, currentPrice]);

  const discountPercent = useMemo(() => {
    if (originalPrice && originalPrice > currentPrice) {
      return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }
    return null;
  }, [originalPrice, currentPrice]);

  // Tồn kho khả dụng thực tế của biến thể hoặc sản phẩm
  const stockQuantity = useMemo(() => {
    if (matchedVariant) {
      return matchedVariant.availableQuantity !== undefined
        ? matchedVariant.availableQuantity
        : (matchedVariant.stockQuantity ?? 0);
    }
    if (product?.totalStockQuantity !== undefined) {
      return product.totalStockQuantity;
    }
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      return product.variants.reduce((sum, v) => sum + (v.availableQuantity ?? v.stockQuantity ?? 0), 0);
    }
    return product?.inStock ? 100 : 0;
  }, [product, matchedVariant]);

  // Kiểm tra tình trạng hết hàng
  const isOutOfStock = useMemo(() => {
    if (!product) return false;
    if (product.inStock === false) return true;
    if (matchedVariant) {
      const avail = matchedVariant.availableQuantity !== undefined
        ? matchedVariant.availableQuantity
        : matchedVariant.stockQuantity;
      return avail !== undefined && avail !== null && avail <= 0;
    }
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants.every((v) => {
        const avail = v.availableQuantity !== undefined ? v.availableQuantity : v.stockQuantity;
        return avail !== undefined && avail !== null && avail <= 0;
      });
    }
    return false;
  }, [product, matchedVariant]);

  // Xử lý Thêm vào giỏ hàng trực tiếp từ trang chi tiết (Yêu cầu phải chọn phiên bản & màu sắc)
  const handleAddToCart = () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }

    if (isOutOfStock) {
      showToast('Sản phẩm hoặc phiên bản này hiện đã hết hàng, không thể thêm vào giỏ!', 'error');
      return;
    }

    if (!selectedStorage || !selectedColor) {
      setAttemptedAction(true);
      showToast('Vui lòng chọn Phiên bản và Màu sắc sản phẩm trước khi thêm vào giỏ hàng!', 'warning');
      return;
    }

    if (stockQuantity > 0 && quantity > stockQuantity) {
      showToast(`Số lượng yêu cầu (${quantity}) vượt quá tồn kho khả dụng (${stockQuantity})!`, 'warning');
      return;
    }

    const configuredProduct = {
      ...product,
      id: matchedVariant ? `${product.id}-${matchedVariant.id}` : `${product.id}-${selectedColor}-${selectedStorage}`,
      productId: product.id,
      variantId: matchedVariant?.id,
      name: `${product.name} (${selectedColor}, ${selectedStorage})`,
      price: currentPrice,
      formattedPrice: formatVND(currentPrice),
      image: selectedImage || product.image,
      selectedColor,
      selectedStorage
    };

    const mainImg = document.querySelector('.detail-main-img');
    const startRect = mainImg ? mainImg.getBoundingClientRect() : null;
    addToCart(configuredProduct, quantity, { fly: true, startRect });
    showToast(`Đã thêm ${quantity}x "${configuredProduct.name}" vào giỏ hàng!`, 'success');
  };

  // Xử lý Mua ngay:
  // CHỈ thanh toán DUY NHẤT sản phẩm vừa chọn, TUYỆT ĐỐI KHÔNG đưa vào giỏ hay thanh toán cả giỏ hàng
  const handleBuyNow = () => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }

    if (isOutOfStock) {
      showToast('Sản phẩm hoặc phiên bản này hiện đã hết hàng, không thể đặt mua!', 'error');
      return;
    }

    if (!selectedStorage || !selectedColor) {
      setAttemptedAction(true);
      showToast('Vui lòng chọn Phiên bản và Màu sắc sản phẩm trước khi mua ngay!', 'warning');
      return;
    }

    if (stockQuantity > 0 && quantity > stockQuantity) {
      showToast(`Số lượng yêu cầu (${quantity}) vượt quá tồn kho khả dụng (${stockQuantity})!`, 'warning');
      return;
    }

    const buyNowItem = {
      id: matchedVariant ? `${product.id}-${matchedVariant.id}` : `${product.id}-${selectedColor}-${selectedStorage}`,
      productId: product.id,
      variantId: matchedVariant?.id,
      name: `${product.name} (${selectedColor}, ${selectedStorage})`,
      price: currentPrice,
      formattedPrice: formatVND(currentPrice),
      image: selectedImage || product.image,
      selectedColor,
      selectedStorage,
      quantity,
      shop: product.shop,
      brand: product.brand,
      warrantyMonths: product.warrantyMonths
    };

    // Lưu vào sessionStorage để reload trang checkout vẫn giữ nguyên đúng sản phẩm này
    try {
      sessionStorage.setItem('CYBER_BUY_NOW_ITEM', JSON.stringify(buyNowItem));
      sessionStorage.removeItem('CYBER_FROM_CART');
    } catch (e) {
      console.warn('SessionStorage error:', e);
    }

    // Chuyển hướng sang Checkout với duy nhất buyNowItem, KHÔNG gọi addToCart
    navigate('/checkout', { state: { buyNowItem } });
  };

  // Sao chép link mua hàng vào clipboard
  const handleCopyLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Lưu mã giảm giá vào ví cá nhân
  const handleSaveCoupon = async (c) => {
    if (!isAuthenticated) {
      setShowAuthRequiredModal(true);
      return;
    }
    try {
      await couponApi.saveCouponToWallet(c.id);
      showToast(`Đã lưu mã "${c.code}" vào ví voucher của bạn!`, 'success');
      setSavedCouponIds((prev) => new Set([...prev, c.id]));
    } catch (err) {
      showToast(err.message || 'Không thể lưu mã giảm giá', 'error');
    }
  };

  // Sao chép mã coupon
  const handleCopyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponCode(code);
    showToast(`Đã sao chép mã giảm giá "${code}"!`, 'success');
    setTimeout(() => setCopiedCouponCode(null), 2500);
  };

  if (isLoading || !product) {
    return (
      <div className="container detail-page-wrapper" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #e4e4e7', borderTopColor: '#000000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: '#71717a', fontSize: '0.95rem', fontWeight: 500 }}>
          {isLoading ? 'Đang tải thông tin chi tiết sản phẩm...' : 'Không tìm thấy thông tin sản phẩm.'}
        </p>
        {!isLoading && !product && (
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/products" className="detail-btn-cart" style={{ display: 'inline-flex', padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
              Quay lại danh sách sản phẩm
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container detail-page-wrapper">
      {/* 1. Breadcrumbs Điều hướng */}
      <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">Trang chủ</Link>
        <ChevronRight size={14} className="breadcrumb-separator" />
        <Link to="/products" className="breadcrumb-link">Sản phẩm</Link>
        <ChevronRight size={14} className="breadcrumb-separator" />
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      {/* 2. Lưới chính: Showcase Ảnh & Thông tin đặt mua */}
      <div className="detail-main-grid">
        {/* Khối Ảnh Sản Phẩm (Interactive Gallery with Swiping & Thumbnails) */}
        <div className="detail-image-showcase">
          <div 
            className="detail-main-image-box"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: galleryImages.length > 1 ? 'grab' : 'default' }}
          >
            {/* Wishlist Button */}
            <button 
              type="button" 
              className={`detail-wishlist-float ${isLiked ? 'is-active' : ''}`}
              onClick={handleToggleWishlist}
              aria-label={isLiked ? "Bỏ yêu thích" : "Yêu thích"}
            >
              <Heart size={22} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : '#a1a1aa'} />
            </button>

            {/* Previous Image Arrow */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                className="detail-gallery-nav-btn prev"
                onClick={handlePrevImage}
                aria-label="Xem ảnh trước"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Large Product Image */}
            <img 
              key={activeImageIndex}
              src={selectedImage || galleryImages[0] || product.image} 
              alt={product.name} 
              className="detail-main-img" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';
              }}
            />

            {/* Next Image Arrow */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                className="detail-gallery-nav-btn next"
                onClick={handleNextImage}
                aria-label="Xem ảnh sau"
              >
                <ChevronRight size={22} />
              </button>
            )}

            {/* Image Indicator (1 / N) */}
            {galleryImages.length > 1 && (
              <span className="detail-gallery-indicator">
                {activeImageIndex + 1} / {galleryImages.length}
              </span>
            )}
          </div>

          {/* Dải ảnh thu nhỏ (Thumbnail Carousel - Hiển thị 5 ảnh & Cuộn mượt mà) */}
          {galleryImages.length > 1 && (
            <div className="detail-thumbnail-carousel">
              {galleryImages.length > 5 && (
                <button
                  type="button"
                  className="detail-thumb-scroll-btn prev"
                  onClick={() => handleScrollThumbnails('left')}
                  aria-label="Cuộn thumbnail sang trái"
                >
                  <ChevronLeft size={16} />
                </button>
              )}

              <div 
                className="detail-thumbnails-track" 
                ref={thumbnailContainerRef}
                onMouseDown={handleThumbMouseDown}
                onMouseMove={handleThumbMouseMove}
                onMouseUp={handleThumbMouseUp}
                onMouseLeave={handleThumbMouseUp}
              >
                {galleryImages.map((imgUrl, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={idx}
                      ref={(el) => (thumbnailRefs.current[idx] = el)}
                      type="button"
                      className={`detail-thumbnail-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleSelectImageByIndex(idx)}
                      aria-label={`Xem ảnh thứ ${idx + 1}`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${product.name} thumbnail ${idx + 1}`}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200';
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {galleryImages.length > 5 && (
                <button
                  type="button"
                  className="detail-thumb-scroll-btn next"
                  onClick={() => handleScrollThumbnails('right')}
                  aria-label="Cuộn thumbnail sang phải"
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Khối Thông Tin & Tác Vụ Mua Hàng */}
        <div className="detail-info-col">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span className="detail-brand-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {product.brandLogo && (
                <img src={product.brandLogo} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
              )}
              {product.brand || 'Cyber Official Store'}
            </span>
            {product.shop && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Store size={13} /> {product.shop}
              </span>
            )}
          </div>

          <h1 className="detail-product-title">{product.name}</h1>

          {/* Đánh giá sản phẩm thực tế từ API */}
          <div 
            className="detail-rating-row"
            onClick={() => {
              const el = document.getElementById('product-reviews-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            title="Nhấn để xem chi tiết nhận xét & đánh giá"
          >
            <div className="stars-group" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const fillScore = reviewSummary.totalReviews > 0 ? reviewSummary.averageRating : 5;
                const isFilled = star <= Math.round(fillScore);
                return (
                  <Star 
                    key={star} 
                    size={16} 
                    fill={isFilled ? "#f59e0b" : "none"} 
                    color={isFilled ? "#f59e0b" : "#cbd5e1"} 
                  />
                );
              })}
            </div>
            <span className="reviews-count" style={{ color: '#64748b', fontSize: '0.875rem' }}>
              {reviewSummary.totalReviews > 0 ? (
                <>
                  <strong style={{ color: '#0f172a' }}>{reviewSummary.averageRating.toFixed(1)}</strong>/5 ({reviewSummary.totalReviews} đánh giá từ khách hàng)
                </>
              ) : (
                '(Chưa có đánh giá nào)'
              )}
            </span>
          </div>

          {/* Hộp Giá Tiền Tương Ứng & Trạng thái tồn kho */}
          <div className="detail-price-box" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span className="detail-current-price">{formatVND(currentPrice)}</span>
            {originalPrice && originalPrice > currentPrice && (
              <span className="detail-original-price">{formatVND(originalPrice)}</span>
            )}
            {discountPercent && (
              <span className="detail-discount-pill">-{discountPercent}% OFF</span>
            )}

            {/* Trạng thái tồn kho */}
            {isOutOfStock ? (
              <span style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <AlertCircle size={14} /> Hết hàng
              </span>
            ) : (
              <span style={{
                background: '#f0fdf4',
                color: '#166534',
                border: '1px solid #bbf7d0',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Check size={14} /> Còn hàng ({stockQuantity > 0 ? stockQuantity : 'Sẵn sàng'})
              </span>
            )}

            {(!selectedStorage || !selectedColor) && (
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
                (Giá dự kiến theo phiên bản)
              </span>
            )}
          </div>

          {/* Mã giảm giá áp dụng thật từ API cho sản phẩm này */}
          {shopCoupons.length > 0 && (
            <div style={{
              margin: '16px 0',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={16} /> Mã giảm giá áp dụng cho sản phẩm ({shopCoupons.length})
                </span>
                <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 500 }}>
                  Chính hãng từ {product.shop}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {shopCoupons.map((c) => {
                  const isSaved = savedCouponIds.has(c.id);
                  const isCopied = copiedCouponCode === c.code;
                  const discountLabel = (c.discountType === 'PERCENT' || c.discountType === 'PERCENTAGE')
                    ? `Giảm ${c.discountValue}%`
                    : `Giảm ${formatVND(c.discountValue)}`;
                  const minOrderLabel = c.minOrderAmount && Number(c.minOrderAmount) > 0
                    ? `Đơn từ ${formatVND(c.minOrderAmount)}`
                    : 'Mọi đơn hàng';

                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        border: '1px dashed #16a34a',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                      title={c.description || `${c.name}: ${discountLabel}`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 800, color: '#15803d', fontSize: '0.85rem', letterSpacing: '0.04em' }}>
                            {c.code}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', backgroundColor: '#fef2f2', padding: '1px 5px', borderRadius: '4px' }}>
                            {discountLabel}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {minOrderLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleCopyCouponCode(c.code)}
                          style={{
                            border: 'none',
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '4px 6px',
                            borderRadius: '5px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Sao chép mã"
                        >
                          {isCopied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                          {isCopied ? 'Đã chép' : 'Sao chép'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCoupon(c)}
                          style={{
                            border: 'none',
                            background: isSaved ? '#dcfce7' : '#16a34a',
                            color: isSaved ? '#166534' : '#ffffff',
                            padding: '4px 8px',
                            borderRadius: '5px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title={isSaved ? 'Đã lưu trong ví' : 'Lưu vào ví voucher'}
                        >
                          {isSaved ? <Check size={12} /> : null}
                          {isSaved ? 'Đã lưu' : 'Lưu mã'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cảnh báo khi người dùng bấm Mua ngay mà chưa chọn phiên bản & màu sắc */}
          {attemptedAction && (!selectedStorage || !selectedColor) && (
            <div className="detail-selection-alert">
              <AlertCircle size={18} />
              <span>
                Vui lòng chọn <strong>{!selectedStorage && !selectedColor ? 'Phiên bản và Màu sắc' : (!selectedStorage ? 'Phiên bản / Dung lượng' : 'Màu sắc')}</strong> bên dưới trước khi đặt mua!
              </span>
            </div>
          )}

          {/* =================================================================== */}
          {/* 1. CHỌN PHIÊN BẢN / DUNG LƯỢNG */}
          {/* =================================================================== */}
          <div className={`detail-variant-group ${attemptedAction && !selectedStorage ? 'is-unselected' : ''}`}>
            <span className="variant-label">
              1. Phiên bản / Dung lượng: {selectedStorage ? (
                <strong>{selectedStorage}</strong>
              ) : (
                <span className="selection-required-hint">⚠️ (Vui lòng chọn)</span>
              )}
            </span>
            <div className="storage-options-row">
              {storageOptions.map((storage) => (
                <button
                  key={storage}
                  type="button"
                  className={`storage-pill-btn ${selectedStorage === storage ? 'is-active' : ''}`}
                  onClick={() => {
                    setSelectedStorage(storage);
                    setAttemptedAction(false);
                  }}
                >
                  {selectedStorage === storage && <Check size={14} style={{ display: 'inline', marginRight: '4px' }} />}
                  {storage}
                </button>
              ))}
            </div>
          </div>

          {/* =================================================================== */}
          {/* 2. CHỌN MÀU SẮC (NẰM BÊN DƯỚI PHIÊN BẢN) */}
          {/* =================================================================== */}
          <div className={`detail-variant-group ${attemptedAction && !selectedColor ? 'is-unselected' : ''}`}>
            <span className="variant-label">
              2. Màu sắc: {selectedColor ? (
                <strong>{selectedColor}</strong>
              ) : (
                <span className="selection-required-hint">⚠️ (Vui lòng chọn)</span>
              )}
            </span>
            <div className="color-options-row">
              {colorOptions.map((color) => {
                const cLower = color.toLowerCase();
                let bg = '#18181b';
                if (cLower.includes('trắng') || cLower.includes('white')) bg = '#f8fafc';
                else if (cLower.includes('bạc') || cLower.includes('silver')) bg = '#e2e8f0';
                else if (cLower.includes('vàng') || cLower.includes('gold')) bg = '#fef08a';
                else if (cLower.includes('sa mạc') || cLower.includes('desert')) bg = '#d97706';
                else if (cLower.includes('tự nhiên') || cLower.includes('natural')) bg = '#94a3b8';
                else if (cLower.includes('xanh') || cLower.includes('blue')) bg = '#3b82f6';
                else if (cLower.includes('hồng') || cLower.includes('pink')) bg = '#f472b6';

                return (
                  <button
                    key={color}
                    type="button"
                    className={`detail-color-pill ${selectedColor === color ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedColor(color);
                      setAttemptedAction(false);
                    }}
                  >
                    <span className="detail-color-dot" style={{ backgroundColor: bg }} />
                    <span>{color}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =================================================================== */}
          {/* 3. CÔNG NGHỆ & ĐẶC ĐIỂM NỔI BẬT */}
          {/* =================================================================== */}
          {product.shortDescription && (
            <div className="detail-highlights-box">
              <div className="detail-highlights-header">
                <Sparkles size={16} color="#d97706" />
                <span>Công nghệ & Đặc điểm nổi bật</span>
              </div>
              <div className="detail-highlights-content">
                {product.shortDescription}
              </div>
            </div>
          )}

          {/* Cảnh báo hết hàng nếu sản phẩm hoặc phiên bản đã chọn không còn tồn kho */}
          {isOutOfStock && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>Sản phẩm / Phiên bản này hiện đã hết hàng trong kho. Quý khách vui lòng chọn cấu hình khác hoặc quay lại sau!</span>
            </div>
          )}

          {/* =================================================================== */}
          {/* 4. SỐ LƯỢNG & TÁC VỤ MUA HÀNG (TRỰC TIẾP TRỰC TUYẾN) */}
          {/* =================================================================== */}
          <div className="detail-actions-row">
            {/* Bộ điều khiển số lượng */}
            <div className="quantity-control" style={isOutOfStock ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
              <button
                type="button"
                className="quantity-btn"
                disabled={isOutOfStock || quantity <= 1}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Giảm số lượng"
              >
                -
              </button>
              <span className="quantity-value">{isOutOfStock ? 0 : quantity}</span>
              <button
                type="button"
                className="quantity-btn"
                disabled={isOutOfStock || (stockQuantity > 0 && quantity >= stockQuantity)}
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Tăng số lượng"
              >
                +
              </button>
            </div>

            {/* Nút Thêm vào giỏ hàng */}
            <button 
              type="button" 
              className={`detail-btn-cart ${isOutOfStock ? 'is-disabled' : ''}`}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              style={isOutOfStock ? { opacity: 0.55, cursor: 'not-allowed', backgroundColor: '#e2e8f0', color: '#64748b', borderColor: '#cbd5e1' } : {}}
              title={isOutOfStock ? 'Sản phẩm này hiện đã hết hàng trong kho' : 'Thêm vào giỏ hàng'}
            >
              <ShoppingCart size={18} />
              <span>{isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ hàng'}</span>
            </button>

            {/* Nút Mua ngay */}
            <button 
              type="button" 
              className={`detail-btn-buy ${isOutOfStock ? 'is-disabled' : ''}`}
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              style={isOutOfStock ? { opacity: 0.55, cursor: 'not-allowed', backgroundColor: '#94a3b8' } : {}}
              title={isOutOfStock ? 'Sản phẩm này hiện đã hết hàng trong kho' : 'Mua ngay'}
            >
              <Zap size={18} />
              <span>{isOutOfStock ? 'Tạm hết hàng' : 'Mua ngay'}</span>
            </button>
          </div>

          {/* Thông báo chế độ khách */}
          {!isAuthenticated && (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', color: '#b45309', fontSize: '0.8125rem' }}>
              🔒 Vui lòng đăng nhập để hoàn tất thanh toán hoặc lưu sản phẩm vào giỏ hàng tài khoản của bạn.
            </div>
          )}

          {/* Hộp Link Mua Hàng & Chia Sẻ Trực Tiếp */}
          <div className="purchase-link-box">
            <div className="purchase-link-text">
              <Share2 size={16} color="#64748b" />
              <span>Link mua hàng: <strong>{window.location.origin}/products/{product.id}</strong></span>
            </div>
            <button 
              type="button" 
              className={`copy-link-btn ${copiedLink ? 'copied' : ''}`}
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <>
                  <Check size={14} />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Sao chép link</span>
                </>
              )}
            </button>
          </div>

          {/* Cam kết bán hàng */}
          <div className="detail-trust-list">
            <div className="trust-item">
              <Truck size={20} color="#2563eb" />
              <span>Miễn phí giao hàng toàn quốc</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={20} color="#10b981" />
              <span>Bảo hành {product.warrantyMonths || 12} tháng</span>
            </div>
            <div className="trust-item">
              <RefreshCw size={20} color="#f59e0b" />
              <span>Đổi mới trong 30 ngày nếu lỗi</span>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 5. BẢNG THÔNG SỐ KỸ THUẬT CHI TIẾT (DYNAMIC SPECIFICATIONS TABLE) */}
      {/* =================================================================== */}
      <section className="detail-specs-section">
        <h2 className="detail-specs-title">Thông số kỹ thuật {product.name}</h2>
        {specs.length > 0 ? (
          <table className="specs-table">
            <tbody>
              {specs.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="specs-table">
            <tbody>
              <tr>
                <td>Thương hiệu</td>
                <td>{product.brand || 'Cyber Official Store'}</td>
              </tr>
              <tr>
                <td>Dòng sản phẩm</td>
                <td>{product.name}</td>
              </tr>
              <tr>
                <td>Thời hạn bảo hành</td>
                <td>{product.warrantyMonths || 12} tháng chính hãng</td>
              </tr>
              <tr>
                <td>Tình trạng</td>
                <td>Mới 100% nguyên hộp, chính hãng phân phối tại Việt Nam</td>
              </tr>
              <tr>
                <td>Bộ sản phẩm gồm</td>
                <td>Thân máy, Cáp sạc, Hướng dẫn sử dụng, Thẻ bảo hành</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Nội dung bài viết mô tả chi tiết nếu có */}
        {cleanDescription && (
          <div style={{ marginTop: '2.5rem', background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#0f172a' }}>
              Mô tả chi tiết sản phẩm
            </h3>
            <p style={{ lineHeight: 1.75, color: '#334155', whiteSpace: 'pre-line', fontSize: '0.9375rem' }}>
              {cleanDescription}
            </p>
          </div>
        )}
      </section>

      {/* 5.5. ĐÁNH GIÁ SẢN PHẨM & PHẢN HỒI NGƯỜI BÁN (CELLPHONES STYLE) */}
      <ProductReviewsSection product={product} onSummaryLoaded={setReviewSummary} />

      {/* 6. Sản phẩm tương tự */}
      <section style={{ marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid #e4e4e7' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-color, #ffffff)', marginBottom: '2rem' }}>
          Sản phẩm tương tự bạn có thể thích
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {relatedProducts.map((relProd) => (
            <ProductCard key={relProd.id} product={relProd} />
          ))}
        </div>
      </section>

      {/* 7. MODEL BOX: THÔNG BÁO YÊU CẦU ĐĂNG NHẬP */}
      <ConfirmModal
        isOpen={showAuthRequiredModal}
        onClose={() => setShowAuthRequiredModal(false)}
        type="confirm"
        title="Yêu cầu đăng nhập"
        message="Vui lòng đăng nhập tài khoản Cyber để lựa chọn cấu hình, màu sắc và thực hiện đặt mua sản phẩm."
        confirmText="Đăng nhập ngay"
        cancelText="Để sau"
        onConfirm={() => {
          setShowAuthRequiredModal(false);
          navigate('/auth?mode=login');
        }}
      />
    </div>
  );
};
