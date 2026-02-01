import pool from '../config/database.js';

// @desc    Get payments
// @route   GET /api/payments
// @access  Private
export const getPayments = async (req, res) => {
  try {
    const { bill_id, status, search, page = 1, limit = 10 } = req.query;

    let query = `
      SELECT p.*, b.bill_number, b.bill_month, b.total_amount as bill_amount,
             c.customer_number, c.full_name,
             u.email as verified_by_email
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u ON p.verified_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by customer (for customer role)
    if (req.user.role === 'customer') {
      const [customers] = await pool.query(
        'SELECT id FROM customers WHERE user_id = ?',
        [req.user.id]
      );
      
      if (customers.length > 0) {
        query += ' AND b.customer_id = ?';
        params.push(customers[0].id);
      }
    }

    if (bill_id) {
      query += ' AND p.bill_id = ?';
      params.push(bill_id);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (p.payment_number LIKE ? OR b.bill_number LIKE ? OR c.customer_number LIKE ? OR c.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY p.created_at DESC';

    // Pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [payments] = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      JOIN customers c ON b.customer_id = c.id
      WHERE 1=1
    `;
    const countParams = [];

    if (req.user.role === 'customer') {
      const [customers] = await pool.query(
        'SELECT id FROM customers WHERE user_id = ?',
        [req.user.id]
      );
      
      if (customers.length > 0) {
        countQuery += ' AND b.customer_id = ?';
        countParams.push(customers[0].id);
      }
    }

    if (bill_id) {
      countQuery += ' AND p.bill_id = ?';
      countParams.push(bill_id);
    }

    if (status) {
      countQuery += ' AND p.status = ?';
      countParams.push(status);
    }

    if (search) {
      countQuery += ' AND (p.payment_number LIKE ? OR b.bill_number LIKE ? OR c.customer_number LIKE ? OR c.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data pembayaran.'
    });
  }
};

// @desc    Create payment (customer)
// @route   POST /api/payments
// @access  Private/Customer
export const createPayment = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { bill_id, payment_method, amount, notes } = req.body;

    // Validasi input
    if (!bill_id || !payment_method || !amount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Bill ID, metode pembayaran, dan jumlah wajib diisi.'
      });
    }

    // Get bill info
    const [bills] = await connection.query(
      `SELECT b.*, c.user_id
       FROM bills b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.id = ?`,
      [bill_id]
    );

    if (bills.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Tagihan tidak ditemukan.'
      });
    }

    const bill = bills[0];

    // Jika customer, pastikan tagihan miliknya
    if (req.user.role === 'customer' && bill.user_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke tagihan ini.'
      });
    }

    // Cek status tagihan
    if (bill.status === 'paid') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tagihan ini sudah dibayar.'
      });
    }

    // Validasi jumlah pembayaran
    if (parseFloat(amount) !== parseFloat(bill.total_amount)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Jumlah pembayaran harus sama dengan total tagihan (Rp ${bill.total_amount}).`
      });
    }

    // Generate payment number (format: PAY-YYYYMMDDHHMMSS-XXX)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const randomNum = Math.floor(100 + Math.random() * 900);
    const paymentNumber = `PAY-${dateStr}-${randomNum}`;

    // Insert payment
    const [result] = await connection.query(
      `INSERT INTO payments 
       (bill_id, payment_number, payment_method, amount, payment_date, notes, status)
       VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
      [bill_id, paymentNumber, payment_method, amount, notes || null, 'pending']
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Pembayaran berhasil dibuat. Menunggu verifikasi admin.',
      data: {
        id: result.insertId,
        payment_number: paymentNumber
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat pembayaran.'
    });
  } finally {
    connection.release();
  }
};

// @desc    Verify payment (admin)
// @route   PUT /api/payments/:id/verify
// @access  Private/Admin
export const verifyPayment = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status, notes } = req.body; // status: 'verified' or 'rejected'

    if (!['verified', 'rejected'].includes(status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Status harus verified atau rejected.'
      });
    }

    // Get payment info
    const [payments] = await connection.query(
      'SELECT * FROM payments WHERE id = ?',
      [id]
    );

    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pembayaran tidak ditemukan.'
      });
    }

    const payment = payments[0];

    if (payment.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Pembayaran ini sudah diverifikasi sebelumnya.'
      });
    }

    // Update payment status
    await connection.query(
      `UPDATE payments 
       SET status = ?, verified_by = ?, verification_date = NOW(), notes = ?
       WHERE id = ?`,
      [status, req.user.id, notes || payment.notes, id]
    );

    // Jika verified, update bill status menjadi paid
    if (status === 'verified') {
      await connection.query(
        'UPDATE bills SET status = ? WHERE id = ?',
        ['paid', payment.bill_id]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: status === 'verified' 
        ? 'Pembayaran berhasil diverifikasi. Tagihan sudah lunas.'
        : 'Pembayaran ditolak.'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memverifikasi pembayaran.'
    });
  } finally {
    connection.release();
  }
};

// @desc    Get payment statistics (admin)
// @route   GET /api/payments/statistics
// @access  Private/Admin
export const getPaymentStatistics = async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM

    let dateFilter = '';
    const params = [];

    if (month) {
      dateFilter = 'AND DATE_FORMAT(p.payment_date, "%Y-%m") = ?';
      params.push(month);
    }

    // Total pembayaran verified
    const [totalVerified] = await pool.query(
      `SELECT COUNT(*) as count, SUM(amount) as total
       FROM payments p
       WHERE status = 'verified' ${dateFilter}`,
      params
    );

    // Total pending
    const [totalPending] = await pool.query(
      `SELECT COUNT(*) as count, SUM(amount) as total
       FROM payments p
       WHERE status = 'pending' ${dateFilter}`,
      params
    );

    // Total rejected
    const [totalRejected] = await pool.query(
      `SELECT COUNT(*) as count
       FROM payments p
       WHERE status = 'rejected' ${dateFilter}`,
      params
    );

    res.json({
      success: true,
      data: {
        verified: {
          count: totalVerified[0].count || 0,
          total_amount: totalVerified[0].total || 0
        },
        pending: {
          count: totalPending[0].count || 0,
          total_amount: totalPending[0].total || 0
        },
        rejected: {
          count: totalRejected[0].count || 0
        }
      }
    });

  } catch (error) {
    console.error('Get payment statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil statistik pembayaran.'
    });
  }
};
