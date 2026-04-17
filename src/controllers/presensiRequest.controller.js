const pool = require('../db');
const { getWIBDate } = require('../utils/timezone');

/* =======================
   POST /presensi-requests
   KM kirim request presensi yang sudah lewat hari + jam 23:59
======================= */
exports.createRequest = async (req, res) => {
    try {
        const { id_jadwal, tanggal } = req.body;
        const { id: requested_by, id_kelas } = req.user;

        if (!id_jadwal || !tanggal) {
            return res.status(400).json({ message: 'id_jadwal dan tanggal wajib diisi' });
        }

        const today = getWIBDate();

        // Hanya boleh request untuk tanggal yang sudah lewat (bukan hari ini atau masa depan)
        if (tanggal >= today) {
            return res.status(400).json({
                message: 'Request hanya bisa dilakukan untuk jadwal yang sudah lewat hari ini jam 23:59'
            });
        }

        // Pastikan jadwal milik kelas user
        const jadwalCheck = await pool.query(
            `SELECT id_jadwal FROM jadwal WHERE id_jadwal = $1 AND id_kelas = $2`,
            [id_jadwal, id_kelas]
        );
        if (!jadwalCheck.rowCount) {
            return res.status(404).json({ message: 'Jadwal tidak ditemukan atau bukan milik kelas Anda' });
        }

        // Cek kalau sudah ada presensi untuk jadwal+tanggal ini (sudah diisi, tidak perlu request)
        const presensiCheck = await pool.query(
            `SELECT id_presensi FROM presensi_guru WHERE id_jadwal = $1 AND tanggal = $2`,
            [id_jadwal, tanggal]
        );
        if (presensiCheck.rowCount) {
            return res.status(409).json({ message: 'Presensi untuk jadwal ini sudah ada' });
        }

        // Cek kalau sudah dibuka manual oleh admin (mutual exclusion)
        const openedCheck = await pool.query(
            `SELECT id FROM jadwal_dibuka WHERE id_jadwal = $1 AND tanggal = $2`,
            [id_jadwal, tanggal]
        );
        if (openedCheck.rowCount) {
            return res.status(409).json({
                message: 'Jadwal ini sudah dibuka langsung oleh admin. Silakan isi presensi sekarang.'
            });
        }

        // Upsert: kalau sudah ada request (misal Rejected), update jadi Pending lagi
        const result = await pool.query(
            `INSERT INTO presensi_requests
         (id_jadwal, tanggal, id_kelas, requested_by, status, alasan_reject, opened_at, updated_at)
       VALUES ($1, $2, $3, $4, 'Pending', NULL, NULL, NOW())
       ON CONFLICT (id_jadwal, tanggal, requested_by)
       DO UPDATE SET
         status        = 'Pending',
         alasan_reject = NULL,
         opened_at     = NULL,
         updated_at    = NOW()
       RETURNING *`,
            [id_jadwal, tanggal, id_kelas, requested_by]
        );

        res.status(201).json({
            message: 'Request presensi berhasil dikirim. Menunggu persetujuan admin.',
            data: result.rows[0]
        });

    } catch (err) {
        console.error('❌ createRequest ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   GET /presensi-requests
   Admin lihat semua request (dengan filter status, kelas, tanggal)
======================= */
exports.getRequests = async (req, res) => {
    try {
        const { status, id_kelas, tanggal_mulai, tanggal_selesai, search } = req.query;

        const today = getWIBDate();
        const dateStart = tanggal_mulai || today;
        const dateEnd = tanggal_selesai || today;

        const params = [dateStart, dateEnd];
        const conditions = [`pr.tanggal BETWEEN $1 AND $2`];

        if (status) {
            params.push(status);
            conditions.push(`pr.status = $${params.length}`);
        }

        if (id_kelas) {
            params.push(parseInt(id_kelas));
            conditions.push(`pr.id_kelas = $${params.length}`);
        }

        if (search && search.trim()) {
            params.push(`%${search.trim()}%`);
            const idx = params.length;
            conditions.push(`(
        (j.guru->>'nama_guru') ILIKE $${idx}
        OR (j.guru->'mapel'->>'nama_mapel') ILIKE $${idx}
        OR k.name ILIKE $${idx}
      )`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await pool.query(
            `SELECT
        pr.id,
        pr.id_jadwal,
        pr.tanggal,
        pr.id_kelas,
        pr.requested_by,
        pr.status,
        pr.alasan_reject,
        pr.opened_at,
        pr.created_at,
        pr.updated_at,
        j.hari,
        j.jam_mulai,
        j.jam_selesai,
        j.guru,
        k.name AS kelas_name,
        k.tingkat,
        jr.nama_jurusan AS jurusan,
        u.name AS requester_name
      FROM presensi_requests pr
      JOIN jadwal j ON j.id_jadwal = pr.id_jadwal
      JOIN kelas k  ON k.id = pr.id_kelas
      LEFT JOIN jurusan jr ON jr.id = k.id_jurusan
      JOIN users u  ON u.id = pr.requested_by
      ${whereClause}
      ORDER BY pr.created_at DESC`,
            params
        );

        // Summary count
        const summaryParams = [dateStart, dateEnd]
        const summaryConditions = [`pr.tanggal BETWEEN $1 AND $2`]

        if (id_kelas) {
            summaryParams.push(parseInt(id_kelas))
            summaryConditions.push(`pr.id_kelas = $${summaryParams.length}`)
        }

        const summaryResult = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'Pending')  AS pending,
                COUNT(*) FILTER (WHERE status = 'Approved') AS approved,
                COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected,
                COUNT(*) AS total
             FROM presensi_requests pr
             WHERE ${summaryConditions.join(' AND ')}`,
            summaryParams
        )

        const summary = {
            pending: parseInt(summaryResult.rows[0].pending),
            approved: parseInt(summaryResult.rows[0].approved),
            rejected: parseInt(summaryResult.rows[0].rejected),
            total: parseInt(summaryResult.rows[0].total)
        }

        res.json({ data: result.rows, summary });

    } catch (err) {
        console.error('❌ getRequests ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   GET /presensi-requests/summary
   Hanya count per status (untuk badge di navbar/menu admin)
======================= */
exports.getRequestsSummary = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
        COUNT(*) FILTER (WHERE status = 'Pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'Approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected,
        COUNT(*)                                     AS total
       FROM presensi_requests`
        );
        const row = result.rows[0];
        res.json({
            pending: parseInt(row.pending),
            approved: parseInt(row.approved),
            rejected: parseInt(row.rejected),
            total: parseInt(row.total)
        });
    } catch (err) {
        console.error('❌ getRequestsSummary ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   PUT /presensi-requests/:id/approve
   Admin approve request → insert ke jadwal_dibuka (window 24 jam)
======================= */
exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        const requestCheck = await pool.query(
            `SELECT * FROM presensi_requests WHERE id = $1`,
            [id]
        );
        if (!requestCheck.rowCount) {
            return res.status(404).json({ message: 'Request tidak ditemukan' });
        }

        const request = requestCheck.rows[0];

        if (request.status !== 'Pending') {
            return res.status(400).json({
                message: `Request sudah diproses sebelumnya dengan status: ${request.status}`
            });
        }

        const presensiCheck = await pool.query(
            `SELECT id_presensi FROM presensi_guru WHERE id_jadwal = $1 AND tanggal = $2`,
            [request.id_jadwal, request.tanggal]
        );
        if (presensiCheck.rowCount) {
            await pool.query(
                `UPDATE presensi_requests SET status = 'Approved', opened_at = NOW(), updated_at = NOW() WHERE id = $1`,
                [id]
            );
            return res.json({ message: 'Presensi sudah diisi oleh KM', data: request });
        }

        const manualOpenCheck = await pool.query(
            `SELECT id FROM jadwal_dibuka WHERE id_jadwal = $1 AND tanggal = $2`,
            [request.id_jadwal, request.tanggal]
        );
        if (manualOpenCheck.rowCount > 0) {
            const updated = await pool.query(
                `UPDATE presensi_requests SET status = 'Approved', opened_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
                [id]
            );
            return res.json({
                message: 'Jadwal sudah dibuka manual sebelumnya. Request otomatis disetujui.',
                data: updated.rows[0]
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO jadwal_dibuka (id_jadwal, tanggal, opened_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (id_jadwal, tanggal) DO NOTHING`,
                [request.id_jadwal, request.tanggal, adminId]
            );

            const updated = await client.query(
                `UPDATE presensi_requests
         SET status = 'Approved', opened_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
                [id]
            );

            await client.query('COMMIT');

            res.json({
                message: 'Request disetujui. KM punya 24 jam untuk mengisi presensi.',
                data: updated.rows[0]
            });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('approveRequest ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   PUT /presensi-requests/:id/reject
   Admin reject request dengan alasan
======================= */
exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { alasan_reject } = req.body;

        if (!alasan_reject || !alasan_reject.trim()) {
            return res.status(400).json({ message: 'Alasan penolakan wajib diisi' });
        }

        const requestCheck = await pool.query(
            `SELECT * FROM presensi_requests WHERE id = $1`,
            [id]
        );
        if (!requestCheck.rowCount) {
            return res.status(404).json({ message: 'Request tidak ditemukan' });
        }

        if (requestCheck.rows[0].status !== 'Pending') {
            return res.status(400).json({
                message: `Request sudah diproses dengan status: ${requestCheck.rows[0].status}`
            });
        }

        const updated = await pool.query(
            `UPDATE presensi_requests
       SET status = 'Rejected', alasan_reject = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
            [alasan_reject.trim(), id]
        );

        res.json({
            message: 'Request ditolak.',
            data: updated.rows[0]
        });

    } catch (err) {
        console.error('❌ rejectRequest ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   GET /presensi-requests/my
   KM lihat status request miliknya (untuk halaman history)
   Returns: map { "id_jadwal_tanggal": { status, id, alasan_reject } }
======================= */
exports.getMyRequests = async (req, res) => {
    try {
        const { id: requested_by } = req.user;

        const result = await pool.query(
            `SELECT id, id_jadwal, tanggal::text AS tanggal, status, alasan_reject, opened_at, created_at
       FROM presensi_requests
       WHERE requested_by = $1
       ORDER BY created_at DESC`,
            [requested_by]
        );

        // Kembalikan sebagai map untuk kemudahan lookup di frontend
        const requestMap = {};
        result.rows.forEach(r => {
            const key = `${r.id_jadwal}_${r.tanggal}`;
            requestMap[key] = {
                id: r.id,
                status: r.status,
                alasan_reject: r.alasan_reject,
                opened_at: r.opened_at,
                created_at: r.created_at
            };
        });

        res.json({ data: result.rows, map: requestMap });

    } catch (err) {
        console.error('❌ getMyRequests ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
};