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
        p.catatan
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
          catatan: row.catatan
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

    if (!req.file) {
      return res.status(400).json({ message: 'Foto wajib diupload' });
    }

    const fotoLink = await uploadImage(req.file, 'presensi');

    const result = await pool.query(
      `INSERT INTO presensi_guru
       (id_jadwal, status, foto_bukti, diabsen_oleh, memberikan_tugas, catatan)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id_jadwal, status, fotoLink, diabsen_oleh, memberikan_tugas || null, catatan || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
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

    // Default tanggal = hari ini WIB
    const targetDate = tanggal || getWIBDate();

    // Hitung nama hari dari tanggal target
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
   UPDATE (PENDING ONLY)
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
   APPROVE PRESENSI
======================= */
exports.approvePresensi = async (req, res) => {
  try {
    const idPresensi = parseInt(req.params.id, 10);
    const { status_approve } = req.body;

    if (isNaN(idPresensi)) {
      return res.status(400).json({ message: 'ID presensi tidak valid' });
    }

    if (!['Approved', 'Rejected'].includes(status_approve)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    const approved_by = req.user.id;

    const result = await pool.query(
      `UPDATE presensi_guru
       SET status_approve = $1,
           approved_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_presensi = $3
         AND status_approve = 'Pending'
       RETURNING *`,
      [status_approve, approved_by, idPresensi]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Presensi tidak ditemukan atau sudah diproses'
      });
    }

    res.json({
      message: 'Presensi berhasil diproses',
      data: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =======================
   GET RIWAYAT PRESENSI KM
   hanya untuk KM berdasarkan id_kelas
   Query params:
   - ?page=      → halaman (default 1)
   - ?limit=     → item per halaman (default 10)
   - ?status=    → filter status_approve (Pending / Approved / Rejected)
   - ?tanggal=   → filter tanggal (YYYY-MM-DD)
======================= */
exports.getRiwayatPresensiKM = async (req, res) => {
  try {
    const { id_kelas } = req.user;

    if (!id_kelas) {
      return res.status(400).json({ message: 'KM tidak memiliki kelas' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const status = req.query.status || null;
    const tanggal = req.query.tanggal || null;
    const offset = (page - 1) * limit;

    const params = [id_kelas];
    let index = 2;
    const where = [`j.id_kelas = $1`];

    if (status) {
      where.push(`p.status_approve = $${index}`);
      params.push(status);
      index++;
    }

    if (tanggal) {
      where.push(`DATE(p.tanggal) = $${index}`);
      params.push(tanggal);
      index++;
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    // Hitung total + summary hadir/tidak hadir (server-side)
    const countResult = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE p.status = 'Hadir') AS total_hadir,
        COUNT(*) FILTER (WHERE p.status = 'Tidak Hadir') AS total_tidak_hadir
       FROM presensi_guru p
       JOIN jadwal j ON j.id_jadwal = p.id_jadwal
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);
    const totalHadir = parseInt(countResult.rows[0].total_hadir, 10);
    const totalTidakHadir = parseInt(countResult.rows[0].total_tidak_hadir, 10);
    const totalPages = Math.ceil(total / limit);

    // Ambil data
    params.push(limit);
    const limitIndex = index;
    params.push(offset);
    const offsetIndex = index + 1;

    const result = await pool.query(
      `SELECT
        p.id_presensi,
        p.tanggal,
        p.status,
        p.foto_bukti,
        p.memberikan_tugas,
        p.catatan,
        p.status_approve,
        p.created_at,
        j.id_jadwal,
        j.hari,
        j.jam_mulai,
        j.jam_selesai,
        j.guru,
        k.name AS kelas_name,
        k.tingkat,
        jr.nama_jurusan AS jurusan
      FROM presensi_guru p
      JOIN jadwal j ON j.id_jadwal = p.id_jadwal
      JOIN kelas k ON k.id = j.id_kelas
      LEFT JOIN jurusan jr ON jr.id = k.id_jurusan
      ${whereClause}
      ORDER BY p.tanggal DESC, j.jam_mulai DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
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
        presensi: {
          status: row.status,
          foto_bukti: row.foto_bukti,
          memberikan_tugas: row.memberikan_tugas,
          catatan: row.catatan,
          status_approve: row.status_approve
        },
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
        totalPresensi: total,
        totalHadir,
        totalTidakHadir
      },
      pagination: {
        page,
        perPage: limit,
        totalItems: total,
        totalPages
      },
      filters: {
        status,
        tanggal
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};