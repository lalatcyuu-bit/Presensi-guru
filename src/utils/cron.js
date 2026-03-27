const cron = require('node-cron');
const pool = require('../db'); 
const { deleteImage, getPublicIdFromUrl } = require('./cloudinary'); 

// Jalan setiap hari jam 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('Running auto delete image job...');

  try {
    const result = await pool.query(`
      SELECT id_presensi, foto_bukti
      FROM presensi_guru
      WHERE foto_bukti IS NOT NULL
      AND created_at < NOW() - INTERVAL '6 month'
      LIMIT 100
    `);

    for (const row of result.rows) {
      const publicId = getPublicIdFromUrl(row.foto_bukti);

      if (publicId) {
        await deleteImage(publicId);
      }

      await pool.query(
        `UPDATE presensi_guru SET foto_bukti = NULL WHERE id_presensi = $1`,
        [row.id_presensi]
      );
    }

    console.log('Auto delete selesai');
  } catch (err) {
    console.error('Cron error:', err);
  }
});

console.log('Auto delete cron aktif');