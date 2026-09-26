# Kopi Senja — Katalog & Pemesanan + CMS

MVP website untuk kedai kopi dengan dua pengalaman:

- **Storefront**: katalog menu, pencarian dan filter, halaman detail produk, keranjang, pilihan ambil di kedai/antar, checkout, nomor pesanan, dan handoff ke WhatsApp.
- **Dashboard CMS**: pemilik dapat menambah, mengubah, menghapus menu, mengubah status ketersediaan, melihat pesanan, memperbarui status pesanan, mengekspor CSV, dan mengubah informasi toko tanpa menyentuh kode. Lonceng notifikasi di topbar hanya muncul saat ada pesanan aktif (baru, sedang dibuat, siap diambil) dan angkanya adalah jumlah pesanan aktif tersebut.

## Menjalankan

```bash
cd kopi-senja
npm run dev
```

Buka:

- Storefront: `http://localhost:4173`
- Link khusus pemilik: `http://localhost:4173/pemilik-senja-7f3a`
- PIN demo: `2580`

Dashboard tidak lagi ditampilkan atau ditautkan di web pelanggan. Pemilik hanya membuka link khusus di atas. Route lama `/admin` dan `/admin.html` sudah dinonaktifkan (menghasilkan 404), dan halaman dashboard mengirim header `X-Robots-Tag: noindex` serta `no-store`.

Ganti link khusus bila perlu:

```bash
ADMIN_ROUTE=ruang-pemilik-anda npm run dev
```

Tidak ada dependensi npm yang perlu dipasang. Node.js 18+ sudah cukup.

## Data demo

Versi ini memakai `localStorage` agar seluruh alur dapat dicoba tanpa akun database atau konfigurasi hosting. Data menu, pesanan, pengaturan, dan keranjang tersimpan pada browser/origin yang sama.

> Untuk penggunaan nyata lintas perangkat, dashboard perlu backend/database, autentikasi pemilik yang sesungguhnya, upload gambar ke object storage, nomor WhatsApp bisnis, dan aturan deployment. PIN pada versi demo hanya untuk demonstrasi lokal.

## Mode gelap

Bagian akhir halaman storefront punya section khusus "Preferensi tampilan" (`#tema`) berisi tombol mode gelap.

- Tanpa pilihan tersimpan, tampilan mengikuti setelan sistem (`prefers-color-scheme`).
- Setelah diklik, pilihan `light`/`dark` disimpan di `localStorage` (`senja.theme.v1`) dan tidak lagi dikoreksi setelan sistem.
- Script kecil di `<head>` menerapkan tema sebelum body dirender, jadi tidak ada kedip dari terang ke gelap.
- `color-scheme` ikut berubah, sehingga dropdown `<select>` dan kontrol bawaan browser ikut gelap.
- Warna address bar (<meta name="theme-color">) menyesuaikan tema.
- Scrollbar halaman memakai gaya sendiri (lihat di bawah), jadi warnanya datang dari token `--sb-thumb`, bukan dari `color-scheme`.
- Reset data demo di dashboard tidak menghapus pilihan tampilan.

Semua warna berasal dari token CSS di `assets/styles.css`; blok `[data-theme="dark"]` hanya menimpa nilai token, tanpa mengubah struktur DOM.

## Scrollbar halaman

Gulir vertikal storefront diberi gaya sendiri agar sesuai tema, dan hanya di halaman pelanggan.

- Discope ke `html.store-root` (kelas yang ada di `index.html` saja), sehingga dashboard CMS tetap memakai scrollbar bawaan.
- Track transparan, thumb berupa pil warna kopi dari `--sb-thumb`, melayang di atas konten. Di hover warnanya menghangat ke `--accent-dark` dan thumb membesar 7px → 9px.
- Lebar `15px` dipilih **sama persis** dengan gutter scrollbar bawaan Chrome di Windows, sehingga mengaktifkan gaya ini tidak menggeser layout satu piksel pun. Kalau diubah, seluruh situs akan bergeser.
- Firefox tidak mengenal `::-webkit-scrollbar`, jadi dapat versi minimal lewat `scrollbar-color` di dalam `@supports (-moz-appearance: none)`.
- Border transparan + `background-clip: content-box` yang membuat thumb tetap slim di tengah track.

Dua hal yang mudah dinetralkan tanpa sengaja:

- Jangan memakai `scrollbar-width` atau `scrollbar-color` di elemen yang sama. Chrome menganggap `::-webkit-scrollbar` diabaikan begitu salah satunya dipecah, sehingga track/thumb kustom ini lenyap. Dua properti itu hanya boleh ditulis di blok `@supports` khusus Firefox.
- Angka `15px` di `width` bukan pilihan estetika. Menggantinya dengan angka lain akan menggeser isi halaman.

## Struktur

```text
kopi-senja/
├── server.mjs              # server statis tanpa dependensi
└── public/
    ├── index.html          # storefront
    ├── admin.html          # dashboard CMS
    └── assets/
        ├── styles.css      # desain storefront
        ├── admin.css       # desain dashboard
        ├── store.js        # model data + localStorage
        ├── app.js          # interaksi storefront
        └── admin.js        # interaksi CMS
```

## Alur uji cepat

1. Buka storefront, pilih kategori, lalu klik produk atau tombol `+`.
2. Buka keranjang, pilih ambil/antar, isi data, dan kirim pesanan.
3. Buka link khusus pemilik (`/pemilik-senja-7f3a`) lalu masuk dengan PIN `2580`. Pastikan `/admin` dan `/admin.html` sudah 404.
4. Ubah status menu atau pesanan dan buka storefront di tab lain; perubahan langsung terlihat.
5. Scroll ke section "Preferensi tampilan" di akhir halaman, klik tombol mode gelap, lalu reload — pilihan harus tetap.
6. Coba dashboard dalam mode privat — data browser akan terpisah sesuai aturan penyimpanan browser.
