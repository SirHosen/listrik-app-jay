# ⚡ Aplikasi Listrik - Sistem Informasi Manajemen Listrik

Sistem manajemen listrik berbasis web (simulasi PLN) yang dibangun dengan React, Express.js, dan MySQL.

---

## 📋 Daftar Isi

1. [Tentang Aplikasi](#tentang-aplikasi)
2. [Fitur Sistem](#fitur-sistem)
3. [Teknologi yang Digunakan](#teknologi-yang-digunakan)
4. [Struktur Database](#struktur-database)
5. [Alur Kerja Sistem](#alur-kerja-sistem)
6. [Struktur Proyek](#struktur-proyek)
7. [Cara Menjalankan](#cara-menjalankan)
8. [API Endpoints](#api-endpoints)
9. [Akun Default](#akun-default)

---

## Tentang Aplikasi

Aplikasi Listrik adalah sistem informasi untuk mengelola:
- Data pelanggan listrik
- Pencatatan meter bulanan
- Tarif listrik berdasarkan daya
- Pembuatan tagihan otomatis
- Pembayaran dan verifikasi

Sistem ini memiliki 2 role pengguna:
- **Admin**: Mengelola semua data dan verifikasi pembayaran
- **Customer**: Melihat tagihan dan melakukan pembayaran

---

## Fitur Sistem

### 👨‍💼 Admin / Petugas
| Fitur | Deskripsi |
|-------|-----------|
| Manajemen Pelanggan | Tambah, edit, hapus data pelanggan |
| Manajemen Tarif | Atur tarif per kapasitas daya (450/900/1300/2200 VA) |
| Pencatatan Meter | Catat pembacaan meter bulanan dengan auto-fill meter sebelumnya |
| Generate Tagihan | Generate tagihan otomatis atau manual |
| Verifikasi Pembayaran | Verifikasi atau tolak pembayaran pelanggan |
| Dashboard | Statistik pelanggan, tagihan, dan pendapatan |

### 👤 Pelanggan
| Fitur | Deskripsi |
|-------|-----------|
| Dashboard | Ringkasan pemakaian dan tagihan |
| Riwayat Pemakaian | Lihat histori pemakaian listrik bulanan |
| Tagihan Saya | Lihat dan bayar tagihan |
| Riwayat Pembayaran | Lihat status pembayaran |

---

## Teknologi yang Digunakan

### Backend
| Teknologi | Fungsi |
|-----------|--------|
| Node.js | Runtime JavaScript |
| Express.js | REST API Framework |
| MySQL | Database |
| JWT | Authentication |
| bcryptjs | Password Hashing |

### Frontend
| Teknologi | Fungsi |
|-----------|--------|
| React 18 | UI Framework |
| Vite | Build Tool |
| TailwindCSS | Styling |
| React Router | Navigation |
| Axios | HTTP Client |
| React Hot Toast | Notifications |
| Lucide React | Icons |

---

## Struktur Database

### Entity Relationship Diagram (ERD)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │  customers  │       │   tariffs   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ user_id(FK) │       │ id (PK)     │
│ email       │       │ id (PK)     │       │ power_cap   │
│ password    │       │ customer_no │       │ rate_per_kwh│
│ role        │       │ full_name   │       │ admin_fee   │
│ is_active   │       │ address     │       │ tax_pct     │
└─────────────┘       │ phone       │       │ effective_dt│
                      │ power_cap   │       │ is_active   │
                      │ status      │       └─────────────┘
                      └──────┬──────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌─────────────────────┐       ┌─────────────────────┐
│   meter_readings    │       │       bills         │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │◄──────│ meter_reading_id(FK)│
│ customer_id (FK)    │       │ id (PK)             │
│ reading_month       │       │ customer_id (FK)    │
│ previous_meter      │       │ bill_number         │
│ current_meter       │       │ bill_month          │
│ usage_kwh (computed)│       │ usage_kwh           │
│ reading_date        │       │ total_amount        │
│ recorded_by (FK)    │       │ status              │
└─────────────────────┘       │ due_date            │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │      payments       │
                              ├─────────────────────┤
                              │ id (PK)             │
                              │ bill_id (FK)        │
                              │ payment_number      │
                              │ payment_method      │
                              │ amount              │
                              │ status              │
                              │ verified_by (FK)    │
                              └─────────────────────┘
```

### Tabel Database

#### 1. `users` - Data Autentikasi
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | INT PK | Primary Key |
| email | VARCHAR(100) | Email unik untuk login |
| password | VARCHAR(255) | Password ter-hash |
| role | ENUM | 'admin' atau 'customer' |
| is_active | BOOLEAN | Status akun aktif |

#### 2. `customers` - Data Pelanggan
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | INT PK | Primary Key |
| user_id | INT FK | Relasi ke users |
| customer_number | VARCHAR(20) | Nomor pelanggan unik (PLN...) |
| full_name | VARCHAR(100) | Nama lengkap |
| address | TEXT | Alamat |
| phone | VARCHAR(20) | Nomor telepon |
| power_capacity | ENUM | '450', '900', '1300', '2200' VA |
| status | ENUM | 'active' atau 'inactive' |

#### 3. `tariffs` - Tarif Listrik
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | INT PK | Primary Key |
| power_capacity | ENUM | Kapasitas daya |
| rate_per_kwh | DECIMAL | Harga per kWh |
| admin_fee | DECIMAL | Biaya admin |
| tax_percentage | DECIMAL | Persentase pajak |
| effective_date | DATE | Tanggal berlaku |
| is_active | BOOLEAN | Status aktif |

#### 4. `meter_readings` - Pencatatan Meter
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | INT PK | Primary Key |
| customer_id | INT FK | Relasi ke customers |
| reading_month | VARCHAR(7) | Format YYYY-MM |
| previous_meter | INT | Meter bulan lalu |
| current_meter | INT | Meter saat ini |
| usage_kwh | INT (computed) | current - previous |
| reading_date | DATE | Tanggal pencatatan |
| recorded_by | INT FK | Admin yang mencatat |

#### 5. `bills` - Tagihan
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | INT PK | Primary Key |
| customer_id | INT FK | Relasi ke customers |
| meter_reading_id | INT FK | Relasi ke meter_readings |
| bill_number | VARCHAR(30) | Nomor tagihan unik |
| bill_month | VARCHAR(7) | Periode tagihan |
| usage_kwh | INT | Pemakaian kWh |
| rate_per_kwh | DECIMAL | Tarif saat itu |
| electricity_charge | DECIMAL | Biaya listrik |
| admin_fee | DECIMAL | Biaya admin |
| tax_amount | DECIMAL | Pajak |
| total_amount | DECIMAL | Total tagihan |
| status | ENUM | 'unpaid', 'paid', 'overdue' |
| due_date | DATE | Tanggal jatuh tempo |

#### 6. `payments` - Pembayaran
| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| id | INT PK | Primary Key |
| bill_id | INT FK | Relasi ke bills |
| payment_number | VARCHAR(30) | Nomor pembayaran unik |
| payment_method | ENUM | 'cash' atau 'transfer' |
| amount | DECIMAL | Jumlah bayar |
| payment_date | DATETIME | Tanggal bayar |
| status | ENUM | 'pending', 'verified', 'rejected' |
| verified_by | INT FK | Admin yang verifikasi |

---

## Alur Kerja Sistem

### Alur Admin

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. Tambah    │────►│ 2. Catat     │────►│ 3. Generate  │
│   Pelanggan  │     │   Meter      │     │   Tagihan    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 6. Selesai   │◄────│ 5. Verifikasi│◄────│ 4. Customer  │
│   (Lunas)    │     │   Pembayaran │     │   Bayar      │
└──────────────┘     └──────────────┘     └──────────────┘
```

#### Detail Langkah:

1. **Tambah Pelanggan**
   - Admin input: nama, alamat, email, password, kapasitas daya
   - Sistem generate nomor pelanggan (PLN + tanggal + random)
   - Akun customer otomatis dibuat

2. **Catat Meter Bulanan**
   - Pilih pelanggan → sistem tampilkan meter terakhir
   - Input meter saat ini → sistem hitung pemakaian
   - Estimasi tagihan ditampilkan sebelum simpan

3. **Generate Tagihan**
   - Otomatis saat catat meter (checkbox)
   - Atau manual dari halaman Tagihan
   - Sistem hitung: `(usage × tarif) + admin_fee + pajak`

4. **Customer Bayar**
   - Login sebagai customer
   - Lihat tagihan di "Tagihan Saya"
   - Klik "Bayar" → pilih metode → submit

5. **Admin Verifikasi**
   - Lihat pembayaran pending di "Pembayaran"
   - Klik "Verifikasi" atau "Tolak"
   - Jika verified → status bill = 'paid'

### Alur Customer

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 1. Login     │────►│ 2. Lihat     │────►│ 3. Bayar     │
│              │     │   Dashboard  │     │   Tagihan    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
                     ┌──────────────┐     ┌──────────────┐
                     │ 5. Lunas     │◄────│ 4. Tunggu    │
                     │              │     │   Verifikasi │
                     └──────────────┘     └──────────────┘
```

---

## Struktur Proyek

```
aplikasi-listrik/
├── backend/                    # Express.js API Server
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js     # Koneksi MySQL
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── billController.js
│   │   │   ├── customerController.js
│   │   │   ├── meterReadingController.js
│   │   │   ├── paymentController.js
│   │   │   └── tariffController.js
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT Authentication
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── billRoutes.js
│   │   │   ├── customerRoutes.js
│   │   │   ├── meterReadingRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   └── tariffRoutes.js
│   │   ├── scripts/
│   │   │   ├── schema.sql      # Database Schema
│   │   │   └── setupDatabase.js
│   │   └── server.js           # Entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── FormInput.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── PageHeader.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── Table.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Bills.jsx       # Admin: Kelola tagihan
│   │   │   ├── Customers.jsx   # Admin: Kelola pelanggan
│   │   │   ├── Dashboard.jsx   # Dashboard admin/customer
│   │   │   ├── Login.jsx
│   │   │   ├── MeterReadings.jsx # Admin: Catat meter
│   │   │   ├── MyBills.jsx     # Customer: Tagihan saya
│   │   │   ├── PaymentHistory.jsx # Customer: Riwayat bayar
│   │   │   ├── Payments.jsx    # Admin: Verifikasi bayar
│   │   │   ├── Tariffs.jsx     # Admin: Kelola tarif
│   │   │   └── Usage.jsx       # Customer: Pemakaian
│   │   ├── utils/
│   │   │   ├── api.js          # Axios instance
│   │   │   └── helpers.js      # Format currency, dll
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── .github/
│   └── copilot-instructions.md
├── .gitignore
└── DOCUMENTATION.md            # File ini
```

---

## Cara Menjalankan

### Prasyarat

Pastikan sudah terinstall:
- **Node.js** v18 atau lebih tinggi
- **MySQL** v8.0 atau lebih tinggi
- **npm** atau **yarn**

### Langkah 1: Clone Repository

```bash
git clone <repository-url>
cd aplikasi-listrik
```

### Langkah 2: Setup Backend

```bash
# Masuk ke folder backend
cd backend

# Install dependencies
npm install

# Copy file environment
cp .env.example .env

# Edit .env sesuai konfigurasi MySQL Anda
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=password_anda
# DB_NAME=aplikasi_listrik_db
# JWT_SECRET=secret_key_anda
```

### Langkah 3: Setup Database

```bash
# Pastikan MySQL sudah running
# Jalankan script setup
npm run db:setup
```

Script ini akan:
- ✅ Membuat database `aplikasi_listrik_db`
- ✅ Membuat semua tabel
- ✅ Insert tarif default (450/900/1300/2200 VA)
- ✅ Membuat akun admin default

### Langkah 4: Jalankan Backend

```bash
npm run dev
```

Backend berjalan di: **http://localhost:5000**

### Langkah 5: Setup Frontend

Buka terminal baru:

```bash
# Masuk ke folder frontend
cd frontend

# Install dependencies
npm install

# Copy file environment (opsional)
cp .env.example .env
```

### Langkah 6: Jalankan Frontend

```bash
npm run dev
```

Frontend berjalan di: **http://localhost:5173**

### Langkah 7: Akses Aplikasi

Buka browser dan akses: **http://localhost:5173**

---

## API Endpoints

### Authentication
| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/change-password` | Ganti password | Private |

### Customers
| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/api/customers` | List pelanggan | Admin |
| GET | `/api/customers/:id` | Detail pelanggan | Admin |
| POST | `/api/customers` | Tambah pelanggan | Admin |
| PUT | `/api/customers/:id` | Update pelanggan | Admin |
| DELETE | `/api/customers/:id` | Hapus pelanggan | Admin |

### Tariffs
| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/api/tariffs` | List tarif | Private |
| GET | `/api/tariffs/active` | Tarif aktif | Private |
| POST | `/api/tariffs` | Tambah tarif | Admin |
| PUT | `/api/tariffs/:id` | Update tarif | Admin |
| DELETE | `/api/tariffs/:id` | Hapus tarif | Admin |

### Meter Readings
| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/api/meter-readings` | List pembacaan | Private |
| GET | `/api/meter-readings/last/:customerId` | Meter terakhir | Admin |
| POST | `/api/meter-readings` | Catat meter | Admin |
| PUT | `/api/meter-readings/:id` | Update meter | Admin |
| DELETE | `/api/meter-readings/:id` | Hapus meter | Admin |

### Bills
| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/api/bills` | List tagihan | Private |
| GET | `/api/bills/:id` | Detail tagihan | Private |
| POST | `/api/bills/generate` | Generate tagihan | Admin |
| POST | `/api/bills/generate-bulk` | Generate bulk | Admin |
| PUT | `/api/bills/:id/status` | Update status | Admin |
| DELETE | `/api/bills/:id` | Hapus tagihan | Admin |

### Payments
| Method | Endpoint | Deskripsi | Akses |
|--------|----------|-----------|-------|
| GET | `/api/payments` | List pembayaran | Private |
| POST | `/api/payments` | Submit pembayaran | Private |
| PUT | `/api/payments/:id/verify` | Verifikasi bayar | Admin |
| GET | `/api/payments/stats` | Statistik bayar | Admin |

---

## Akun Default

Setelah setup database, gunakan kredensial berikut untuk login:

### Admin
- **Email**: `admin@listrik.com`
- **Password**: `admin123`

### Customer (buat via admin)
1. Login sebagai admin
2. Buka menu "Pelanggan"
3. Klik "Tambah Pelanggan"
4. Isi form dengan email dan password untuk customer

---

## Formula Perhitungan Tagihan

```
Pemakaian (kWh) = Meter Sekarang - Meter Sebelumnya
Biaya Listrik   = Pemakaian × Tarif per kWh
Pajak           = Biaya Listrik × (Persentase Pajak / 100)
Total Tagihan   = Biaya Listrik + Biaya Admin + Pajak
```

### Contoh:
- Meter sebelumnya: 1000 kWh
- Meter sekarang: 1150 kWh
- Daya: 900 VA (Tarif: Rp 1.444/kWh, Admin: Rp 5.000, Pajak: 3%)

```
Pemakaian     = 1150 - 1000 = 150 kWh
Biaya Listrik = 150 × 1.444 = Rp 216.600
Pajak         = 216.600 × 0.03 = Rp 6.498
Total         = 216.600 + 5.000 + 6.498 = Rp 228.098
```

---

## Tarif Default

| Daya (VA) | Tarif/kWh | Admin Fee | Pajak |
|-----------|-----------|-----------|-------|
| 450 | Rp 1.352 | Rp 2.500 | 3% |
| 900 | Rp 1.444 | Rp 5.000 | 3% |
| 1300 | Rp 1.699 | Rp 7.500 | 5% |
| 2200 | Rp 1.699 | Rp 10.000 | 5% |

---

## Troubleshooting

### Error: Database connection failed
- Pastikan MySQL sudah running
- Cek konfigurasi di file `.env`
- Pastikan user MySQL memiliki akses ke database

### Error: Port already in use
- Backend default port: 5000
- Frontend default port: 5173
- Ganti port di `.env` jika bentrok

### Error: Module not found
- Jalankan `npm install` di folder yang error

---

*Sistem Informasi Manajemen Listrik v1.0*
