const pool = require('../db');

/* =======================
   GET BULK APPROVAL STATUS
======================= */
exports.getBulkApprovalStatus = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT value FROM app_config WHERE key = 'bulk_approval_enabled'`
        );
        if (!result.rowCount) return res.json({ enabled: true });
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

        // Insert log
        const actor = req.user?.name || req.user?.username || 'Admin'
        await pool.query(
            `INSERT INTO activity_logs (action, actor) VALUES ($1, $2)`,
            [enabled ? 'enabled' : 'disabled', actor]
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

/* =======================
   GET ACTIVITY LOGS
======================= */
exports.getActivityLogs = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, action, actor,
                    TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY, HH24:MI') AS time
             FROM activity_logs
             ORDER BY created_at DESC
             LIMIT 5`
        );
        return res.json(result.rows);
    } catch (err) {
        console.error('GET ACTIVITY LOGS ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};