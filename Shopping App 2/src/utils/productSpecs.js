/**
 * Utility for parsing and formatting dynamic product technical specifications
 */

export const SPEC_PRESETS = [
  {
    id: 'phones',
    label: '📱 Mẫu Điện thoại / Tablet',
    fields: [
      'Hệ điều hành',
      'Chipset (CPU)',
      'Bộ nhớ trong (ROM)',
      'RAM',
      'Kích thước màn hình',
      'Công nghệ màn hình',
      'Độ phân giải',
      'Tần số quét',
      'Camera sau',
      'Camera trước',
      'Dung lượng pin & Sạc',
      'Thẻ SIM',
      'Cổng sạc'
    ]
  },
  {
    id: 'laptops',
    label: '💻 Mẫu Laptop / Máy tính',
    fields: [
      'Hệ điều hành',
      'Bộ vi xử lý (CPU)',
      'Card đồ họa (GPU)',
      'RAM',
      'Ổ cứng (SSD/HDD)',
      'Kích thước màn hình',
      'Độ phân giải',
      'Trọng lượng',
      'Cổng kết nối',
      'Dung lượng pin'
    ]
  },
  {
    id: 'audio',
    label: '🎧 Mẫu Tai nghe & Loa',
    fields: [
      'Thời lượng pin',
      'Cổng sạc',
      'Công nghệ âm thanh',
      'Chống ồn (ANC)',
      'Kết nối Bluetooth',
      'Trọng lượng',
      'Kháng nước & bụi'
    ]
  },
  {
    id: 'watches',
    label: '⌚ Mẫu Đồng hồ thông minh',
    fields: [
      'Kích thước màn hình',
      'Thời lượng pin',
      'Tính năng sức khỏe',
      'Chống nước',
      'Kết nối',
      'Chất liệu dây đeo',
      'Tương thích hệ điều hành'
    ]
  }
];

/**
 * Smart parser that parses both JSON structured specs and raw legacy text
 */
export const parseProductSpecs = (rawDescription) => {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return { specs: [], description: '' };
  }

  const trimmed = rawDescription.trim();

  // 1. Try parsing JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') {
        const specs = Array.isArray(obj.specifications)
          ? obj.specifications.filter((s) => s && (s.name || s.value))
          : [];
        const desc = obj.text || obj.description || '';
        return { specs, description: desc };
      }
    } catch {
      // Fall through to text parser
    }
  }

  // 2. Tech spec keywords commonly used in product descriptions
  const commonKeywords = [
    'Hệ điều hành khi ra mắt',
    'Hệ điều hành',
    'Chipset / CPU',
    'Chipset',
    'Bộ vi xử lý (CPU)',
    'Bộ vi xử lý',
    'Loại CPU',
    'Card đồ họa (GPU)',
    'GPU',
    'Bộ nhớ trong (ROM)',
    'Bộ nhớ trong',
    'Dung lượng lưu trữ',
    'Ổ cứng (SSD)',
    'Ổ cứng',
    'RAM',
    'Kích thước màn hình',
    'Công nghệ màn hình',
    'Độ phân giải màn hình',
    'Độ phân giải',
    'Tần số quét',
    'Tính năng màn hình',
    'Camera sau',
    'Camera trước',
    'Thẻ SIM',
    'SIM',
    'Công nghệ NFC',
    'Thời điểm ra mắt',
    'Dung lượng pin & Sạc',
    'Dung lượng pin',
    'Pin & Sạc',
    'Pin',
    'Cổng sạc',
    'Cổng kết nối',
    'Trọng lượng',
    'Chống nước',
    'Chống ồn',
    'Thời lượng pin',
    'Kết nối Bluetooth',
    'Kết nối',
    'Chất liệu dây đeo'
  ];

  // Sort descending by length so longer phrases match first
  const sortedKeywords = [...commonKeywords].sort((a, b) => b.length - a.length);
  const keywordEscaped = sortedKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(^|[\\r\\n•;]|(?<![\\w\\-])\\s+)(${keywordEscaped})(?:[:\\s]|$)`, 'gi');

  const matches = [];
  let m;
  while ((m = regex.exec(trimmed)) !== null) {
    matches.push({
      keyword: m[2],
      index: m.index + m[1].length
    });
  }

  // If no inline keywords matched, check line-by-line format "Tên: Giá trị"
  if (matches.length === 0) {
    const lines = trimmed.split(/[\r\n]+/);
    const specs = [];
    const nonSpecLines = [];

    lines.forEach((line) => {
      const parts = line.split(/:\s*|–\s*|-\s*/);
      if (parts.length >= 2 && parts[0].trim().length > 1 && parts[0].trim().length < 45) {
        specs.push({
          name: parts[0].trim(),
          value: parts.slice(1).join(': ').trim()
        });
      } else {
        nonSpecLines.push(line);
      }
    });

    if (specs.length >= 2) {
      return { specs, description: nonSpecLines.join('\n').trim() };
    }
    return { specs: [], description: trimmed };
  }

  // Extract values between keyword matches
  const specs = [];
  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const startVal = curr.index + curr.keyword.length;
    const endVal = (i + 1 < matches.length) ? matches[i + 1].index : trimmed.length;
    let val = trimmed.substring(startVal, endVal).trim();
    val = val.replace(/^[:–-]\s*/, '').trim();

    if (val) {
      specs.push({
        name: curr.keyword,
        value: val
      });
    }
  }

  const firstIndex = matches[0].index;
  const description = firstIndex > 0 ? trimmed.substring(0, firstIndex).trim() : '';
  return { specs, description };
};

/**
 * Format description and specifications into JSON payload for database storage
 */
export const formatProductDescription = (descriptionText, specifications = []) => {
  const cleanSpecs = (specifications || []).filter(
    (s) => s && (s.name?.trim() || s.value?.trim())
  );

  return JSON.stringify({
    text: (descriptionText || '').trim(),
    specifications: cleanSpecs
  });
};

