import pool from '../config/database.js';

// Helper function to calculate bill amount
const calculateBill = (usage_kwh, tariff) => {
  const electricity_charge = usage_kwh * tariff.rate_per_kwh;
  const admin_fee = tariff.admin_fee || 0;
  const tax_amount = (electricity_charge * (tariff.tax_percentage || 0)) / 100;
  const total_amount = electricity_charge + admin_fee + tax_amount;

  return {
    electricity_charge,
    admin_fee,
    tax_amount,
    total_amount
  };
};

// @desc    Get bills
// @route   GET /api/bills
// @access  Private
export const getBills = async (req, res) => {
  try {
    const { customer_id, bill_month, status, search, page = 1, limit = 10 } = req.query;

    let query = `
      SELECT b.*, c.customer_number, c.full_name, c.address, c.power_capacity
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
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
    } else if (customer_id) {
      query += ' AND b.customer_id = ?';
      params.push(customer_id);
    }

    if (bill_month) {
      query += ' AND b.bill_month = ?';
      params.push(bill_month);
    }

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (b.bill_number LIKE ? OR c.customer_number LIKE ? OR c.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY b.bill_month DESC, b.created_at DESC';

    // Pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [bills] = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM bills b
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
    } else if (customer_id) {
      countQuery += ' AND b.customer_id = ?';
      countParams.push(customer_id);
    }

    if (bill_month) {
      countQuery += ' AND b.bill_month = ?';
      countParams.push(bill_month);
    }

    if (status) {
      countQuery += ' AND b.status = ?';
      countParams.push(status);
    }

    if (search) {
      countQuery += ' AND (b.bill_number LIKE ? OR c.customer_number LIKE ? OR c.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data tagihan.'
    });
  }
};

// @desc    Get single bill
// @route   GET /api/bills/:id
// @access  Private
export const getBill = async (req, res) => {
  try {
    const { id } = req.params;

    const [bills] = await pool.query(
      `SELECT b.*, c.customer_number, c.full_name, c.address, c.phone, c.power_capacity,
              mr.previous_meter, mr.current_meter, mr.reading_date
       FROM bills b
       JOIN customers c ON b.customer_id = c.id
       JOIN meter_readings mr ON b.meter_reading_id = mr.id
       WHERE b.id = ?`,
      [id]
    );

    if (bills.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tagihan tidak ditemukan.'
      });
    }

    const bill = bills[0];

    // Get payment info if exists
    const [payments] = await pool.query(
      `SELECT * FROM payments WHERE bill_id = ? ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        bill,
        payments
      }
    });

  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data tagihan.'
    });
  }
};

// @desc    Generate bill from meter reading
// @route   POST /api/bills/generate
// @access  Private/Admin
export const generateBill = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { meter_reading_id, customer_id, bill_month } = req.body;

    let reading;

    // Support dua cara: via meter_reading_id atau customer_id + bill_month
    if (meter_reading_id) {
      // Get meter reading by ID
      const [readings] = await connection.query(
        `SELECT mr.*, c.id as customer_id, c.power_capacity,
                (mr.current_meter - mr.previous_meter) as usage_kwh
         FROM meter_readings mr
         JOIN customers c ON mr.customer_id = c.id
         WHERE mr.id = ?`,
        [meter_reading_id]
      );

      if (readings.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Pembacaan meter tidak ditemukan.'
        });
      }
      reading = readings[0];
    } else if (customer_id && bill_month) {
      // Get meter reading by customer and month
      const [readings] = await connection.query(
        `SELECT mr.*, c.id as customer_id, c.power_capacity,
                (mr.current_meter - mr.previous_meter) as usage_kwh
         FROM meter_readings mr
         JOIN customers c ON mr.customer_id = c.id
         WHERE mr.customer_id = ? AND mr.reading_month = ?`,
        [customer_id, bill_month]
      );

      if (readings.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Pembacaan meter untuk bulan ini tidak ditemukan.'
        });
      }
      reading = readings[0];
    } else {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Meter reading ID atau Customer ID + Bill Month wajib diisi.'
      });
    }

    // Cek apakah sudah ada tagihan
    const [existingBills] = await connection.query(
      'SELECT id FROM bills WHERE meter_reading_id = ?',
      [reading.id]
    );

    if (existingBills.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Tagihan untuk pembacaan meter ini sudah dibuat.'
      });
    }

    // Get current tariff
    const [tariffs] = await connection.query(
      `SELECT * FROM tariffs 
       WHERE power_capacity = ? AND is_active = TRUE
       ORDER BY effective_date DESC LIMIT 1`,
      [reading.power_capacity]
    );

    if (tariffs.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Tarif tidak ditemukan untuk daya ini.'
      });
    }

    const tariff = tariffs[0];

    // Calculate bill
    const billAmounts = calculateBill(reading.usage_kwh, tariff);

    // Generate bill number (format: INV-YYYYMM-XXXX)
    const billMonth = reading.reading_month;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const billNumber = `INV-${billMonth.replace('-', '')}-${randomNum}`;

    // Calculate due date (20 hari dari sekarang)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 20);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Insert bill
    const [result] = await connection.query(
      `INSERT INTO bills 
       (customer_id, meter_reading_id, bill_number, bill_month, usage_kwh, 
        rate_per_kwh, electricity_charge, admin_fee, tax_amount, total_amount, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reading.customer_id,
        meter_reading_id,
        billNumber,
        billMonth,
        reading.usage_kwh,
        tariff.rate_per_kwh,
        billAmounts.electricity_charge,
        billAmounts.admin_fee,
        billAmounts.tax_amount,
        billAmounts.total_amount,
        dueDateStr
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Tagihan berhasil dibuat.',
      data: {
        id: result.insertId,
        bill_number: billNumber,
        total_amount: billAmounts.total_amount
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Generate bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat tagihan.'
    });
  } finally {
    connection.release();
  }
};

// @desc    Update bill status (manual)
// @route   PUT /api/bills/:id/status
// @access  Private/Admin
export const updateBillStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['unpaid', 'paid', 'overdue'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid.'
      });
    }

    const [result] = await pool.query(
      'UPDATE bills SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tagihan tidak ditemukan.'
      });
    }

    res.json({
      success: true,
      message: 'Status tagihan berhasil diperbarui.'
    });

  } catch (error) {
    console.error('Update bill status error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui status tagihan.'
    });
  }
};

// @desc    Delete bill
// @route   DELETE /api/bills/:id
// @access  Private/Admin
export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah sudah ada pembayaran
    const [payments] = await pool.query(
      'SELECT id FROM payments WHERE bill_id = ?',
      [id]
    );

    if (payments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus tagihan yang sudah memiliki pembayaran.'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM bills WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tagihan tidak ditemukan.'
      });
    }

    res.json({
      success: true,
      message: 'Tagihan berhasil dihapus.'
    });

  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus tagihan.'
    });
  }
};

// @desc    Bulk generate bills for a specific month
// @route   POST /api/bills/generate-bulk
// @access  Private/Admin
export const generateBulkBills = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { bill_month } = req.body;
    
    // Jika tidak ada bill_month, gunakan bulan sekarang
    let targetMonth = bill_month;
    if (!targetMonth) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      targetMonth = `${year}-${month}`;
    }

    // Get all meter readings untuk bulan tersebut yang belum ada tagihannya
    const [readings] = await connection.query(
      `SELECT mr.*, c.id as customer_id, c.power_capacity, c.full_name
       FROM meter_readings mr
       JOIN customers c ON mr.customer_id = c.id
       LEFT JOIN bills b ON mr.id = b.meter_reading_id
       WHERE mr.reading_month = ? 
       AND c.status = 'active'
       AND b.id IS NULL`,
      [targetMonth]
    );

    if (readings.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: `Tidak ada pembacaan meter untuk bulan ${targetMonth} yang belum dibuat tagihannya.`
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const reading of readings) {
      try {
        // Get tariff untuk power capacity customer ini
        const [tariffs] = await connection.query(
          `SELECT * FROM tariffs 
           WHERE power_capacity = ? AND is_active = TRUE
           ORDER BY effective_date DESC LIMIT 1`,
          [reading.power_capacity]
        );

        if (tariffs.length === 0) {
          failedCount++;
          errors.push(`${reading.full_name}: Tarif tidak ditemukan untuk daya ${reading.power_capacity}VA`);
          continue;
        }

        const tariff = tariffs[0];

        // Calculate bill
        const billAmounts = calculateBill(reading.usage_kwh, tariff);

        // Generate bill number
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const billNumber = `INV-${targetMonth.replace('-', '')}-${randomNum}`;

        // Calculate due date (20 hari dari sekarang)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 20);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        // Insert bill
        await connection.query(
          `INSERT INTO bills 
           (customer_id, meter_reading_id, bill_number, bill_month, usage_kwh, 
            rate_per_kwh, electricity_charge, admin_fee, tax_amount, total_amount, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reading.customer_id,
            reading.id,
            billNumber,
            targetMonth,
            reading.usage_kwh,
            tariff.rate_per_kwh,
            billAmounts.electricity_charge,
            billAmounts.admin_fee,
            billAmounts.tax_amount,
            billAmounts.total_amount,
            dueDateStr
          ]
        );

        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`${reading.full_name}: ${error.message}`);
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Berhasil generate ${successCount} tagihan untuk bulan ${targetMonth}.`,
      data: {
        month: targetMonth,
        total_readings: readings.length,
        success_count: successCount,
        failed_count: failedCount,
        errors: failedCount > 0 ? errors : undefined
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Bulk generate bills error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat membuat tagihan.'
    });
  } finally {
    connection.release();
  }
};
