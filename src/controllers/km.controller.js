const pool = require('../db');
const { uploadToDrive } = require('../utils/gdrive');

/* =======================
   GET JADWAL KELAS HARI INI
   Untuk halaman list presensi KM
======================= */
exports.getJadwalKelasHariIni = async (req, res) => {
    try {
        const { id_kelas } = req.user;

        if (!id_kelas) {
            return res.status(400).json({ message: 'User tidak memiliki kelas' });
        }

        // Get hari ini dalam bahasa Indonesia
        const hariMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const hariIni = hariMap[new Date().getDay()];
        const tanggalHariIni = new Date().toISOString().split('T')[0];

        // Waktu server saat ini
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

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
            [tanggalHariIni, id_kelas, hariIni]
        );

        // Format response sesuai FE
        const formattedData = result.rows.map(row => {
            const jamMulai = row.jam_mulai.substring(0, 5);
            const jamSelesai = row.jam_selesai.substring(0, 5);

            // ✅ Parse JSONB guru sesuai struktur:
            // {"mapel": {"id_mapel": 1, "nama_mapel": "Pemrograman Web"}, "id_guru": 1, "nama_guru": "Latif"}
            const guruData = row.guru || {};
            const namaGuru = guruData.nama_guru || 'N/A';
            const namaMapel = guruData.mapel?.nama_mapel || 'N/A';

            // Determine status untuk FE
            let statusFE;
            if (!row.id_presensi) {
                statusFE = 'belum';
            } else {
                statusFE = row.status_approve;
            }

            // Tentukan status waktu
            let timeStatus;
            const jamMulaiTime = row.jam_mulai;
            const jamSelesaiTime = row.jam_selesai;

            if (currentTime < jamMulaiTime) {
                timeStatus = 'belum_dimulai';
            } else if (currentTime >= jamMulaiTime && currentTime <= jamSelesaiTime) {
                timeStatus = 'sedang_berlangsung';
            } else {
                timeStatus = 'sudah_selesai';
            }

            return {
                id: row.id_jadwal,
                timeRange: `${jamMulai} – ${jamSelesai}`,
                classTime: `${jamMulai} – ${jamSelesai}`,
                subject: namaMapel,
                teacher: namaGuru,
                status: statusFE,
                status_approve: row.status_approve || null,
                timeStatus: timeStatus,
                jam_mulai: jamMulaiTime,
                jam_selesai: jamSelesaiTime,
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
            tanggal: tanggalHariIni,
            hari: hariIni,
            serverTime: currentTime,
            serverDateTime: now.toISOString(),
            kelas: result.rows.length > 0 ? {
                name: result.rows[0].kelas_name,
                tingkat: result.rows[0].tingkat,
                jurusan: result.rows[0].jurusan
            } : null,
            schedules: formattedData
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

/* =======================
   GET DETAIL JADWAL BY ID
   Untuk data readonly di form
======================= */
exports.getJadwalById = async (req, res) => {
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

        // ✅ Parse JSONB guru sesuai struktur
        const guruData = row.guru || {};
        const namaGuru = guruData.nama_guru || 'N/A';
        const namaMapel = guruData.mapel?.nama_mapel || 'N/A';

        // Waktu server saat ini
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];

        // Tentukan status waktu
        let timeStatus;
        if (currentTime < row.jam_mulai) {
            timeStatus = 'belum_dimulai';
        } else if (currentTime >= row.jam_mulai && currentTime <= row.jam_selesai) {
            timeStatus = 'sedang_berlangsung';
        } else {
            timeStatus = 'sudah_selesai';
        }

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
   Dari form presensi
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
        const tanggalHariIni = new Date().toISOString().split('T')[0];

        // Validasi basic
        if (!id_jadwal || !status) {
            return res.status(400).json({ message: 'Data tidak lengkap' });
        }

        // Cek jadwal dan waktu
        const jadwalResult = await pool.query(
            `SELECT jam_mulai, jam_selesai FROM jadwal WHERE id_jadwal = $1`,
            [id_jadwal]
        );

        if (jadwalResult.rowCount === 0) {
            return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
        }

        const { jam_mulai, jam_selesai } = jadwalResult.rows[0];
        const currentTime = new Date().toTimeString().split(' ')[0];

        // Validasi waktu - hanya bisa presensi saat jam pelajaran berlangsung
        if (currentTime < jam_mulai) {
            return res.status(400).json({ message: 'Belum waktunya presensi. Jam pelajaran belum dimulai.' });
        }

        if (currentTime > jam_selesai) {
            return res.status(400).json({ message: 'Waktu presensi sudah lewat. Jam pelajaran sudah selesai.' });
        }

        // Validasi foto wajib untuk status Hadir
        if (status === 'Hadir' && !req.file) {
            return res.status(400).json({ message: 'Foto bukti wajib untuk status Hadir' });
        }

        // Validasi memberikan_tugas wajib untuk Tidak Hadir
        if (status === 'Tidak Hadir' && memberikan_tugas === undefined) {
            return res.status(400).json({ message: 'Status tugas wajib untuk Tidak Hadir' });
        }

        let fotoLink = null;
        if (req.file) {
            fotoLink = await uploadToDrive(req.file);
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