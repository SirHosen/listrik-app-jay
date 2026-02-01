import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private/Admin
export const getCustomers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let query = `
      SELECT c.*, u.email, u.is_active as account_active
      FROM customers c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (c.customer_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY c.created_at DESC';

    // Pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [customers] = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM customers c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const countParams = [];

    if (status) {
      countQuery += ' AND c.status = ?';
      countParams.push(status);
    }

    if (search) {
      countQuery += ' AND (c.customer_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data pelanggan.'
    });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
export const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const [customers] = await pool.query(
      `SELECT c.*, u.email, u.is_active as account_active
       FROM customers c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan.'
      });
    }

    // Get current tariff
    const [tariffs] = await pool.query(
      `SELECT * FROM tariffs 
       WHERE power_capacity = ? AND is_active = TRUE
       ORDER BY effective_date DESC LIMIT 1`,
      [customers[0].power_capacity]
    );

    res.json({
      success: true,
      data: {
        customer: customers[0],
        current_tariff: tariffs[0] || null
      }
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data pelanggan.'
    });
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private/Admin
export const createCustomer = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { email, password, full_name, address, phone, power_capacity, status = 'active' } = req.body;

    // Validasi input
    if (!email || !password || !full_name || !address || !power_capacity) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Semua field wajib diisi.'
      });
    }

    // Cek email sudah ada
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Email sudah terdaftar.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Buat user account
    const [userResult] = await connection.query(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, 'customer']
    );

    const userId = userResult.insertId;

    // Generate customer number (format: PLNYYYYMMDDXXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const customerNumber = `PLN${dateStr}${randomNum}`;

    // Buat data customer
    const [customerResult] = await connection.query(
      `INSERT INTO customers (user_id, customer_number, full_name, address, phone, power_capacity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, customerNumber, full_name, address, phone || null, power_capacity, status]
    );

    if (status === 'inactive') {
      await connection.query(
        'UPDATE users SET is_active = FALSE WHERE id = ?',
        [userId]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Pelanggan berhasil ditambahkan.',
      data: {
        id: customerResult.insertId,
        customer_number: customerNumber
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan pelanggan.'
    });
  } finally {
    connection.release();
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private/Admin
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, address, phone, power_capacity, status, email, password } = req.body;

    // Cek customer exists
    const [customers] = await pool.query(
      'SELECT id, user_id FROM customers WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan.'
      });
    }

    // Update data
    await pool.query(
      `UPDATE customers 
       SET full_name = ?, address = ?, phone = ?, power_capacity = ?, status = ?
       WHERE id = ?`,
      [full_name, address, phone, power_capacity, status, id]
    );

    if (customers[0].user_id) {
      if (email) {
        const [existingUsers] = await pool.query(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, customers[0].user_id]
        );

        if (existingUsers.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Email sudah terdaftar.'
          });
        }

        await pool.query(
          'UPDATE users SET email = ? WHERE id = ?',
          [email, customers[0].user_id]
        );
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, customers[0].user_id]
        );
      }

      if (status) {
        await pool.query(
          'UPDATE users SET is_active = ? WHERE id = ?',
          [status === 'active', customers[0].user_id]
        );
      }
    }

    res.json({
      success: true,
      message: 'Data pelanggan berhasil diperbarui.'
    });

  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui data pelanggan.'
    });
  }
};

// @desc    Delete customer (hard delete)
// @route   DELETE /api/customers/:id
// @access  Private/Admin
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek customer exists
    const [customers] = await pool.query(
      'SELECT id, user_id FROM customers WHERE id = ?',
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pelanggan tidak ditemukan.'
      });
    }

    // Hard delete customer (will cascade to meter_readings, bills, payments)
    await pool.query(
      'DELETE FROM customers WHERE id = ?',
      [id]
    );

    // Remove user account if exists
    if (customers[0].user_id) {
      await pool.query(
        'DELETE FROM users WHERE id = ?',
        [customers[0].user_id]
      );
    }

    res.json({
      success: true,
      message: 'Pelanggan berhasil dihapus.'
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus pelanggan.'
    });
  }
};
