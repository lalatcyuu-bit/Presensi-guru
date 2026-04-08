const pool = require('../db');
const { uploadImage, deleteImage, getPublicIdFromUrl } = require('../utils/cloudinary');
const {
  getWIBDate,
  getWIBTimeString,
  getWIBDayName,
  getWIBISOString,
  getWIBInfo,
  getTimeStatus
} = require('../utils/timezone');

/* =======================
   GET JADWAL KELAS HARI INI (KM)
   Untuk halaman list presensi KM
======================= */
exports.getJadwalKelasHariIni = async (req, res) => {
  try {
    const { id_kelas } = req.user;

    console.log('🔍 DEBUG - User data:', {
      userId: req.user.id,
      id_kelas: id_kelas,
      role: req.user.role
    });

    if (!id_kelas) {
      return res.status(400).json({ message: 'User tidak memiliki kelas' });
    }

    const wibInfo = getWIBInfo();

    console.log('🔍 DEBUG - Query params:', {
      tanggal: wibInfo.date,
      id_kelas: id_kelas,
      hari: wibInfo.day,
      currentTime: wibInfo.time
    });

    const result = await pool.query(
      `SELECT 
        j.id_jadwal,
        j.hari,
        j.jam_mulai,
        j.jam_selesai,
        j.guru,
        k.name AS kelas_name,
        k.tingkat,
        jr.nama_jurusan AS jurusan,
        p.id_presensi,
        p.status,
        p.status_approve,
        p.tanggal,
        p.memberikan_tugas,
        p.catatan,
        p.alasan_reject
      FROM jadwal j
      JOIN kelas k ON k.id = j.id_kelas
      LEFT JOIN jurusan jr ON jr.id = k.id_jurusan
      LEFT JOIN presensi_guru p 
        ON p.id_jadwal = j.id_jadwal 
        AND p.tanggal = $1
      WHERE j.id_kelas = $2 
        AND j.hari = $3
      ORDER BY j.jam_mulai ASC`,
      [wibInfo.date, id_kelas, wibInfo.day]
    );

    console.log('🔍 DEBUG - Query result:', {
      rowCount: result.rowCount,
      firstRow: result.rows[0] || null
    });

    const formattedData = result.rows.map(row => {
      const jamMulai = row.jam_mulai.substring(0, 5);
      const jamSelesai = row.jam_selesai.substring(0, 5);

      const guruData = row.guru || {};
      const namaGuru = guruData.nama_guru || 'N/A';
      const namaMapel = guruData.mapel?.nama_mapel || 'N/A';

      let statusFE;
      if (!row.id_presensi) {
        statusFE = 'belum';
      } else {
        statusFE = row.status_approve;
      }

      const timeStatus = getTimeStatus(row.jam_mulai, row.jam_selesai);

      return {
        id: row.id_jadwal,
        timeRange: `${jamMulai} – ${jamSelesai}`,
        classTime: `${jamMulai} – ${jamSelesai}`,
        subject: namaMapel,
        teacher: namaGuru,
        status: statusFE,
        status_approve: row.status_approve || null,
        timeStatus: timeStatus,
        jam_mulai: row.jam_mulai,
        jam_selesai: row.jam_selesai,
        kelas: {
          name: row.kelas_name,
          tingkat: row.tingkat,
          jurusan: row.jurusan
        },
        presensi: row.id_presensi ? {
          id_presensi: row.id_presensi,
          status_kehadiran: row.status,
          memberikan_tugas: row.memberikan_tugas,
          catatan: row.catatan,
          alasan_reject: row.alasan_reject
        } : null,
        duration: null
      };
    });

    res.json({
      tanggal: wibInfo.date,
      hari: wibInfo.day,
      serverTime: wibInfo.time,
      serverDateTime: wibInfo.datetime,
      kelas: result.rows.length > 0 ? {
        name: result.rows[0].kelas_name,
        tingkat: result.rows[0].tingkat,
        jurusan: result.rows[0].jurusan
      } : null,
      schedules: formattedData
    });

  } catch (err) {
    console.error('❌ ERROR getJadwalKelasHariIni:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET DETAIL JADWAL BY ID (KM)
======================= */
exports.getJadwalByIdKM = async (req, res) => {
  try {
    const { id_jadwal } = req.params;
    const { id_kelas } = req.user;

    const result = await pool.query(
      `SELECT 
        j.id_jadwal,
        j.jam_mulai,
        j.jam_selesai,
        j.guru,
        k.name AS kelas_name,
        k.tingkat,
        jr.nama_jurusan AS jurusan
      FROM jadwal j
      JOIN kelas k ON k.id = j.id_kelas
      LEFT JOIN jurusan jr ON jr.id = k.id_jurusan
      WHERE j.id_jadwal = $1 AND j.id_kelas = $2`,
      [id_jadwal, id_kelas]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
    }

    const row = result.rows[0];
    const jamMulai = row.jam_mulai.substring(0, 5);
    const jamSelesai = row.jam_selesai.substring(0, 5);

    const guruData = row.guru || {};
    const namaGuru = guruData.nama_guru || 'N/A';
    const namaMapel = guruData.mapel?.nama_mapel || 'N/A';

    const currentTime = getWIBTimeString();
    const timeStatus = getTimeStatus(row.jam_mulai, row.jam_selesai);

    res.json({
      id_jadwal: row.id_jadwal,
      namaMapel: namaMapel,
      namaGuru: namaGuru,
      jamPelajaran: `${jamMulai} – ${jamSelesai}`,
      timeStatus: timeStatus,
      jam_mulai: row.jam_mulai,
      jam_selesai: row.jam_selesai,
      serverTime: currentTime,
      kelas: {
        name: row.kelas_name,
        tingkat: row.tingkat,
        jurusan: row.jurusan
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET PRESENSI BY ID (KM)
   - Hanya bisa akses presensi milik kelasnya sendiri
======================= */
exports.getPresensiByIdKM = async (req, res) => {
  try {
    const idPresensi = req.params.id;
    const { id_kelas } = req.user;

    const result = await pool.query(
      `SELECT 
         p.id_presensi,
         p.id_jadwal,
         p.tanggal,
         p.status,
         p.foto_bukti,
         p.memberikan_tugas,
         p.catatan,
         p.status_approve,
         p.alasan_reject
       FROM presensi_guru p
       JOIN jadwal j ON j.id_jadwal = p.id_jadwal
       WHERE p.id_presensi = $1
         AND j.id_kelas = $2`,
      [idPresensi, id_kelas]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ ERROR getPresensiByIdKM:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   CREATE PRESENSI BY KM
======================= */
exports.createPresensiByKM = async (req, res) => {
  try {
    const {
      id_jadwal,
      status,
      memberikan_tugas,
      keterangan
    } = req.body;

    const diabsen_oleh = req.user.id;
    const tanggalHariIni = getWIBDate();

    if (!id_jadwal || !status) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    const jadwalResult = await pool.query(
      `SELECT jam_mulai, jam_selesai FROM jadwal WHERE id_jadwal = $1`,
      [id_jadwal]
    );

    if (jadwalResult.rowCount === 0) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
    }

    const { jam_mulai, jam_selesai } = jadwalResult.rows[0];
    const currentTime = getWIBTimeString();

    if (currentTime < jam_mulai) {
      return res.status(400).json({ message: 'Belum waktunya presensi. Jam pelajaran belum dimulai.' });
    }

    if (currentTime > jam_selesai) {
      return res.status(400).json({ message: 'Waktu presensi sudah lewat. Jam pelajaran sudah selesai.' });
    }

    if (status === 'Hadir' && !req.file) {
      return res.status(400).json({ message: 'Foto bukti wajib untuk status Hadir' });
    }

    if (status === 'Tidak Hadir' && memberikan_tugas === undefined) {
      return res.status(400).json({ message: 'Status tugas wajib untuk Tidak Hadir' });
    }

    let fotoLink = null;
    if (req.file) {
      fotoLink = await uploadImage(req.file, 'presensi');
    }

    const memberikanTugasBoolean = memberikan_tugas === 'ya' ? true :
      memberikan_tugas === 'tidak' ? false : null;

    const result = await pool.query(
      `INSERT INTO presensi_guru
        (id_jadwal, tanggal, status, foto_bukti, diabsen_oleh, memberikan_tugas, catatan, status_approve)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id_jadwal,
        tanggalHariIni,
        status,
        fotoLink,
        diabsen_oleh,
        memberikanTugasBoolean,
        keterangan || null,
        'Pending'
      ]
    );

    res.status(201).json({
      message: 'Presensi berhasil disimpan',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Presensi untuk jadwal ini hari ini sudah ada' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   CREATE PRESENSI (ADMIN)
======================= */
exports.createPresensi = async (req, res) => {
  try {
    const { id_jadwal, status, diabsen_oleh, memberikan_tugas, catatan } = req.body;

    if (!id_jadwal || !status || !diabsen_oleh) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    // ===== VALIDASI JAM (fix: sebelumnya tidak ada) =====
    const jadwalResult = await pool.query(
      `SELECT jam_mulai, jam_selesai FROM jadwal WHERE id_jadwal = $1`,
      [id_jadwal]
    );

    if (jadwalResult.rowCount === 0) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
    }

    if (!id_jadwal || !status || !diabsen_oleh) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Foto wajib diupload' });
    }

    const fotoLink = await uploadImage(req.file, 'presensi');

    const result = await pool.query(
      `INSERT INTO presensi_guru
       (id_jadwal, status, foto_bukti, diabsen_oleh, memberikan_tugas, catatan, status_approve)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id_jadwal,
        status,
        fotoLink,
        diabsen_oleh,
        memberikan_tugas || null,
        catatan || null,
        'Pending'
      ]
    );

    res.status(201).json({
      message: 'Presensi berhasil disimpan',
      data: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Presensi untuk jadwal ini hari ini sudah ada' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET ALL PRESENSI (ADMIN/PIKET)
   - Default: jadwal hari ini (WIB) via LEFT JOIN
   - Filter: ?tanggal=YYYY-MM-DD & ?id_kelas=123
   - Menampilkan jadwal yang belum dipresensi (id_presensi = null)
======================= */
exports.getPresensi = async (req, res) => {
  try {
    const { tanggal, id_kelas } = req.query;

    const targetDate = tanggal || getWIBDate();

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dateObj = new Date(targetDate + 'T00:00:00+07:00');
    const targetDay = dayNames[dateObj.getDay()];

    const params = [targetDate, targetDay];
    let kelasClause = '';

    if (id_kelas) {
      params.push(parseInt(id_kelas));
      kelasClause = `AND j.id_kelas = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT 
        j.id_jadwal,
        j.hari,
        j.jam_mulai,
        j.jam_selesai,
        j.guru,
        j.id_kelas,
        k.name  AS kelas_name,
        k.tingkat,
        jr.nama_jurusan AS jurusan,
        p.id_presensi,
        p.tanggal,
        p.status,
        p.foto_bukti,
        p.memberikan_tugas,
        p.catatan,
        p.status_approve,
        p.alasan_reject,
        p.diabsen_oleh,
        p.approved_by,
        p.created_at,
        p.updated_at
      FROM jadwal j
      JOIN kelas k ON k.id = j.id_kelas
      LEFT JOIN jurusan jr ON jr.id = k.id_jurusan
      LEFT JOIN presensi_guru p
        ON p.id_jadwal = j.id_jadwal
        AND p.tanggal = $1
      WHERE j.hari = $2
        ${kelasClause}
      ORDER BY k.name ASC, j.jam_mulai ASC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET BY ID
======================= */
exports.getPresensiById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM presensi_guru WHERE id_presensi = $1`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   UPDATE (PENDING ONLY) - by Admin/Piket
======================= */
exports.updatePresensi = async (req, res) => {
  try {
    const { status, catatan } = req.body;
    const idPresensi = req.params.id;

    const oldData = await pool.query(
      `SELECT foto_bukti FROM presensi_guru WHERE id_presensi = $1`,
      [idPresensi]
    );

    if (!oldData.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    let fotoBaru = null;

    if (req.file) {
      const fotoLama = oldData.rows[0].foto_bukti;
      if (fotoLama) {
        const publicId = getPublicIdFromUrl(fotoLama);
        await deleteImage(publicId);
      }
      fotoBaru = await uploadImage(req.file, 'presensi');
    }

    const result = await pool.query(
      `UPDATE presensi_guru
       SET status = COALESCE($1, status),
           catatan = COALESCE($2, catatan),
           foto_bukti = COALESCE($3, foto_bukti),
           updated_at = CURRENT_TIMESTAMP
       WHERE id_presensi = $4
         AND status_approve = 'Pending'
       RETURNING *`,
      [status, catatan || null, fotoBaru, idPresensi]
    );

    if (!result.rowCount) {
      return res.status(400).json({
        message: 'Presensi sudah di-approve atau tidak bisa diupdate'
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   RESUBMIT PRESENSI BY KM
   - Hanya bisa kalau status_approve = 'Rejected'
   - KM bisa ganti foto dan/atau catatan
   - Setelah submit: status_approve → 'Pending', alasan_reject → null
   - Tidak ada batasan jam (beda hari pun boleh resubmit)
======================= */
exports.resubmitPresensiByKM = async (req, res) => {
  try {

    const idPresensi = req.params.id;
    const { status, memberikan_tugas, keterangan } = req.body;

    const userId = req.user.id;
    const idKelas = req.user.id_kelas;

    const oldData = await pool.query(
      `SELECT 
         p.id_presensi,
         p.status_approve,
         p.foto_bukti,
         p.diabsen_oleh,
         p.rejected_at,
         j.id_kelas
       FROM presensi_guru p
       JOIN jadwal j ON j.id_jadwal = p.id_jadwal
       WHERE p.id_presensi = $1`,
      [idPresensi]
    );

    if (!oldData.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    const presensi = oldData.rows[0];

    if (presensi.id_kelas !== idKelas) {
      return res.status(403).json({
        message: 'Anda tidak memiliki akses ke presensi ini'
      });
    }

    if (presensi.status_approve !== 'Rejected') {
      return res.status(400).json({
        message: `Presensi tidak bisa disubmit ulang. Status saat ini: ${presensi.status_approve}`
      });
    }

    // ======================
    // VALIDASI 24 JAM
    // ======================

    if (presensi.rejected_at) {

      const rejectedTime = new Date(presensi.rejected_at);
      const now = new Date();

      const diffHours = (now - rejectedTime) / (1000 * 60 * 60);

      if (diffHours > 24) {
        return res.status(400).json({
          message: 'Batas waktu banding 24 jam sudah lewat'
        });
      }

    }

    const statusBaru = status || null;

    if (statusBaru === 'Hadir' && !req.file && !presensi.foto_bukti) {
      return res.status(400).json({
        message: 'Foto bukti wajib untuk status Hadir'
      });
    }

    // ======================
    // HANDLE FOTO
    // ======================

    let fotoBaru = null;

    if (req.file) {

      if (presensi.foto_bukti) {
        const publicId = getPublicIdFromUrl(presensi.foto_bukti);
        await deleteImage(publicId);
      }

      fotoBaru = await uploadImage(req.file, 'presensi');
    }

    const memberikanTugasBoolean =
      memberikan_tugas === 'ya' ? true :
      memberikan_tugas === 'tidak' ? false :
      null;

    const result = await pool.query(
      `UPDATE presensi_guru
       SET 
         status            = COALESCE($1, status),
         foto_bukti        = COALESCE($2, foto_bukti),
         memberikan_tugas  = COALESCE($3, memberikan_tugas),
         catatan           = COALESCE($4, catatan),
         status_approve    = 'Pending',
         alasan_reject     = NULL,
         approved_by       = NULL,
         diabsen_oleh      = $5,
         updated_at        = CURRENT_TIMESTAMP
       WHERE id_presensi = $6
       RETURNING *`,
      [
        statusBaru,
        fotoBaru,
        memberikanTugasBoolean,
        keterangan || null,
        userId,
        idPresensi
      ]
    );

    res.json({
      message: 'Presensi berhasil disubmit ulang',
      data: result.rows[0]
    });

  } catch (err) {

    console.error('❌ ERROR resubmitPresensiByKM:', err);

    res.status(500).json({
      message: 'Server error'
    });

  }
};

/* =======================
   DELETE PRESENSI
======================= */
exports.deletePresensi = async (req, res) => {
  try {
    const presensi = await pool.query(
      `SELECT foto_bukti FROM presensi_guru WHERE id_presensi = $1`,
      [req.params.id]
    );

    if (!presensi.rowCount) {
      return res.status(404).json({ message: 'Presensi tidak ditemukan' });
    }

    const fotoUrl = presensi.rows[0].foto_bukti;
    if (fotoUrl) {
      const publicId = getPublicIdFromUrl(fotoUrl);
      await deleteImage(publicId);
    }

    await pool.query(
      `DELETE FROM presensi_guru WHERE id_presensi = $1`,
      [req.params.id]
    );

    res.json({ message: 'Presensi berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   APPROVE / REJECT PRESENSI
   - Approve: set status_approve = 'Approved'
   - Reject : set status_approve = 'Rejected' + simpan alasan_reject
======================= */
exports.approvePresensi = async (req, res) => {
  try {

    const { id } = req.params;
    const { status, alasan } = req.body;

    let query;
    let params;

    if (status === 'Rejected') {

      query = `
      UPDATE presensi_guru
      SET
        status_approve = 'Rejected',
        alasan_reject = $1,
        rejected_at = NOW(),
        approved_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_presensi = $3
      RETURNING *
      `;

      params = [alasan || null, req.user.id, id];

    } else {

      query = `
      UPDATE presensi_guru
      SET
        status_approve = 'Approved',
        alasan_reject = NULL,
        approved_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_presensi = $2
      RETURNING *
      `;

      params = [req.user.id, id];
    }

    const result = await pool.query(query, params);

    res.json({
      message: 'Status presensi berhasil diupdate',
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET RIWAYAT PRESENSI KM
======================= */
exports.getRiwayatPresensiKM = async (req, res) => {
  try {
    const { id_kelas } = req.user;

    if (!id_kelas) {
      return res.status(400).json({ message: 'KM tidak memiliki kelas' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const status = req.query.status || null;
    const tanggal = req.query.tanggal || null;

    const params = [id_kelas];

    let dateStart, dateEnd;
    if (tanggal) {
      params.push(tanggal);
      dateStart = `$${params.length}::date`;
      dateEnd = `$${params.length}::date`;
    } else {
      dateStart = `CURRENT_DATE - INTERVAL '30 days'`;
      dateEnd = `CURRENT_DATE`;
    }

    let statusFilter = '';
    if (status === 'belum') {
      statusFilter = `AND p.id_presensi IS NULL`;
    } else if (status) {
      params.push(status);
      statusFilter = `AND p.status_approve = $${params.length}`;
    }

    const slotsCTE = `
      WITH slots AS (
        SELECT
          gs::date AS tanggal,
          j.id_jadwal,
          j.hari,
          j.jam_mulai,
          j.jam_selesai,
          j.guru,
          k.name          AS kelas_name,
          k.tingkat,
          jr.nama_jurusan AS jurusan
        FROM generate_series(${dateStart}, ${dateEnd}, '1 day'::interval) gs
        JOIN jadwal j ON j.id_kelas = $1
          AND j.hari = CASE EXTRACT(DOW FROM gs::date)
            WHEN 0 THEN 'Minggu'
            WHEN 1 THEN 'Senin'
            WHEN 2 THEN 'Selasa'
            WHEN 3 THEN 'Rabu'
            WHEN 4 THEN 'Kamis'
            WHEN 5 THEN 'Jumat'
            WHEN 6 THEN 'Sabtu'
          END
        JOIN kelas k ON k.id = j.id_kelas
        LEFT JOIN jurusan jr ON jr.id = k.id_jurusan
      )
    `;

    const countResult = await pool.query(
      `${slotsCTE}
       SELECT
         COUNT(*)                                          AS total,
         COUNT(*) FILTER (WHERE p.status = 'Hadir')       AS total_hadir,
         COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir') AS total_tidak_hadir,
         COUNT(*) FILTER (WHERE p.id_presensi IS NULL)    AS total_belum
       FROM slots s
       LEFT JOIN presensi_guru p
         ON p.id_jadwal = s.id_jadwal AND p.tanggal = s.tanggal
       WHERE NOT (
         s.tanggal = CURRENT_DATE
         AND s.jam_selesai > (NOW() AT TIME ZONE 'Asia/Jakarta')::time
         AND p.id_presensi IS NULL
       )
       ${statusFilter}`,
      params
    );

    const total = parseInt(countResult.rows[0].total, 10);
    const totalHadir = parseInt(countResult.rows[0].total_hadir, 10);
    const totalTidakHadir = parseInt(countResult.rows[0].total_tidak_hadir, 10);
    const totalBelum = parseInt(countResult.rows[0].total_belum, 10);
    const totalPages = Math.ceil(total / limit);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const result = await pool.query(
      `${slotsCTE}
       SELECT
         s.tanggal,
         s.id_jadwal,
         s.hari,
         s.jam_mulai,
         s.jam_selesai,
         s.guru,
         s.kelas_name,
         s.tingkat,
         s.jurusan,
         p.id_presensi,
         p.status,
         p.foto_bukti,
         p.memberikan_tugas,
         p.catatan,
         p.status_approve,
         p.alasan_reject,
         p.created_at
       FROM slots s
       LEFT JOIN presensi_guru p
         ON p.id_jadwal = s.id_jadwal AND p.tanggal = s.tanggal
       WHERE NOT (
         s.tanggal = CURRENT_DATE
         AND s.jam_selesai > (NOW() AT TIME ZONE 'Asia/Jakarta')::time
         AND p.id_presensi IS NULL
       )
       ${statusFilter}
       ORDER BY s.tanggal DESC, s.jam_mulai DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    const formatted = result.rows.map(row => {
      const guruData = row.guru || {};
      return {
        id_presensi: row.id_presensi,
        tanggal: row.tanggal,
        jadwal: {
          id_jadwal: row.id_jadwal,
          hari: row.hari,
          jam_mulai: row.jam_mulai,
          jam_selesai: row.jam_selesai,
          mapel: guruData.mapel?.nama_mapel || 'N/A',
          guru: guruData.nama_guru || 'N/A'
        },
        presensi: row.id_presensi ? {
          status: row.status,
          foto_bukti: row.foto_bukti,
          memberikan_tugas: row.memberikan_tugas,
          catatan: row.catatan,
          status_approve: row.status_approve,
          alasan_reject: row.alasan_reject
        } : null,
        kelas: {
          name: row.kelas_name,
          tingkat: row.tingkat,
          jurusan: row.jurusan
        },
        created_at: row.created_at
      };
    });

    res.json({
      message: 'Riwayat presensi berhasil diambil',
      data: formatted,
      summary: {
        totalSlot: total,
        totalHadir,
        totalTidakHadir,
        totalBelum
      },
      pagination: {
        page,
        perPage: limit,
        totalItems: total,
        totalPages
      },
      filters: { status, tanggal }
    });

  } catch (err) {
    console.error('GET RIWAYAT KM ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   DASHBOARD HARI INI
   - Guru Hadir
   - Guru Tidak Hadir
   - Belum Presensi
======================= */
exports.getDashboardToday = async (req, res) => {
  try {
    const today = getWIBDate(); // format YYYY-MM-DD

    const dayNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const dateObj = new Date(today + 'T00:00:00+07:00');
    const todayName = dayNames[dateObj.getDay()];

    const result = await pool.query(`
      SELECT
        COUNT(j.id_jadwal) FILTER (
          WHERE p.status = 'Hadir'
        ) AS guru_hadir,

        COUNT(j.id_jadwal) FILTER (
          WHERE p.status = 'Tidak Hadir'
        ) AS guru_tidak_hadir,

        COUNT(j.id_jadwal) FILTER (
          WHERE p.id_presensi IS NULL
        ) AS belum_presensi,

        COUNT(j.id_jadwal) AS total_jadwal

      FROM jadwal j
      LEFT JOIN presensi_guru p
        ON p.id_jadwal = j.id_jadwal
        AND p.tanggal = $1
      WHERE j.hari = $2
    `, [today, todayName]);

    const data = result.rows[0];

    res.json({
      tanggal: today,
      hari: todayName,
      summary: {
        total_jadwal: parseInt(data.total_jadwal),
        guru_hadir: parseInt(data.guru_hadir),
        guru_tidak_hadir: parseInt(data.guru_tidak_hadir),
        belum_presensi: parseInt(data.belum_presensi)
      }
    });

  } catch (err) {
    console.error('DASHBOARD ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.bulkApprovePresensi = async (req, res) => {
  try {

    const { ids, status, alasan } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ID presensi wajib diisi' });
    }

    // =========================
    // CEK FITUR AKTIF
    // =========================
    const enabled = await isBulkEnabled();

    if (!enabled) {
      return res.status(403).json({
        message: 'Fitur bulk approval sedang dinonaktifkan oleh admin'
      });
    }

    let query;
    let params;

    // =========================
    // REJECT
    // =========================
    if (status === 'Rejected') {

      query = `
        UPDATE presensi_guru
        SET
          status_approve = 'Rejected',
          alasan_reject = $1,
          rejected_at = NOW(),
          approved_by = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_presensi = ANY($3::int[])
        RETURNING *
      `;

      params = [
        alasan || null,
        req.user.id,
        ids
      ];

    }

    // =========================
    // APPROVE
    // =========================
    else {

      query = `
        UPDATE presensi_guru
        SET
          status_approve = 'Approved',
          alasan_reject = NULL,
          approved_by = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id_presensi = ANY($2::int[])
        RETURNING *
      `;

      params = [
        req.user.id,
        ids
      ];
    }

    const result = await pool.query(query, params);

    res.json({
      message: `Bulk ${status} berhasil`,
      total: result.rowCount,
      data: result.rows
    });

  } catch (err) {
    console.error('BULK APPROVE ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =========================
   OPEN PRESENSI (ADMIN)
========================= */
exports.openPresensi = async (req, res) => {
  try {
    const { id_presensi } = req.body;

    if (!id_presensi) {
      return res.status(400).json({ message: 'ID presensi wajib diisi' });
    }

    const result = await pool.query(
      `UPDATE presensi_guru
       SET is_opened_by_admin = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_presensi = $1
       RETURNING *`,
      [id_presensi]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    res.json({
      message: 'Presensi berhasil dibuka',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('OPEN ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};