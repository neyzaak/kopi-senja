// Memusatkan angka di dalam badge bulat.
//
// Badge memakai `place-items: center`, jadi yang dipusatkan adalah advance box
// teks - kotak virtual yang tidak terlihat. Padahal bentuk glyph tidak
// seimbang: "7" massanya menumpuk di batang atas, "6" berat di kiri bawah,
// "1" punya flag di kiri. Akibatnya advance box-nya di tengah lingkaran,
// tapi massa tintanya meleset, dan angka tertentu terlihat tidak simetris.
//
// Angka di bawah adalah nilai optimal per digit, diukur dari render nyata
// (rasio 4x) dengan loop tertutup: sapuan piksel -> koreksi -> sapuan lagi.
// Diulang pada dua fase sub-piksel berbeda (geser 0 dan 0,25px) untuk memastikan
// hasilnya bukan artefak posisi. Kedua fase memberi angka yang identik sampai
// 0,001px, jadi nilainya benar-benar milik glyph, bukan milik Tata letak.
//
// Cara menerapkannya: --badge-nudge-x dan --badge-nudge-y menambah padding kiri
// dan mengurangi padding kanan, begitu juga atas dan bawah, jadi total padding
// tetap. Area konten hanya bergeser, ukuran badge tidak berubah, dan teks
// bergerak tepat 1:1 - terverifikasi: geser(+1px) - geser(-1px) = 2,000px.
//
// Untuk angka lebih dari satu digit, penggeserannya dirata-ratakan. Itu
// memusatkan massa keseluruhan dengan galat kecil, karena bobot tinta tiap
// digit tidak sama tetapi hanya berbeda sekitar 30%.
//
// Kuncinya adalah ukuran font. Kalau ukuran font tidak ada di tabel, tidak ada
// penggeseran sama sekali: lebih baik lurus daripada salah geser.
const TABEL = {
  // badge keranjang, mobile (<=560px)
  "8px": {
    0: [0.234, 0.335], 1: [-0.011, 0.615], 2: [0.030, 0.165], 3: [0.056, 0.283], 4: [-0.063, 0.190],
    5: [0.178, 0.396], 6: [0.332, 0.235], 7: [0.072, 0.911], 8: [0.177, 0.302], 9: [0.104, 0.280],
  },
  // badge "Pesanan" di sidebar dashboard
  "9px": {
    0: [0.073, 0.24], 1: [-0.129, 0.33], 2: [-0.03, 0.094], 3: [-0.081, 0.189], 4: [-0.243, -0.109],
    5: [0.046, 0.006], 6: [0.178, 0.137], 7: [-0.104, 0.755], 8: [0.127, 0.221], 9: [-0.046, 0.105],
  },
  // badge notifikasi di topbar dashboard
  "10px": {
    0: [0.155, 0.072], 1: [-0.244, 0.219], 2: [0.08, -0.163], 3: [-0.109, -0.018], 4: [-0.216, -0.053],
    5: [0.158, 0.073], 6: [0.145, -0.049], 7: [-0.159, 0.893], 8: [-0.005, 0.038], 9: [-0.068, 0.197],
  },
  // badge keranjang, desktop (>560px)
  "11px": {
    0: [0.076, 0.096], 1: [-0.191, 0.489], 2: [-0.11, 0.109], 3: [-0.16, 0.007], 4: [-0.315, -0.082],
    5: [-0.01, 0.146], 6: [0.198, 0.219], 7: [-0.184, 1.17], 8: [0.069, 0.076], 9: [-0.054, 0.225],
  },
};

/**
 * Geser angka di dalam badge agar massa tintanya jatuh di titik tengah.
 * Aman dipanggil berkali-kali: nilai ditulis ulang, bukan ditambahkan.
 * @param {HTMLElement|null} el elemen badge angka
 */
export function pusatkanTinta(el) {
  if (!el) return;
  const baris = TABEL[getComputedStyle(el).fontSize];
  let x = 0;
  let y = 0;
  let n = 0;
  if (baris) {
    for (const d of (el.textContent || "").trim()) {
      const v = baris[d];
      if (!v) continue;
      x += v[0];
      y += v[1];
      n += 1;
    }
  }
  if (n) {
    x /= n;
    y /= n;
  } else {
    x = 0;
    y = 0;
  }
  el.style.setProperty("--badge-nudge-x", `${x.toFixed(3)}px`);
  el.style.setProperty("--badge-nudge-y", `${y.toFixed(3)}px`);
}
