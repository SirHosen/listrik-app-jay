-- Database Schema untuk Sistem Manajemen Listrik
-- Jalankan script ini untuk membuat struktur database

CREATE DATABASE IF NOT EXISTS aplikasi_listrik_db;
USE aplikasi_listrik_db;

-- Tabel Users (untuk autentikasi)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'customer') NOT NULL DEFAULT 'customer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Tabel Customers (data pelanggan)
CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  customer_number VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20),
  power_capacity ENUM('450', '900', '1300', '2200') NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_customer_number (customer_number),
  INDEX idx_status (status)
);

-- Tabel Tariffs (tarif listrik)
CREATE TABLE IF NOT EXISTS tariffs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  power_capacity ENUM('450', '900', '1300', '2200') NOT NULL,
  rate_per_kwh DECIMAL(10, 2) NOT NULL,
  admin_fee DECIMAL(10, 2) DEFAULT 0,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_power_capacity (power_capacity),
  INDEX idx_effective_date (effective_date)
);

-- Tabel Meter Readings (pencatatan meter)
CREATE TABLE IF NOT EXISTS meter_readings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  reading_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  previous_meter INT NOT NULL DEFAULT 0,
  current_meter INT NOT NULL,
  usage_kwh INT GENERATED ALWAYS AS (current_meter - previous_meter) STORED,
  reading_date DATE NOT NULL,
  recorded_by INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_customer_month (customer_id, reading_month),
  INDEX idx_reading_month (reading_month),
  INDEX idx_customer_id (customer_id)
);

-- Tabel Bills (tagihan)
CREATE TABLE IF NOT EXISTS bills (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  meter_reading_id INT NOT NULL,
  bill_number VARCHAR(30) UNIQUE NOT NULL,
  bill_month VARCHAR(7) NOT NULL,
  usage_kwh INT NOT NULL,
  rate_per_kwh DECIMAL(10, 2) NOT NULL,
  electricity_charge DECIMAL(12, 2) NOT NULL,
  admin_fee DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  status ENUM('unpaid', 'paid', 'overdue') DEFAULT 'unpaid',
  due_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (meter_reading_id) REFERENCES meter_readings(id) ON DELETE CASCADE,
  INDEX idx_bill_number (bill_number),
  INDEX idx_customer_id (customer_id),
  INDEX idx_bill_month (bill_month),
  INDEX idx_status (status)
);

-- Tabel Payments (pembayaran)
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bill_id INT NOT NULL,
  payment_number VARCHAR(30) UNIQUE NOT NULL,
  payment_method ENUM('cash', 'transfer') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATETIME NOT NULL,
  proof_of_payment VARCHAR(255),
  verified_by INT,
  verification_date DATETIME,
  status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_payment_number (payment_number),
  INDEX idx_bill_id (bill_id),
  INDEX idx_status (status)
);

-- Insert default tariffs
INSERT INTO tariffs (power_capacity, rate_per_kwh, admin_fee, tax_percentage, effective_date) VALUES
('450', 1352, 2500, 3, '2024-01-01'),
('900', 1444, 5000, 3, '2024-01-01'),
('1300', 1699, 7500, 5, '2024-01-01'),
('2200', 1699, 10000, 5, '2024-01-01')
ON DUPLICATE KEY UPDATE rate_per_kwh = rate_per_kwh;
