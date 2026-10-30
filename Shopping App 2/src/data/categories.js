/**
 * Category & Brand definitions with domain separation
 * Provides mapping between categories, URL slugs, and allowed brands
 */

export const CATEGORY_DEFINITIONS = [
  {
    id: 1,
    key: 'phones',
    name: 'Điện thoại',
    fullName: 'Điện thoại & Tablet',
    slug: 'dien-thoai-tablet',
    aliases: ['phones', 'phone', 'dien-thoai', 'dien-thoai-tablet', '1'],
    icon: 'Smartphone',
    allowedBrands: [
      { slug: 'apple', name: 'Apple', shortName: 'Apple' },
      { slug: 'samsung', name: 'Samsung', shortName: 'Samsung' },
      { slug: 'xiaomi', name: 'Xiaomi', shortName: 'Xiaomi' },
      { slug: 'oppo', name: 'OPPO', shortName: 'OPPO' }
    ]
  },
  {
    id: 2,
    key: 'laptops',
    name: 'Laptop',
    fullName: 'Laptop & Máy tính',
    slug: 'laptop-may-tinh',
    aliases: ['laptops', 'laptop', 'laptop-may-tinh', 'macbook', '2'],
    icon: 'Laptop',
    allowedBrands: [
      { slug: 'apple', name: 'Apple', shortName: 'MacBook (Apple)' },
      { slug: 'asus', name: 'Asus', shortName: 'Asus' },
      { slug: 'msi', name: 'MSI', shortName: 'MSI' },
      { slug: 'acer', name: 'Acer', shortName: 'Acer' },
      { slug: 'dell', name: 'Dell', shortName: 'Dell' },
      { slug: 'lenovo', name: 'Lenovo', shortName: 'Lenovo' },
      { slug: 'hp', name: 'HP', shortName: 'HP' }
    ]
  },
  {
    id: 3,
    key: 'smartwatches',
    name: 'Đồng hồ thông minh',
    fullName: 'Đồng hồ thông minh',
    slug: 'dong-ho-thong-minh',
    aliases: ['smartwatches', 'smartwatch', 'watch', 'dong-ho-thong-minh', '3'],
    icon: 'Watch',
    allowedBrands: [
      { slug: 'apple', name: 'Apple', shortName: 'Apple Watch' },
      { slug: 'samsung', name: 'Samsung', shortName: 'Samsung' },
      { slug: 'xiaomi', name: 'Xiaomi', shortName: 'Xiaomi' },
      { slug: 'garmin', name: 'Garmin', shortName: 'Garmin' }
    ]
  },
  {
    id: 4,
    key: 'headphones',
    name: 'Tai nghe',
    fullName: 'Âm thanh & Tai nghe',
    slug: 'am-thanh-tai-nghe',
    aliases: ['headphones', 'headphone', 'audio', 'am-thanh-tai-nghe', '4'],
    icon: 'Headphones',
    allowedBrands: [
      { slug: 'sony', name: 'Sony', shortName: 'Sony' },
      { slug: 'apple', name: 'Apple', shortName: 'AirPods (Apple)' },
      { slug: 'marshall', name: 'Marshall', shortName: 'Marshall' },
      { slug: 'jbl', name: 'JBL', shortName: 'JBL' }
    ]
  },
  {
    id: 6,
    key: 'cameras',
    name: 'Cameras',
    fullName: 'Máy ảnh & Quay phim',
    slug: 'cameras',
    aliases: ['cameras', 'camera', 'may-anh', 'may-anh-quay-phim', '6'],
    icon: 'Camera',
    allowedBrands: [
      { slug: 'sony', name: 'Sony', shortName: 'Sony' },
      { slug: 'canon', name: 'Canon', shortName: 'Canon' },
      { slug: 'fujifilm', name: 'Fujifilm', shortName: 'Fujifilm' },
      { slug: 'blackmagic', name: 'Blackmagic', shortName: 'Blackmagic' }
    ]
  },
  {
    id: 9,
    key: 'gaming',
    name: 'Gaming',
    fullName: 'Gaming & Đồ họa',
    slug: 'gaming',
    aliases: ['gaming', 'game', '9'],
    icon: 'Gamepad2',
    allowedBrands: [
      { slug: 'asus', name: 'Asus', shortName: 'Asus ROG' },
      { slug: 'msi', name: 'MSI', shortName: 'MSI Gaming' },
      { slug: 'sony', name: 'Sony', shortName: 'PlayStation' },
      { slug: 'razer', name: 'Razer', shortName: 'Razer' },
      { slug: 'logitech', name: 'Logitech', shortName: 'Logitech' }
    ]
  }
];

/**
 * Find category definition by slug, key, id or any alias
 */
export const findCategoryBySlugOrId = (identifier) => {
  if (!identifier) return null;
  const str = String(identifier).toLowerCase().trim();
  return (
    CATEGORY_DEFINITIONS.find(
      (c) =>
        String(c.id) === str ||
        c.key.toLowerCase() === str ||
        c.slug.toLowerCase() === str ||
        c.aliases.includes(str)
    ) || null
  );
};

/**
 * Get the list of allowed brands for a specific category,
 * enriched with real API brand IDs and product counts if available.
 */
export const getCategoryBrands = (categoryIdentifier, allApiBrands = []) => {
  const cat = findCategoryBySlugOrId(categoryIdentifier);
  if (!cat) {
    // When viewing "All categories", return all API brands
    return allApiBrands.map((b) => ({
      ...b,
      displayName: b.name
    }));
  }

  // When viewing a specific category, strictly return only brands allowed for this category
  const allowed = cat.allowedBrands;
  const result = [];

  allowed.forEach((def) => {
    // Find matching brand from backend API by slug or name
    const apiBrand = allApiBrands.find(
      (b) =>
        b.slug?.toLowerCase() === def.slug.toLowerCase() ||
        b.name?.toLowerCase() === def.name.toLowerCase()
    );

    if (apiBrand) {
      result.push({
        ...apiBrand,
        displayName: def.shortName || apiBrand.name
      });
    } else {
      // Fallback brand entry
      result.push({
        id: def.slug,
        name: def.name,
        slug: def.slug,
        displayName: def.shortName || def.name,
        productCount: 0
      });
    }
  });

  return result;
};

