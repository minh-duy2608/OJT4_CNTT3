-- -- ==============================================================================
-- -- Initial Schema & Seed Data Script
-- -- Automatically executed on first run of the MySQL container
-- -- ==============================================================================

-- USE `app_db`;

-- -- Example Table: users
-- CREATE TABLE IF NOT EXISTS `users` (
--     `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
--     `username` VARCHAR(50) NOT NULL UNIQUE,
--     `email` VARCHAR(100) NOT NULL UNIQUE,
--     `password` VARCHAR(255) NOT NULL,
--     `full_name` VARCHAR(100) DEFAULT NULL,
--     `role` VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
--     `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
--     `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -- Seed initial admin account (password placeholder)
-- INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password`, `full_name`, `role`, `status`)
-- VALUES 
--     (1, 'admin', 'admin@example.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8H7lS8aVzM5rWzFp1FkR9hUoQ0hH5W', 'System Administrator', 'ROLE_ADMIN', 'ACTIVE'),
--     (2, 'testuser', 'user@example.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8H7lS8aVzM5rWzFp1FkR9hUoQ0hH5W', 'Test Standard User', 'ROLE_USER', 'ACTIVE');




-- ============================================================
-- TECH SHOP DATABASE
-- MySQL 8.0.16+
-- Mô hình: Multi-vendor, RBAC, mỗi Shop tự quản lý mã giảm giá
-- Charset: utf8mb4 | Engine: InnoDB
--
-- LƯU Ý TRIỂN KHAI:
-- 1. Chạy file này trên môi trường phát triển mới.
-- 2. Không lưu mật khẩu nguyên văn. Backend phải băm BCrypt/Argon2.
-- 3. Không tự tạo tài khoản ADMIN từ API đăng ký công khai.
-- 4. Backend phải kiểm tra quyền + phạm vi dữ liệu Shop.
-- 5. Quy tắc đánh giá sau giao hàng phải được kiểm tra trong service.
-- 6. Đơn hàng, thanh toán, tồn kho và coupon cần xử lý transaction.
-- ============================================================


CREATE DATABASE IF NOT EXISTS app_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE app_db;

-- Drop theo thứ tự phụ thuộc để có thể chạy lại trong môi trường DEV.
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS returns;
DROP TABLE IF EXISTS shipments;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS coupon_usages;
DROP TABLE IF EXISTS coupon_products;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS shop_reviews;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS wishlist_items;
DROP TABLE IF EXISTS wishlists;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS brands;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS shop_members;
DROP TABLE IF EXISTS shops;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. USERS & RBAC
-- ============================================================

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NULL,
    phone VARCHAR(20) NULL,
    avatar_url VARCHAR(500) NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ROLE_USER',
    status ENUM('PENDING','ACTIVE','LOCKED','DELETED')
        NOT NULL DEFAULT 'PENDING',
    email_verified_at DATETIME NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL,
    expiry_date DATETIME NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_refresh_tokens_token (token),
    KEY idx_refresh_tokens_user (user_id),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE password_reset_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL,
    expiry_date DATETIME NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pwd_reset_tokens_token (token),
    KEY idx_pwd_reset_tokens_user (user_id),
    CONSTRAINT fk_pwd_reset_tokens_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE email_verification_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL,
    expiry_date DATETIME NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_email_verify_tokens_token (token),
    KEY idx_email_verify_tokens_user (user_id),
    CONSTRAINT fk_email_verify_tokens_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB;

CREATE TABLE user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    assigned_by BIGINT UNSIGNED NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id)
        REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by)
        REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_user_roles_role (role_id)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id)
        REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id)
        REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2. SHOPS & SHOP MEMBERS
-- ============================================================

CREATE TABLE shops (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    owner_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    description TEXT NULL,
    logo_url VARCHAR(500) NULL,
    banner_url VARCHAR(500) NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(20) NULL,
    province VARCHAR(100) NULL,
    district VARCHAR(100) NULL,
    ward VARCHAR(100) NULL,
    address_detail VARCHAR(255) NULL,
    status ENUM('PENDING','ACTIVE','SUSPENDED','REJECTED')
        NOT NULL DEFAULT 'PENDING',
    reviewed_by BIGINT UNSIGNED NULL,
    reviewed_at DATETIME NULL,
    rejection_reason VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_shops_slug (slug),
    KEY idx_shops_owner (owner_id),
    KEY idx_shops_status_created (status, created_at),
    CONSTRAINT fk_shops_owner FOREIGN KEY (owner_id)
        REFERENCES users(id),
    CONSTRAINT fk_shops_reviewed_by FOREIGN KEY (reviewed_by)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- role_id là vai trò trong phạm vi cửa hàng (SHOP_OWNER/MANAGER/STAFF).
CREATE TABLE shop_members (
    shop_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    invited_by BIGINT UNSIGNED NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shop_id, user_id),
    CONSTRAINT fk_shop_members_shop FOREIGN KEY (shop_id)
        REFERENCES shops(id) ON DELETE CASCADE,
    CONSTRAINT fk_shop_members_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_shop_members_role FOREIGN KEY (role_id)
        REFERENCES roles(id),
    CONSTRAINT fk_shop_members_invited_by FOREIGN KEY (invited_by)
        REFERENCES users(id) ON DELETE SET NULL,
    KEY idx_shop_members_user (user_id, status),
    KEY idx_shop_members_role (role_id)
) ENGINE=InnoDB;

-- ============================================================
-- 3. PRODUCT CATALOG
-- ============================================================

CREATE TABLE categories (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description TEXT NULL,
    image_url VARCHAR(500) NULL,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_slug (slug),
    KEY idx_categories_parent_status (parent_id, status),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id)
        REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE brands (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    logo_url VARCHAR(500) NULL,
    description TEXT NULL,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_brands_name (name),
    UNIQUE KEY uq_brands_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE products (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    shop_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    brand_id BIGINT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL,
    short_description VARCHAR(500) NULL,
    description LONGTEXT NULL,
    warranty_months SMALLINT UNSIGNED NULL,
    status ENUM('DRAFT','PENDING','ACTIVE','INACTIVE','REJECTED')
        NOT NULL DEFAULT 'DRAFT',
    moderation_note VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_shop_slug (shop_id, slug),
    KEY idx_products_shop_status (shop_id, status, created_at),
    KEY idx_products_category_status (category_id, status),
    KEY idx_products_brand (brand_id),
    KEY idx_products_name (name),
    CONSTRAINT fk_products_shop FOREIGN KEY (shop_id)
        REFERENCES shops(id),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id)
        REFERENCES categories(id),
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id)
        REFERENCES brands(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE product_variants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    sku VARCHAR(100) NOT NULL,
    variant_name VARCHAR(150) NOT NULL,
    attributes JSON NULL,
    price DECIMAL(15,2) NOT NULL,
    sale_price DECIMAL(15,2) NULL,
    weight_grams INT UNSIGNED NULL,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_variants_sku (sku),
    KEY idx_variants_product_status (product_id, status),
    CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id)
        REFERENCES products(id),
    CONSTRAINT chk_variant_price CHECK (price >= 0),
    CONSTRAINT chk_variant_sale_price CHECK (
        sale_price IS NULL OR (sale_price >= 0 AND sale_price <= price)
    )
) ENGINE=InnoDB;

CREATE TABLE product_images (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255) NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_product_images_product_sort (product_id, sort_order),
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE inventory (
    variant_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 0,
    reserved_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (variant_id),
    CONSTRAINT fk_inventory_variant FOREIGN KEY (variant_id)
        REFERENCES product_variants(id),
    CONSTRAINT chk_inventory_reserved CHECK (reserved_quantity <= quantity)
) ENGINE=InnoDB;

-- ============================================================
-- 4. CUSTOMER ADDRESSES, CARTS & WISHLISTS
-- ============================================================

CREATE TABLE addresses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    province VARCHAR(100) NOT NULL,
    district VARCHAR(100) NULL,
    ward VARCHAR(100) NULL,
    address_detail VARCHAR(255) NOT NULL,
    delivery_note VARCHAR(500) NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_addresses_user (user_id),
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE carts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_carts_user (user_id),
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cart_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cart_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cart_variant (cart_id, variant_id),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id)
        REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id)
        REFERENCES product_variants(id),
    CONSTRAINT chk_cart_item_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE wishlists (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL DEFAULT 'Yêu thích',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_wishlist_user_name (user_id, name),
    CONSTRAINT fk_wishlists_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE wishlist_items (
    wishlist_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (wishlist_id, product_id),
    CONSTRAINT fk_wishlist_items_wishlist FOREIGN KEY (wishlist_id)
        REFERENCES wishlists(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_items_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 5. ORDERS & ORDER ITEMS
-- Mỗi order thuộc về một Shop.
-- Giỏ hàng có sản phẩm nhiều Shop phải được tách thành nhiều orders.
-- ============================================================

CREATE TABLE orders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_code VARCHAR(50) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    shop_id BIGINT UNSIGNED NOT NULL,
    address_id BIGINT UNSIGNED NULL,

    -- Snapshot địa chỉ để địa chỉ trong sổ địa chỉ thay đổi
    -- không làm thay đổi thông tin của đơn cũ.
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,

    subtotal DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,

    status ENUM(
        'PENDING','CONFIRMED','PROCESSING','SHIPPED',
        'DELIVERED','CANCELLED','RETURNED'
    ) NOT NULL DEFAULT 'PENDING',

    payment_status ENUM(
        'UNPAID','PENDING','PAID','FAILED','PARTIALLY_REFUNDED','REFUNDED'
    ) NOT NULL DEFAULT 'UNPAID',

    note TEXT NULL,
    confirmed_at DATETIME NULL,
    shipped_at DATETIME NULL,
    delivered_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    cancellation_reason VARCHAR(500) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_code (order_code),
    KEY idx_orders_user_created (user_id, created_at),
    KEY idx_orders_shop_status_created (shop_id, status, created_at),
    KEY idx_orders_delivered (status, delivered_at),
    KEY idx_orders_payment_status (payment_status, created_at),

    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_orders_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
    CONSTRAINT fk_orders_address FOREIGN KEY (address_id)
        REFERENCES addresses(id) ON DELETE SET NULL,

    CONSTRAINT chk_orders_amounts CHECK (
        subtotal >= 0 AND discount_amount >= 0
        AND shipping_fee >= 0 AND total_amount >= 0
        AND discount_amount <= subtotal
    )
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    variant_id BIGINT UNSIGNED NULL,

    -- Snapshot để giữ lịch sử ngay cả khi sản phẩm thay đổi/ẩn.
    product_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(150) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    product_image_url VARCHAR(500) NULL,

    unit_price DECIMAL(15,2) NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,

    PRIMARY KEY (id),
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_variant (variant_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
        REFERENCES orders(id),
    CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id)
        REFERENCES product_variants(id) ON DELETE SET NULL,
    CONSTRAINT chk_order_items_values CHECK (
        unit_price >= 0 AND quantity > 0
        AND discount_amount >= 0 AND line_total >= 0
    )
) ENGINE=InnoDB;

-- ============================================================
-- 6. SHOP COUPONS (PHƯƠNG ÁN A)
-- Mỗi coupon thuộc đúng một Shop; có thể áp dụng toàn Shop
-- hoặc chỉ các sản phẩm liên kết trong coupon_products.
-- ============================================================

CREATE TABLE coupons (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    shop_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    discount_type ENUM('PERCENTAGE','FIXED_AMOUNT') NOT NULL,
    discount_value DECIMAL(15,2) NOT NULL,
    max_discount_amount DECIMAL(15,2) NULL,
    min_order_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    usage_limit INT UNSIGNED NULL,
    usage_count INT UNSIGNED NOT NULL DEFAULT 0,
    per_user_limit INT UNSIGNED NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status ENUM('DRAFT','ACTIVE','INACTIVE','EXPIRED')
        NOT NULL DEFAULT 'DRAFT',
    created_by BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_coupon_shop_code (shop_id, code),
    KEY idx_coupons_shop_status_dates (shop_id, status, start_at, end_at),
    CONSTRAINT fk_coupons_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
    CONSTRAINT fk_coupons_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT chk_coupon_discount_value CHECK (discount_value > 0),
    CONSTRAINT chk_coupon_min_order CHECK (min_order_amount >= 0),
    CONSTRAINT chk_coupon_max_discount CHECK (
        max_discount_amount IS NULL OR max_discount_amount >= 0
    ),
    CONSTRAINT chk_coupon_percent CHECK (
        discount_type <> 'PERCENTAGE' OR discount_value <= 100
    ),
    CONSTRAINT chk_coupon_dates CHECK (end_at > start_at),
    CONSTRAINT chk_coupon_usage_count CHECK (
        usage_limit IS NULL OR usage_count <= usage_limit
    )
) ENGINE=InnoDB;

CREATE TABLE coupon_products (
    coupon_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (coupon_id, product_id),
    CONSTRAINT fk_coupon_products_coupon FOREIGN KEY (coupon_id)
        REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_products_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE coupon_usages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    coupon_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    discount_amount DECIMAL(15,2) NOT NULL,
    status ENUM('APPLIED','REVERSED') NOT NULL DEFAULT 'APPLIED',
    used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reversed_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_coupon_order (coupon_id, order_id),
    KEY idx_coupon_usages_user (user_id, coupon_id),
    CONSTRAINT fk_coupon_usages_coupon FOREIGN KEY (coupon_id)
        REFERENCES coupons(id),
    CONSTRAINT fk_coupon_usages_user FOREIGN KEY (user_id)
        REFERENCES users(id),
    CONSTRAINT fk_coupon_usages_order FOREIGN KEY (order_id)
        REFERENCES orders(id),
    CONSTRAINT chk_coupon_usage_discount CHECK (discount_amount >= 0)
) ENGINE=InnoDB;

-- ============================================================
-- 7. PAYMENTS & SHIPMENTS
-- ============================================================

CREATE TABLE payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(150) NULL,
    idempotency_key VARCHAR(100) NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    status ENUM('PENDING','PROCESSING','SUCCESS','FAILED','REFUNDED')
        NOT NULL DEFAULT 'PENDING',
    payment_method VARCHAR(50) NULL,
    paid_at DATETIME NULL,
    raw_response JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_payment_provider_tx (provider, provider_transaction_id),
    UNIQUE KEY uq_payment_idempotency (idempotency_key),
    KEY idx_payments_order_status (order_id, status),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT chk_payments_amount CHECK (amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE shipments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    carrier VARCHAR(100) NULL,
    tracking_code VARCHAR(150) NULL,
    status ENUM(
        'PENDING','PICKED_UP','IN_TRANSIT','DELIVERED',
        'FAILED','RETURNING','RETURNED'
    ) NOT NULL DEFAULT 'PENDING',
    shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0,
    shipped_at DATETIME NULL,
    delivered_at DATETIME NULL,
    note VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_shipments_order (order_id),
    KEY idx_shipments_tracking (tracking_code),
    CONSTRAINT fk_shipments_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT chk_shipments_fee CHECK (shipping_fee >= 0)
) ENGINE=InnoDB;

-- ============================================================
-- 8. SHOP REVIEWS
-- Một đơn hàng chỉ có một đánh giá Shop.
-- Backend bắt buộc xác minh buyer + shop + DELIVERED trước INSERT.
-- UNIQUE(order_id) là lớp chống đánh giá trùng ở database.
-- ============================================================

CREATE TABLE shop_reviews (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    shop_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT NULL,
    status ENUM('PUBLISHED','HIDDEN') NOT NULL DEFAULT 'PUBLISHED',
    shop_reply TEXT NULL,
    replied_at DATETIME NULL,
    moderated_by BIGINT UNSIGNED NULL,
    moderated_at DATETIME NULL,
    moderation_reason VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_shop_review_order (order_id),
    KEY idx_shop_reviews_shop_status_created (shop_id, status, created_at),
    KEY idx_shop_reviews_user (user_id, created_at),
    CONSTRAINT fk_shop_reviews_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_shop_reviews_shop FOREIGN KEY (shop_id) REFERENCES shops(id),
    CONSTRAINT fk_shop_reviews_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_shop_reviews_moderator FOREIGN KEY (moderated_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_shop_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ============================================================
-- 9. RETURNS / REFUNDS
-- ============================================================

CREATE TABLE returns (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    requested_by BIGINT UNSIGNED NOT NULL,
    reason VARCHAR(500) NOT NULL,
    description TEXT NULL,
    status ENUM(
        'REQUESTED','APPROVED','REJECTED','PICKUP_PENDING',
        'RECEIVED','REFUNDED','CANCELLED'
    ) NOT NULL DEFAULT 'REQUESTED',
    refund_amount DECIMAL(15,2) NULL,
    processed_by BIGINT UNSIGNED NULL,
    processed_at DATETIME NULL,
    resolution_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_returns_order (order_id),
    KEY idx_returns_status_created (status, created_at),
    CONSTRAINT fk_returns_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_returns_requester FOREIGN KEY (requested_by) REFERENCES users(id),
    CONSTRAINT fk_returns_processor FOREIGN KEY (processed_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_returns_refund CHECK (refund_amount IS NULL OR refund_amount >= 0)
) ENGINE=InnoDB;

-- ============================================================
-- 10. AUDIT LOGS & NOTIFICATIONS
-- ============================================================

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_user_id BIGINT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NULL,
    shop_id BIGINT UNSIGNED NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    details JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_actor_created (actor_user_id, created_at),
    KEY idx_audit_entity (entity_type, entity_id),
    KEY idx_audit_shop_created (shop_id, created_at),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_shop FOREIGN KEY (shop_id)
        REFERENCES shops(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    reference_type VARCHAR(100) NULL,
    reference_id BIGINT UNSIGNED NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_user_read_created (user_id, is_read, created_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 11. DEFAULT ROLES & PERMISSIONS
-- Không tạo tài khoản ADMIN mặc định để tránh lỗ hổng bảo mật.
-- ============================================================

INSERT INTO roles (code, name, description, is_system) VALUES
('ADMIN', 'Quản trị viên', 'Quản lý toàn hệ thống', TRUE),
('CLIENT', 'Khách hàng', 'Người mua hàng', TRUE),
('SHOP_MANAGER', 'Quản lý shop', 'Quản lý và vận hành cửa hàng', TRUE);

INSERT INTO permissions (code, name, description) VALUES
('USER_VIEW', 'Xem người dùng', 'Xem danh sách tài khoản'),
('USER_CREATE', 'Tạo người dùng', 'Tạo tài khoản'),
('USER_UPDATE', 'Cập nhật người dùng', 'Sửa thông tin tài khoản'),
('USER_LOCK', 'Khóa người dùng', 'Khóa hoặc mở khóa tài khoản'),
('ROLE_VIEW', 'Xem vai trò', 'Xem danh sách vai trò'),
('ROLE_CREATE', 'Tạo vai trò', 'Tạo vai trò tùy chỉnh'),
('ROLE_UPDATE', 'Sửa vai trò', 'Cập nhật vai trò'),
('ROLE_DELETE', 'Xóa vai trò', 'Xóa vai trò tùy chỉnh'),
('ROLE_ASSIGN', 'Gán vai trò', 'Gán vai trò cho tài khoản'),
('PERMISSION_ASSIGN', 'Gán quyền', 'Gán quyền cho vai trò'),
('SHOP_VIEW_ALL', 'Xem mọi cửa hàng', 'Xem tất cả cửa hàng'),
('SHOP_APPROVE', 'Duyệt cửa hàng', 'Duyệt/từ chối đăng ký Shop'),
('SHOP_UPDATE_OWN', 'Sửa cửa hàng của mình', 'Cập nhật hồ sơ Shop được quản lý'),
('SHOP_MANAGE_ALL', 'Quản lý mọi cửa hàng', 'Quản trị mọi Shop'),
('PRODUCT_VIEW', 'Xem sản phẩm', 'Xem sản phẩm công khai'),
('PRODUCT_CREATE', 'Tạo sản phẩm', 'Tạo sản phẩm trong Shop'),
('PRODUCT_UPDATE_OWN', 'Sửa sản phẩm của Shop', 'Sửa sản phẩm trong phạm vi Shop'),
('PRODUCT_DELETE_OWN', 'Xóa sản phẩm của Shop', 'Ẩn/xóa mềm sản phẩm thuộc Shop'),
('PRODUCT_MODERATE', 'Kiểm duyệt sản phẩm', 'Duyệt/ẩn sản phẩm toàn hệ thống'),
('CATEGORY_MANAGE', 'Quản lý danh mục', 'Quản lý danh mục sản phẩm'),
('BRAND_MANAGE', 'Quản lý thương hiệu', 'Quản lý thương hiệu'),
('INVENTORY_MANAGE_OWN', 'Quản lý tồn kho', 'Quản lý tồn kho Shop'),
('COUPON_CREATE_OWN', 'Tạo mã giảm giá', 'Tạo mã cho Shop của mình'),
('COUPON_UPDATE_OWN', 'Sửa mã giảm giá', 'Sửa mã của Shop mình'),
('COUPON_VIEW_OWN', 'Xem mã giảm giá', 'Xem mã của Shop mình'),
('ORDER_VIEW_OWN', 'Xem đơn hàng Shop', 'Xem đơn hàng thuộc Shop'),
('ORDER_UPDATE_OWN', 'Xử lý đơn hàng Shop', 'Cập nhật trạng thái đơn Shop'),
('ORDER_VIEW_ALL', 'Xem mọi đơn hàng', 'Xem đơn hàng toàn hệ thống'),
('ORDER_MANAGE_ALL', 'Quản lý mọi đơn hàng', 'Quản lý đơn hàng toàn hệ thống'),
('CART_MANAGE_OWN', 'Quản lý giỏ hàng', 'Quản lý giỏ hàng cá nhân'),
('ADDRESS_MANAGE_OWN', 'Quản lý địa chỉ', 'Quản lý địa chỉ cá nhân'),
('ORDER_CREATE_OWN', 'Đặt hàng', 'Tạo đơn hàng cá nhân'),
('ORDER_VIEW_CUSTOMER', 'Xem đơn hàng cá nhân', 'Xem đơn hàng của mình'),
('ORDER_CANCEL_OWN', 'Hủy đơn hàng cá nhân', 'Hủy đơn nếu thỏa điều kiện'),
('REVIEW_CREATE_OWN', 'Đánh giá Shop', 'Đánh giá đơn giao thành công của mình'),
('REVIEW_VIEW', 'Xem đánh giá', 'Xem đánh giá công khai'),
('REVIEW_MODERATE', 'Kiểm duyệt đánh giá', 'Ẩn đánh giá vi phạm'),
('REVIEW_REPLY_OWN', 'Phản hồi đánh giá', 'Phản hồi đánh giá Shop mình'),
('REPORT_VIEW_OWN', 'Xem báo cáo Shop', 'Xem số liệu Shop mình'),
('REPORT_VIEW_ALL', 'Xem báo cáo toàn hệ thống', 'Xem báo cáo toàn hệ thống'),
('RETURN_MANAGE_OWN', 'Xử lý đổi trả Shop', 'Xử lý yêu cầu thuộc Shop'),
('RETURN_MANAGE_ALL', 'Quản lý mọi đổi trả', 'Quản lý đổi trả toàn hệ thống'),
('AUDIT_VIEW', 'Xem nhật ký', 'Xem nhật ký kiểm toán'),
('NOTIFICATION_VIEW_OWN', 'Xem thông báo', 'Xem thông báo của mình');

-- ADMIN: tất cả quyền hiện có. Các quyền nhạy cảm vẫn phải có
-- kiểm soát ở tầng service và chính sách bảo vệ tài khoản.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'ADMIN';

-- CLIENT: quyền mua hàng và quản lý dữ liệu cá nhân.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PRODUCT_VIEW','CART_MANAGE_OWN','ADDRESS_MANAGE_OWN',
    'ORDER_CREATE_OWN','ORDER_VIEW_CUSTOMER','ORDER_CANCEL_OWN',
    'REVIEW_CREATE_OWN','REVIEW_VIEW','NOTIFICATION_VIEW_OWN'
)
WHERE r.code = 'CLIENT';

-- SHOP_MANAGER: vận hành sản phẩm, coupon và đơn hàng trong Shop.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'PRODUCT_VIEW','SHOP_UPDATE_OWN','PRODUCT_CREATE',
    'PRODUCT_UPDATE_OWN','PRODUCT_DELETE_OWN','INVENTORY_MANAGE_OWN',
    'COUPON_CREATE_OWN','COUPON_UPDATE_OWN','COUPON_VIEW_OWN',
    'ORDER_VIEW_OWN','ORDER_UPDATE_OWN','REVIEW_VIEW',
    'REVIEW_REPLY_OWN','REPORT_VIEW_OWN','RETURN_MANAGE_OWN',
    'NOTIFICATION_VIEW_OWN'
)
WHERE r.code = 'SHOP_MANAGER';

-- ============================================================
-- 12. VIEWS FOR REPORTING
-- Đây là giá trị đơn hàng đã giao, chưa phải lợi nhuận kế toán.
-- Phải lọc theo quyền ở Backend; không cấp quyền truy cập DB trực tiếp
-- cho tài khoản Shop.
-- ============================================================

CREATE OR REPLACE VIEW v_shop_delivered_sales AS
SELECT
    o.shop_id,
    DATE(o.delivered_at) AS delivered_date,
    COUNT(*) AS delivered_order_count,
    SUM(o.subtotal) AS gross_merchandise_value,
    SUM(o.discount_amount) AS discount_total,
    SUM(o.shipping_fee) AS shipping_fee_total,
    SUM(o.total_amount) AS delivered_order_value
FROM orders o
WHERE o.status = 'DELIVERED'
  AND o.delivered_at IS NOT NULL
GROUP BY o.shop_id, DATE(o.delivered_at);

CREATE OR REPLACE VIEW v_admin_shop_delivered_sales AS
SELECT
    s.id AS shop_id,
    s.name AS shop_name,
    COUNT(o.id) AS delivered_order_count,
    COALESCE(SUM(o.subtotal), 0) AS gross_merchandise_value,
    COALESCE(SUM(o.discount_amount), 0) AS discount_total,
    COALESCE(SUM(o.shipping_fee), 0) AS shipping_fee_total,
    COALESCE(SUM(o.total_amount), 0) AS delivered_order_value
FROM shops s
LEFT JOIN orders o
    ON o.shop_id = s.id
   AND o.status = 'DELIVERED'
   AND o.delivered_at IS NOT NULL
GROUP BY s.id, s.name;

-- ============================================================
-- END
-- ============================================================