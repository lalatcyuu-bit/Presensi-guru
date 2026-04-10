const pool = require('../db');

/* =======================
   GET BULK APPROVAL STATUS
======================= */
exports.getBulkApprovalStatus = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT value FROM app_config WHERE key = 'bulk_approval_enabled'`
        );

        if (!result.rowCount) {
            // Kalau row belum ada, default true
            return res.json({ enabled: true });
        }

        return res.json({ enabled: result.rows[0].value === true });
    } catch (err) {
        console.error('GET BULK STATUS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   SET BULK APPROVAL STATUS
======================= */
exports.setBulkApprovalStatus = async (req, res) => {
    try {
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ message: 'enabled harus boolean' });
        }

        await pool.query(
            `INSERT INTO app_config (key, value)
       VALUES ('bulk_approval_enabled', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
            [enabled]
        );

        return res.json({
            message: `Bulk approval berhasil ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`,
            enabled
        });
    } catch (err) {
        console.error('SET BULK STATUS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};