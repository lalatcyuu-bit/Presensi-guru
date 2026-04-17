'use strict'

const fs = require('fs')
const path = require('path')

// Taruh di atas fungsi generatePdfHtml
const LOGO_BASE64 = fs.readFileSync(
  path.join(__dirname, '../assets/logo.png')
).toString('base64')

// ── Konstanta layout (identik 100% dengan frontend Vue) ────────────────────
const PAGE_HEIGHT = 1123
const ROW_H = 22
const THEAD_H = 30

const H_KOP = 120
const H_DOC_TITLE = 60
const H_FOOTER = 30
const H_PADDING = 40
const H_SUMMARY = 95
const H_SEC_TITLE = 28

const H_TOP10 = 220
const H_CATATAN = 80
const H_TTD = 100
const H_CLOSING = H_TOP10 + H_CATATAN + H_TTD + H_SEC_TITLE

const H_KOP_MINI = 40

// Identik dengan Vue
const ROWS_MID = Math.floor(
    (PAGE_HEIGHT - H_KOP_MINI - H_FOOTER - H_PADDING - H_SEC_TITLE - THEAD_H) / ROW_H
)

const ROWS_P1_WITH_CLOSING = Math.floor(
    (PAGE_HEIGHT - H_KOP - H_DOC_TITLE - H_FOOTER - H_PADDING - H_SUMMARY - H_SEC_TITLE - THEAD_H - H_CLOSING) / ROW_H
)

const ROWS_LAST_PAGE = Math.floor(
    (PAGE_HEIGHT - H_KOP_MINI - H_FOOTER - H_PADDING - H_SEC_TITLE - THEAD_H - H_CLOSING) / ROW_H
)

// ── Helpers ────────────────────────────────────────────────────────────────
function esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

const pctColor = p => p >= 80 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626'
const badgeCls = p => p >= 80 ? 'badge-green' : p >= 60 ? 'badge-yellow' : 'badge-red'
const badgeLbl = p => p >= 80 ? 'BAIK' : p >= 60 ? 'CUKUP' : 'KURANG'

function buildPeriodeLabel(range, date_from, date_to) {
    if (range === 'custom' && date_from && date_to) {
        const fmt = s => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        return `Periode: ${fmt(date_from)} s.d. ${fmt(date_to)}`
    }
    return ({
        minggu: 'Periode: Minggu Ini',
        bulan: 'Periode: Bulan Ini',
        tahun: 'Periode: Tahun Ini',
        custom: 'Periode: Rentang Tanggal',
    })[range] ?? ''
}

// ── Partial HTML builders ──────────────────────────────────────────────────
function tableHead() {
    return `<thead>
    <tr>
      <th style="width:30px">No</th>
      <th style="text-align:left">Nama Guru</th>
      <th>Hadir</th>
      <th>TH+Tugas</th>
      <th>Tdk Hadir</th>
      <th>Blm Presensi</th>
      <th>% Hadir</th>
      <th>Ket.</th>
    </tr>
  </thead>`
}

function tableRows(rows, startIdx) {
  if (!rows.length) {
    return `<tr><td colspan="8" class="tc muted" style="padding:16px">Tidak ada data untuk periode ini</td></tr>`
  }
  return rows.map((g, i) => {
    const ditolakLabel = g.ditolak > 0
      ? g.ditolak === g.tidak_dipresensi
        ? ` <span style="font-size:8px;color:#dc2626">(semua ditolak)</span>`
        : ` <span style="font-size:8px;color:#dc2626">(${g.ditolak} ditolak)</span>`
      : ''

    return `
    <tr class="${i % 2 === 0 ? 'even' : ''}">
      <td class="tc gray">${startIdx + i + 1}</td>
      <td class="bold-name">${esc(g.nama_guru)}</td>
      <td class="tc green-txt">${g.hadir}</td>
      <td class="tc orange-txt">${g.tidak_hadir_tugas}</td>
      <td class="tc red-txt">${g.tidak_hadir}</td>
      <td class="tc ${g.tidak_dipresensi > 0 ? 'orange-txt' : 'muted'}">
        ${g.tidak_dipresensi}${ditolakLabel}
      </td>
      <td class="tc bold-pct" style="color:${pctColor(g.pct_hadir)}">${g.pct_hadir}%</td>
      <td class="tc"><span class="badge ${badgeCls(g.pct_hadir)}">${badgeLbl(g.pct_hadir)}</span></td>
    </tr>`
  }).join('')
}

function guruTable(rows, startIdx) {
    return `<table class="data-table">${tableHead()}<tbody>${tableRows(rows, startIdx)}</tbody></table>`
}

// IDENTIK DENGAN VUE - Menggunakan orange-txt untuk kolom Jml
function closingSection(top_hadir, top_tidak_hadir, todayStr) {
    const rowsHadir = top_hadir.length
        ? top_hadir.map(g => `
        <tr>
          <td class="tc gray">${g.rank}</td>
          <td>${esc(g.nama_guru)}</td>
          <td class="tc green-txt bold-pct">${g.persen}%</td>
        </tr>`).join('')
        : `<tr><td colspan="3" class="tc muted" style="padding:10px">—</td></tr>`

  const rowsTidak = top_tidak_hadir.length
    ? top_tidak_hadir.map(g => `
    <tr>
      <td class="tc gray">${g.rank}</td>
      <td>${esc(g.nama_guru)}</td>
      <td class="tc red-txt bold-pct">${g.total_tidak_hadir_murni}x</td>
      <td class="tc orange-txt">${g.total_tidak_hadir_tugas}x</td>
      <td class="tc red-txt bold-pct">${g.total_tidak_hadir}x</td>
    </tr>`).join('')
    : `<tr><td colspan="5" class="tc muted" style="padding:10px">—</td></tr>`

    return `
    <div class="top-grid">
      <div class="section">
        <div class="section-title green-title">III. TOP 10 KEHADIRAN</div>
        <table class="rank-table">
          <thead>
            <tr><th>#</th><th>Nama Guru</th><th>%</th></tr>
          </thead>
          <tbody>${rowsHadir}</tbody>
        </table>
      </div>
      <div class="section">
        <div class="section-title red-title">IV. TOP 10 KETIDAKHADIRAN</div>
        <table class="rank-table">
          <thead>
            <tr><th>#</th><th>Nama Guru</th><th>Murni</th><th>+ Tugas</th><th>Total</th></tr>
          </thead>
          <tbody>${rowsTidak}</tbody>
        </table>
      </div>
    </div>

    <div class="notes-block">
      <div class="notes-title">Catatan:</div>
      <div>• <b>Hadir</b>: Guru hadir sesuai jadwal mengajar</div>
      <div>• <b>TH + Tugas</b>: Tidak hadir namun memberikan tugas kepada siswa</div>
      <div>• <b>Tidak Hadir</b>: Tidak hadir tanpa keterangan / murni absen</div>
      <div>• <b>Blm Dipresensi</b>: Slot jadwal yang belum dicatat kehadirannya</div>
      <div>• <b>Keterangan BAIK</b> ≥ 80%, <b>CUKUP</b> 60–79%, <b>KURANG</b> &lt; 60%</div>
    </div>

    <div class="ttd-grid">
      <div class="ttd-block">
        <div>Dibuat oleh,</div>
        <div class="ttd-space"></div>
        <div class="ttd-line">( _________________ )</div>
        <div class="ttd-role">Operator / Tata Usaha</div>
      </div>
      <div class="ttd-block">
        <div>Diketahui oleh,</div>
        <div class="ttd-space"></div>
        <div class="ttd-line">( _________________ )</div>
        <div class="ttd-role">Wakil Kepala Sekolah</div>
      </div>
      <div class="ttd-block">
        <div>Cisarua, ${esc(todayStr)}</div>
        <div>Mengetahui,</div>
        <div class="ttd-space sm"></div>
        <div class="ttd-line">( _________________ )</div>
        <div class="ttd-name">Kepala Sekolah</div>
        <div class="ttd-role">NIP. __________________</div>
      </div>
    </div>`
}

function pageFooter(current, total, todayStr) {
    const label = total > 1 ? `Halaman ${current} dari ${total}` : `Halaman 1`
    return `
    <div class="pdf-footer">
      <span>SMKN 1 CISARUA — Laporan Statistik Presensi Guru</span>
      <span>Dicetak: ${esc(todayStr)}</span>
      <span>${label}</span>
    </div>`
}

// ── CSS — identik 100% dengan Vue scoped style, termasuk print rules ─────────────────
const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: A4; margin: 0; }
body { background: #fff; font-family: 'Times New Roman', Times, serif; }

/* ===== PDF PAGE ===== */
.pdf-page {
  width: 794px;
  min-height: 1123px;
  font-family: 'Times New Roman', Times, serif;
  background: #fff;
  margin-bottom: 28px;
  box-shadow: 0 4px 24px rgba(0,0,0,.15);
  display: flex;
  flex-direction: column;
}

/* print optimization */
@media print {
  .pdf-page {
    margin-bottom: 0;
    box-shadow: none;
    page-break-after: always;
    break-after: page;
  }
  .pdf-page:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }
}

/* ===== KOP HALAMAN 1 ===== */
.kop {
  border-bottom: 3px solid #1e3a5f;
  padding: 18px 40px 14px;
  display: flex;
  align-items: center;
  gap: 18px;
}
.kop-logo {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.kop-logo-img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}
.kop-center {
  flex: 1;
  text-align: center;
}
.kop-instansi {
  font-size: 11px;
  color: #374151;
}
.kop-sekolah {
  font-size: 18px;
  font-weight: bold;
  color: #1e3a5f;
  margin: 2px 0;
}
.kop-alamat {
  font-size: 10px;
  color: #6b7280;
}

/* ===== KOP MINI ===== */
.kop-mini {
  border-bottom: 2px solid #1e3a5f;
  padding: 10px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kop-mini-title {
  font-size: 13px;
  font-weight: bold;
  color: #1e3a5f;
}
.kop-mini-sub {
  font-size: 10px;
  color: #6b7280;
}

/* ===== JUDUL DOKUMEN ===== */
.doc-title-block {
  text-align: center;
  padding: 14px 40px 12px;
  border-bottom: 1px solid #d1d5db;
}
.doc-title {
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #111827;
}
.doc-subtitle {
  font-size: 11px;
  color: #6b7280;
  margin-top: 3px;
}

/* ===== BODY & FOOTER ===== */
.pdf-body {
  padding: 20px 40px;
  flex: 1;
}
.pdf-footer {
  border-top: 1px solid #e5e7eb;
  padding: 7px 40px;
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: #9ca3af;
  margin-top: auto;
}

/* ===== SECTIONS ===== */
.section {
  margin-bottom: 18px;
}
.section-title {
  font-size: 10.5px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: .7px;
  color: #1e3a5f;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 4px;
  margin-bottom: 10px;
}
.green-title { color: #15803d; }
.red-title   { color: #b91c1c; }

.continues-note {
  font-size: 9px;
  color: #94a3b8;
  text-align: right;
  margin-top: 4px;
  font-style: italic;
}

/* ===== STATS GRID ===== */
.stats-grid {
  width: 100%;
  border-collapse: collapse;
}
.stat-cell {
  width: 25%;
  padding: 10px 14px;
  border: 1px solid;
}
.stat-cell.blue   { background: #f0f4ff; border-color: #c7d2fe; }
.stat-cell.green  { background: #f0fdf4; border-color: #bbf7d0; border-left: none; }
.stat-cell.orange { background: #fff7ed; border-color: #fed7aa; border-left: none; }
.stat-cell.red    { background: #fff1f2; border-color: #fecdd3; border-left: none; }

.stat-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.stat-cell.blue   .stat-label { color: #6366f1; }
.stat-cell.green  .stat-label { color: #16a34a; }
.stat-cell.orange .stat-label { color: #ea580c; }
.stat-cell.red    .stat-label { color: #e11d48; }

.stat-val {
  font-size: 22px;
  font-weight: bold;
  line-height: 1.2;
}
.stat-cell.blue   .stat-val { color: #1e293b; }
.stat-cell.green  .stat-val { color: #15803d; }
.stat-cell.orange .stat-val { color: #c2410c; }
.stat-cell.red    .stat-val { color: #be123c; }

.stat-sub {
  font-size: 9px;
  color: #94a3b8;
}

/* ===== TABEL DATA GURU ===== */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.data-table thead tr {
  background: #1e3a5f;
  color: #fff;
}
.data-table th {
  padding: 7px 9px;
  font-weight: 600;
  text-align: center;
}
.data-table tbody tr      { background: #fff; }
.data-table tbody tr.even { background: #f8fafc; }
.data-table td {
  padding: 5.5px 9px;
  border-bottom: 1px solid #f1f5f9;
}

/* ===== TABEL RANKING ===== */
.rank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}
.rank-table thead tr { background: #f8fafc; }
.rank-table th {
  padding: 5px 8px;
  text-align: center;
  color: #374151;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
}
.rank-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #f1f5f9;
}

/* ===== TOP GRID ===== */
.top-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-bottom: 18px;
}

/* ===== UTILITY CLASSES ===== */
.tc         { text-align: center; }
.gray       { color: #6b7280; }
.muted      { color: #d1d5db; }
.green-txt  { color: #16a34a; }
.orange-txt { color: #d97706; }
.red-txt    { color: #dc2626; }
.bold-name  { font-weight: 500; color: #111827; }
.bold-pct   { font-weight: 700; }

.badge        { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 3px; }
.badge-green  { background: #dcfce7; color: #15803d; }
.badge-yellow { background: #fef9c3; color: #a16207; }
.badge-red    { background: #fee2e2; color: #b91c1c; }

/* ===== NOTES & TTD ===== */
.notes-block {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 10px 14px;
  margin-bottom: 20px;
  font-size: 10px;
  color: #475569;
  line-height: 1.7;
}
.notes-title { font-weight: 600; margin-bottom: 2px; }

.ttd-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}
.ttd-block {
  text-align: center;
  font-size: 10px;
  color: #374151;
}
.ttd-space    { height: 56px; }
.ttd-space.sm { height: 44px; }
.ttd-line {
  border-top: 1px solid #374151;
  padding-top: 4px;
  margin: 0 20px;
}
.ttd-name { font-weight: 600; color: #111827; }
.ttd-role { color: #6b7280; }
`

// ── Main export ────────────────────────────────────────────────────────────
function generatePdfHtml(data, { range, date_from, date_to, kelasName = '' }) {
    const { summary, performa, top_hadir, top_tidak_hadir } = data

    const periodeLabel = buildPeriodeLabel(range, date_from, date_to)
    const todayStr = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    })

    // ── Pagination — identik 100% dengan Vue ────────────
    const totalGuru = performa.length
    const isSinglePage = totalGuru <= ROWS_P1_WITH_CLOSING

    let page1Rows, middleChunks, lastPageRows, totalPages

    if (isSinglePage) {
        page1Rows = performa
        middleChunks = []
        lastPageRows = []
        totalPages = 1
    } else {
        page1Rows = performa.slice(0, ROWS_P1_WITH_CLOSING)
        const remaining = performa.slice(ROWS_P1_WITH_CLOSING)
        const midPages = Math.ceil(Math.max(0, remaining.length - ROWS_LAST_PAGE) / ROWS_MID)
        totalPages = 2 + midPages

        if (totalPages === 2) {
            middleChunks = []
            lastPageRows = remaining
        } else {
            const forMiddle = remaining.slice(0, remaining.length - ROWS_LAST_PAGE)
            middleChunks = []
            for (let i = 0; i < forMiddle.length; i += ROWS_MID) {
                middleChunks.push(forMiddle.slice(i, i + ROWS_MID))
            }
            lastPageRows = remaining.slice(remaining.length - ROWS_LAST_PAGE)
        }
    }

    // ── Build pages ──────────────────────────────────────────
    const pages = []

    // HALAMAN 1
    pages.push(`
    <div class="pdf-page">
      <div class="kop">
        <div class="kop-logo">
          <img class="kop-logo-img" src="data:image/png;base64,${LOGO_BASE64}" alt="Logo" />
        </div>
        <div class="kop-center">
          <div class="kop-instansi">PEMERINTAH DAERAH KABUPATEN BANDUNG BARAT</div>
          <div class="kop-instansi">DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
          <div class="kop-sekolah">SMKN 1 CISARUA</div>
          <div class="kop-alamat">Jl. Kolonel Masturi No.KM. 4, Kertawangi, Kec. Cisarua, Kabupaten Bandung Barat, Jawa Barat 40551</div>
          <div class="kop-alamat">Telp. (022) 2787xxxx &nbsp;|&nbsp; Email: smkn1cisarua@disdik.jabarprov.go.id</div>
        </div>
        <div style="width:72px"></div>
      </div>

      <div class="doc-title-block">
        <div class="doc-title">LAPORAN STATISTIK PRESENSI GURU</div>
        <div class="doc-subtitle">${esc(periodeLabel)}</div>
        ${kelasName ? `<div class="doc-subtitle">Kelas: ${esc(kelasName)}</div>` : ''}
      </div>

      <div class="pdf-body">
        <div class="section">
          <div class="section-title">I. RINGKASAN EKSEKUTIF</div>
          <table class="stats-grid">
            <tr>
              <td class="stat-cell blue">
                <div class="stat-label">Total Presensi</div>
                <div class="stat-val">${summary.total}</div>
                <div class="stat-sub">jadwal tercatat</div>
              </td>
              <td class="stat-cell green">
                <div class="stat-label">Tingkat Kehadiran</div>
                <div class="stat-val">${summary.pct_hadir}%</div>
                <div class="stat-sub">dari total presensi</div>
              </td>
              <td class="stat-cell orange">
                <div class="stat-label">TH + Tugas</div>
                <div class="stat-val">${summary.total_th_tugas}</div>
                <div class="stat-sub">kali tidak hadir + tugas</div>
              </td>
              <td class="stat-cell red">
                <div class="stat-label">Tidak Hadir</div>
                <div class="stat-val">${summary.pct_tidak_hadir}%</div>
                <div class="stat-sub">dari total presensi</div>
              </td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">II. PERFORMA KEHADIRAN PER GURU</div>
          ${guruTable(page1Rows, 0)}
          ${totalPages > 1 ? '<div class="continues-note">↓ Dilanjutkan di halaman berikutnya</div>' : ''}
        </div>

        ${isSinglePage ? closingSection(top_hadir, top_tidak_hadir, todayStr) : ''}
      </div>
      ${pageFooter(1, totalPages, todayStr)}
    </div>`)

    // HALAMAN TENGAH (jika totalPages > 2)
    if (totalPages > 2) {
        middleChunks.forEach((chunk, ci) => {
            pages.push(`
        <div class="pdf-page">
          <div class="kop-mini">
            <span class="kop-mini-title">SMKN 1 CISARUA</span>
            <span class="kop-mini-sub">Laporan Statistik Presensi Guru — ${esc(periodeLabel)}</span>
          </div>
          <div class="pdf-body">
            <div class="section">
              <div class="section-title">II. PERFORMA KEHADIRAN PER GURU (LANJUTAN)</div>
              ${guruTable(chunk, page1Rows.length + ci * ROWS_MID)}
              <div class="continues-note">↓ Dilanjutkan di halaman berikutnya</div>
            </div>
          </div>
          ${pageFooter(ci + 2, totalPages, todayStr)}
        </div>`)
        })
    }

    // HALAMAN TERAKHIR (jika totalPages >= 2)
    if (totalPages >= 2) {
        const lastStartIdx = performa.length - lastPageRows.length

        pages.push(`
      <div class="pdf-page">
        <div class="kop-mini">
          <span class="kop-mini-title">SMKN 1 CISARUA</span>
          <span class="kop-mini-sub">Laporan Statistik Presensi Guru — ${esc(periodeLabel)}</span>
        </div>
        <div class="pdf-body">
          ${lastPageRows.length > 0 ? `
            <div class="section">
              <div class="section-title">II. PERFORMA KEHADIRAN PER GURU (LANJUTAN)</div>
              ${guruTable(lastPageRows, lastStartIdx)}
            </div>` : ''}
          ${closingSection(top_hadir, top_tidak_hadir, todayStr)}
        </div>
        ${pageFooter(totalPages, totalPages, todayStr)}
      </div>`)
    }

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Presensi Guru</title>
  <style>${CSS}</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`
}

module.exports = { generatePdfHtml }