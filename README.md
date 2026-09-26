# Kopi Senja — Katalog & Pemesanan + CMS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node: 18+](https://img.shields.io/badge/Node-18%2B-green.svg)](https://nodejs.org)
[![No deps](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](package.json)
[![Vanilla JS](https://img.shields.io/badge/vanilla-JS%20%2B%20CSS-blue.svg)]()

MVP website untuk kedai kopi dengan dua pengalaman:

- **Storefront**: katalog menu, pencarian & filter, halaman detail produk, keranjang, pilihan ambil di kedai/antar, checkout, nomor pesanan, dan handoff ke WhatsApp.
- **Dashboard CMS**: CRUD menu, ketersediaan, pesanan, status, ekspor CSV, pengaturan toko, reset data demo — tanpa menyentuh kode.

---

## ✨ Fitur Utama

### Storefront (Pelanggan)
- Katalog menu dengan pencarian real-time & filter kategori
- Halaman detail produk (gambar, harga, deskripsi, ketersediaan)
- Keranjang belanja (tambah/kurang/hapus, hitung otomatis)
- Pilih **Ambil di Kedai** atau **Antar** (biaya antar otomatis)
- Checkout: nama, telepon, alamat (untuk antar), catatan, pembayaran (QRIS/Tunai)
- Nomor pesanan unik (`SEN-YYMMDD-XXX`)
- Handoff ke WhatsApp dengan pesan terstruktur siap kirim
- Mode gelap/terang (preferensi tersimpan di `localStorage`, tanpa flash)
- Scrollbar kustom tema (15px, tidak menggeser layout)
- Responsif: mobile-first, breakpoint 560px (badge keranjang 15px→30px, font 8px→11px)

### Dashboard CMS (Pemilik)
- **Akses via link rahasia** (`/pemilik-senja-7f3a`), bukan `/admin`
- Route lama (`/admin`, `/admin/`, `/admin.html`) → 404 + `X-Robots-Tag: noindex` + `Cache-Control: no-store`
- CRUD Menu: tambah, edit, hapus, upload gambar (drag-drop / paste)
- Ketersediaan: toggle tersedia/habis per item
- Kelola Pesanan: filter status, ubah status (baru → dibuat → siap → selesai/batal)
- Notifikasi topbar (lompat ke halaman Pesanan, jumlah = pesanan aktif)
- Ekspor CSV pesanan (filter status/rentang tanggal)
- Pengaturan toko: nama, alamat, telepon, jam buka, fee antar, WhatsApp, banner
- Reset data demo (menu + pesanan + pengaturan) tanpa hapus preferensi tema
- PIN demo: `2580`

### Teknis
- **Zero npm deps** — Node 18+ cukup, `npm run dev` jalan langsung
- Data di `localStorage` (demo lintas sesi, tanpa database)
- Font: DM Sans (Google Fonts, `display=swap`)
- Ikon: Lucide (bundled, `vendor/lucide.min.js`)
- CSS Custom Properties untuk theming & scrollbar
- Badge angka di-center optis (ink centroid, bukan advance box) — tabel per ukuran font (8/9/10/11px)

---

## 🚀 Menjalankan

```bash
cd kopi-senja
npm run dev
```

Buka:
- **Storefront**: `http://localhost:4173`
- **Dashboard**: `http://localhost:4173/pemilik-senja-7f3a` (PIN: `2580`)

Ganti link khusus pemilik:
```bash
ADMIN_ROUTE=ruang-pemilik-anda npm run dev
```

---

## 📁 Struktur Proyek

```text
kopi-senja/
├── server.mjs              # Static file server (no deps)
├── package.json            # Scripts only: "dev": "node server.mjs"
├── public/
│   ├── index.html          # Storefront entry
│   ├── admin.html          # Dashboard CMS entry
│   ├── robots.txt          # Disallow /pemilik-*
│   └── assets/
│       ├── styles.css      # Storefront design system
│       ├── admin.css       # Dashboard design
│       ├── store.js        # Data model + localStorage API
│       ├── app.js          # Storefront interactions
│       ├── admin.js        # Dashboard interactions
│       ├── optical-center.js  # Badge centering tables + fn
│       └── vendor/
│           └── lucide.min.js
```

---

## 🎨 Desain & Tema

| Token | Light | Dark |
|-------|-------|------|
| `--bg` | `#f5f4ef` | `#1a1a2e` |
| `--fg` | `#1a1a2e` | `#f5f4ef` |
| `--accent` | `#c47a3a` | `#d4a85a` |
| `--card` | `#fff` | `#23233a` |
| `--muted` | `#8b7d6b` | `#a89d8f` |
| `--border` | `#e8e4dc` | `#3a3a52` |

Semua warna di `assets/styles.css` → blok `:root` & `[data-theme="dark"]`.

**Scrollbar** (hanya storefront, `html.store-root`):
- `width: 15px` → sama persis gutter Chrome Windows
- Thumb: `--sb-thumb` (warna kopi), hover → `--accent-dark`, expand 7→9px
- Firefox fallback via `scrollbar-color` di `@supports (-moz-appearance: none)`

---

## ♿ Aksesibilitas

- Semantic HTML5 (`<main>`, `<section>`, `<article>`, `<nav>`, `<dialog>`)
- Label & `aria-*` pada form & kontrol
- Focus ring visible (`:focus-visible`)
- Kontras ≥ 4.5:1 (status pill, tombol, teks)
- `prefers-reduced-motion` dihormati (animasi dinonaktifkan)
- `prefers-color-scheme` sebagai default sebelum preferensi user

---

## 🔐 Keamanan (Demo)

- Dashboard hanya lewat link rahasia (`ADMIN_ROUTE`, default 32-char entropy)
- PIN demo `2580` — **hanya untuk lokal**, ganti sebelum produksi
- `X-Robots-Tag: noindex` + `Cache-Control: no-store` di dashboard
- Input sanitasi via `escapeHtml()` di `store.js`
- Tidak ada eval / innerHTML raw dari input user

> Untuk produksi: ganti `localStorage` → database, tambah autentikasi JWT/session, HTTPS wajib, CSP header, rate-limit, validasi server-side.

---

## 🧪 Alur Uji Cepat

1. Buka storefront → pilih kategori → klik produk / tombol `+`
2. Buka keranjang (badge angka di kanan atas) → pilih ambil/antar → isi data → kirim
3. Buka link pemilik → PIN `2580` → cek `/admin` & `/admin.html` = 404
4. Ubah status menu/pesanan → buka storefront tab lain → update real-time
5. Scroll ke "Preferensi tampilan" → klik mode gelap → reload → tetap gelap
6. Buka dashboard di incognito → data terpisah (localStorage per origin)

---

## 📦 Deployment (Ringkas)

```bash
# Build static (sudah static, cuma copy public/)
# Atau deploy server.mjs ke Node host (Railway, Render, Fly.io, VPS)
# Env: ADMIN_ROUTE=rahasia-anda  PORT=4173
```

**Checklist produksi:**
- [ ] Ganti `ADMIN_ROUTE` ke string acak panjang
- [ ] Ganti PIN default (`store.js` → `ADMIN_PIN`)
- [ ] Pasang database (PostgreSQL/SQLite) + migrasi `store.js` ke Prisma/Drizzle
- [ ] Tambah auth pemilik (session/JWT, bukan PIN statis)
- [ ] Upload gambar → S3/R2/Cloudinary (bukan base64 di localStorage)
- [ ] WhatsApp Business API (bukan `wa.me` link)
- [ ] HTTPS + HSTS + CSP + rate-limit
- [ ] Backup & monitoring

---

## 🤝 Kontribusi

1. Fork → branch `feat/nama-fitur`
2. Commit konvensional (`feat:`, `fix:`, `refactor:`, `docs:`)
3. Pastikan `npm run dev` jalan & no console error
4. PR ke `main` dengan deskripsi singkat & screenshot (UI change)

---

## 📄 Lisensi

MIT — bebas dipakai, dimodifikasi, didistribusikan. Lihat [LICENSE](LICENSE).

---

> **Kopi Senja** — dibangun untuk demo MVP kedai kopi modern, vanilla, zero-deps. ☕