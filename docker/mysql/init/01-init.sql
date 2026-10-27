-- ==============================================================================
-- Initial Schema & Seed Data Script
-- Automatically executed on first run of the MySQL container
-- ==============================================================================

USE `app_db`;

-- Example Table: users
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) DEFAULT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed initial admin account (password placeholder)
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password`, `full_name`, `role`, `status`)
VALUES 
    (1, 'admin', 'admin@example.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8H7lS8aVzM5rWzFp1FkR9hUoQ0hH5W', 'System Administrator', 'ROLE_ADMIN', 'ACTIVE'),
    (2, 'testuser', 'user@example.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8H7lS8aVzM5rWzFp1FkR9hUoQ0hH5W', 'Test Standard User', 'ROLE_USER', 'ACTIVE');
