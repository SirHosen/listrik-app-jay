import pool from '../config/database.js';

// @desc    Get all tariffs
// @route   GET /api/tariffs
// @access  Private
export const getTariffs = async (req, res) => {
  try {
    const { power_capacity, is_active } = req.query;

    let query = 'SELECT * FROM tariffs WHERE 1=1';
    const params = [];

    if (power_capacity) {
      query += ' AND power_capacity = ?';
      params.push(power_capacity);
    }

    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true');
    }

    query += ' ORDER BY effective_date DESC, power_capacity ASC';

    const [tariffs] = await pool.query(query, params);

    res.json({
      success: true,
      data: tariffs
    });

  } catch (error) {
    console.error('Get tariffs error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data tarif.'
    });
  }
};

// @desc    Get active tariffs
// @route   GET /api/tariffs/active
// @access  Private
export const getActiveTariffs = async (req, res) => {
  try {
    const [tariffs] = await pool.query(
      `SELECT * FROM tariffs 
       WHERE is_active = TRUE 
       ORDER BY power_capacity ASC`
    );

    res.json({
      success: true,
      data: tariffs
    });

  } catch (error) {
    console.error('Get active tariffs error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data tarif aktif.'
    });
  }
};

// @desc    Create tariff
// @route   POST /api/tariffs
// @access  Private/Admin
export const createTariff = async (req, res) => {
  try {
    const { power_capacity, rate_per_kwh, admin_fee, tax_percentage, effective_date } = req.body;

    // Validasi input
    if (!power_capacity || !rate_per_kwh || !effective_date) {
      return res.status(400).json({
        success: false,
        message: 'Power capacity, rate per kWh, dan effective date wajib diisi.'
      });
    }

    // Insert tariff baru
    const [result] = await pool.query(
      `INSERT INTO tariffs (power_capacity, rate_per_kwh, admin_fee, tax_percentage, effective_date)
       VALUES (?, ?, ?, ?, ?)`,
      [power_capacity, rate_per_kwh, admin_fee || 0, tax_percentage || 0, effective_date]
    );

    res.status(201).json({
      success: true,
      message: 'Tarif berhasil ditambahkan.',
      data: {
        id: result.insertId
      }
    });

  } catch (error) {
    console.error('Create tariff error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan tarif.'
    });
  }
};

// @desc    Update tariff
// @route   PUT /api/tariffs/:id
// @access  Private/Admin
export const updateTariff = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate_per_kwh, admin_fee, tax_percentage, is_active } = req.body;

    // Cek tariff exists
    const [tariffs] = await pool.query(
      'SELECT id FROM tariffs WHERE id = ?',
      [id]
    );

    if (tariffs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tarif tidak ditemukan.'
      });
    }

    // Update tariff
    await pool.query(
      `UPDATE tariffs 
       SET rate_per_kwh = ?, admin_fee = ?, tax_percentage = ?, is_active = ?
       WHERE id = ?`,
      [rate_per_kwh, admin_fee, tax_percentage, is_active, id]
    );

    res.json({
      success: true,
      message: 'Tarif berhasil diperbarui.'
    });

  } catch (error) {
    console.error('Update tariff error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui tarif.'
    });
  }
};

// @desc    Delete tariff
// @route   DELETE /api/tariffs/:id
// @access  Private/Admin
export const deleteTariff = async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete - set inactive
    const [result] = await pool.query(
      'UPDATE tariffs SET is_active = FALSE WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tarif tidak ditemukan.'
      });
    }

    res.json({
      success: true,
      message: 'Tarif berhasil dinonaktifkan.'
    });

  } catch (error) {
    console.error('Delete tariff error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus tarif.'
    });
  }
};
