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
        k.jurusan,
        p.id_presensi,
        p.status,
        p.status_approve,
        p.tanggal,
        p.memberikan_tugas,
        p.catatan
      FROM jadwal j
      JOIN kelas k ON k.id = j.id_kelas
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
        k.jurusan
      FROM jadwal j
      JOIN kelas k ON k.id = j.id_kelas
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
        k.jurusan,
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