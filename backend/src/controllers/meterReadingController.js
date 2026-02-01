import pool from '../config/database.js';

// @desc    Get meter readings
// @route   GET /api/meter-readings
// @access  Private
export const getMeterReadings = async (req, res) => {
  try {
    const { customer_id, reading_month, search, page = 1, limit = 10 } = req.query;

    let query = `
      SELECT mr.*, c.customer_number, c.full_name, u.email as recorded_by_email,
             (mr.current_meter - mr.previous_meter) as usage_kwh
      FROM meter_readings mr
      JOIN customers c ON mr.customer_id = c.id
      LEFT JOIN users u ON mr.recorded_by = u.id
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
        query += ' AND mr.customer_id = ?';
        params.push(customers[0].id);
      }
    } else if (customer_id) {
      query += ' AND mr.customer_id = ?';
      params.push(customer_id);
    }

    if (reading_month) {
      query += ' AND mr.reading_month = ?';
      params.push(reading_month);
    }

    if (search) {
      query += ' AND (c.customer_number LIKE ? OR c.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY mr.reading_date DESC, mr.created_at DESC';

    // Pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [readings] = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM meter_readings mr
      JOIN customers c ON mr.customer_id = c.id
      WHERE 1=1
    `;
    const countParams = [];

    if (req.user.role === 'customer') {
      const [customers] = await pool.query(
        'SELECT id FROM customers WHERE user_id = ?',
        [req.user.id]
      );
      
      if (customers.length > 0) {
        countQuery += ' AND mr.customer_id = ?';
        countParams.push(customers[0].id);
      }
    } else if (customer_id) {
      countQuery += ' AND mr.customer_id = ?';
      countParams.push(customer_id);
    }

    if (reading_month) {
      countQuery += ' AND mr.reading_month = ?';
      countParams.push(reading_month);
    }

    if (search) {
      countQuery += ' AND (c.customer_number LIKE ? OR c.full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        readings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get meter readings error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data meter.'
    });
  }
};

// @desc    Create meter reading
// @route   POST /api/meter-readings
// @access  Private/Admin
export const createMeterReading = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { customer_id, reading_month, current_meter, reading_date, notes } = req.body;

    // Validasi input
    if (!customer_id || !reading_month || current_meter === undefined || !reading_date) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Customer, bulan pembacaan, meter saat ini, dan tanggal pembacaan wajib diisi.'
      });
    }

    // Cek duplikasi
    const [existing] = await connection.query(
      'SELECT id FROM meter_readings WHERE customer_id = ? AND reading_month = ?',
      [customer_id, reading_month]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Pembacaan meter untuk bulan ini sudah ada.'
      });
    }

    // Get previous reading
    const [previousReading] = await connection.query(
      `SELECT current_meter FROM meter_readings 
       WHERE customer_id = ? AND reading_month < ?
       ORDER BY reading_month DESC LIMIT 1`,
      [customer_id, reading_month]
    );

    const previous_meter = previousReading.length > 0 ? previousReading[0].current_meter : 0;

    // Validasi meter current >= previous
    if (current_meter < previous_meter) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Meter saat ini (${current_meter}) tidak boleh kurang dari meter sebelumnya (${previous_meter}).`
      });
    }

    // Insert meter reading
    const [result] = await connection.query(
      `INSERT INTO meter_readings 
       (customer_id, reading_month, previous_meter, current_meter, reading_date, recorded_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, reading_month, previous_meter, current_meter, reading_date, req.user.id, notes || null]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Pembacaan meter berhasil dicatat.',
      data: {
        id: result.insertId,
        usage_kwh: current_meter - previous_meter
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create meter reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mencatat pembacaan meter.'
    });
  } finally {
    connection.release();
  }
};

// @desc    Update meter reading
// @route   PUT /api/meter-readings/:id
// @access  Private/Admin
export const updateMeterReading = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_meter, reading_date, notes } = req.body;

    // Get current reading
    const [readings] = await pool.query(
      'SELECT * FROM meter_readings WHERE id = ?',
      [id]
    );

    if (readings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pembacaan meter tidak ditemukan.'
      });
    }

    const reading = readings[0];

    // Validasi meter current >= previous
    if (current_meter < reading.previous_meter) {
      return res.status(400).json({
        success: false,
        message: `Meter saat ini (${current_meter}) tidak boleh kurang dari meter sebelumnya (${reading.previous_meter}).`
      });
    }

    // Update
    await pool.query(
      `UPDATE meter_readings 
       SET current_meter = ?, reading_date = ?, notes = ?
       WHERE id = ?`,
      [current_meter, reading_date, notes, id]
    );

    res.json({
      success: true,
      message: 'Pembacaan meter berhasil diperbarui.',
      data: {
        usage_kwh: current_meter - reading.previous_meter
      }
    });

  } catch (error) {
    console.error('Update meter reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui pembacaan meter.'
    });
  }
};

// @desc    Get last meter reading for a customer
// @route   GET /api/meter-readings/last/:customerId
// @access  Private/Admin
export const getLastMeterReading = async (req, res) => {
  try {
    const { customerId } = req.params;

    const [readings] = await pool.query(
      `SELECT mr.*, c.customer_number, c.full_name, c.power_capacity, t.price_per_kwh
       FROM meter_readings mr
       JOIN customers c ON mr.customer_id = c.id
       LEFT JOIN tariffs t ON c.power_capacity = t.power_capacity
       WHERE mr.customer_id = ?
       ORDER BY mr.reading_month DESC
       LIMIT 1`,
      [customerId]
    );

    if (readings.length === 0) {
      // No previous reading, get customer info only
      const [customers] = await pool.query(
        `SELECT c.*, t.price_per_kwh
         FROM customers c
         LEFT JOIN tariffs t ON c.power_capacity = t.power_capacity
         WHERE c.id = ?`,
        [customerId]
      );

      if (customers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pelanggan tidak ditemukan.'
        });
      }

      return res.json({
        success: true,
        data: {
          customer: customers[0],
          lastReading: null,
          lastMeter: 0,
          pricePerKwh: customers[0].price_per_kwh || 0
        }
      });
    }

    res.json({
      success: true,
      data: {
        customer: {
          id: readings[0].customer_id,
          customer_number: readings[0].customer_number,
          full_name: readings[0].full_name,
          power_capacity: readings[0].power_capacity
        },
        lastReading: readings[0],
        lastMeter: readings[0].current_meter,
        lastMonth: readings[0].reading_month,
        pricePerKwh: readings[0].price_per_kwh || 0
      }
    });

  } catch (error) {
    console.error('Get last meter reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data meter terakhir.'
    });
  }
};

// @desc    Delete meter reading
// @route   DELETE /api/meter-readings/:id
// @access  Private/Admin
export const deleteMeterReading = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah sudah ada tagihan
    const [bills] = await pool.query(
      'SELECT id FROM bills WHERE meter_reading_id = ?',
      [id]
    );

    if (bills.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus pembacaan meter yang sudah memiliki tagihan.'
      });
    }

    const [result] = await pool.query(
      'DELETE FROM meter_readings WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pembacaan meter tidak ditemukan.'
      });
    }

    res.json({
      success: true,
      message: 'Pembacaan meter berhasil dihapus.'
    });

  } catch (error) {
    console.error('Delete meter reading error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus pembacaan meter.'
    });
  }
};
