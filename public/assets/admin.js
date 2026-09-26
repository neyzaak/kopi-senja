import {
  addMenuItem,
  deleteMenuItem,
  formatCurrency,
  getMenu,
  getOrders,
  getSettings,
  resetAllData,
  saveSettings,
  updateMenuItem,
  updateOrderStatus,
} from "./store.js";
import { pusatkanTinta } from "./optical-center.js";

const ADMIN_PIN = "2580";
const ACTIVE_ORDER_STATUSES = ["pending", "preparing", "ready"];
const STATUS_LABELS = {
  pending: "Pesanan baru",
  preparing: "Sedang dibuat",
  ready: "Siap diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const state = {
  view: "overview",
  menu: getMenu(),
  orders: getOrders(),
  settings: getSettings(),
  menuSearch: "",
  orderFilter: "all",
  confirmAction: null,
};

const elements = {
  login: document.querySelector("#adminLogin"),
  app: document.querySelector("#adminApp"),
  content: document.querySelector("#adminContent"),
  pageTitle: document.querySelector("#pageTitle"),
  menuDialog: document.querySelector("#menuDialog"),
  menuForm: document.querySelector("#menuForm"),
  menuDialogTitle: document.querySelector("#menuDialogTitle"),
  confirmDialog: document.querySelector("#confirmDialog"),
  confirmTitle: document.querySelector("#confirmTitle"),
  confirmMessage: document.querySelector("#confirmMessage"),
  confirmAction: document.querySelector("#confirmAction"),
  toastStack: document.querySelector("#adminToastStack"),
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeImage(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : "";
  } catch {
    return "";
  }
}

// src="" membuat browser mencoba memuat dokumen saat ini sebagai gambar, jadi
// URL kosong tidak boleh jadi <img>. Foto yang gagal dimuat diganti placeholder.
function imageThumb(value, size) {
  const src = safeImage(value);
  if (!src) return `<span class="thumb-empty thumb-${size}" aria-hidden="true"><i data-lucide="image-off"></i></span>`;
  return `<img class="thumb-${size}" src="${src}" alt="" loading="lazy" />`;
}

function replaceBrokenThumb(image) {
  const fallback = document.createElement("span");
  fallback.className = `thumb-empty thumb-${image.className.replace("thumb-", "")}`;
  fallback.setAttribute("aria-hidden", "true");
  fallback.innerHTML = '<i data-lucide="image-off"></i>';
  image.replaceWith(fallback);
  refreshIcons();
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
}

function formatDate(value, includeTime = true) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function isToday(value) {
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function activeOrders() {
  return state.orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `admin-toast ${type}`;
  toast.innerHTML = `<i data-lucide="${type === "error" ? "circle-alert" : "circle-check"}"></i><span>${escapeHtml(message)}</span>`;
  elements.toastStack.append(toast);
  refreshIcons();
  window.setTimeout(() => toast.remove(), 3000);
}

function pageHeading(view) {
  return {
    overview: "Ringkasan hari ini",
    menu: "Kelola menu",
    orders: "Daftar pesanan",
    settings: "Pengaturan toko",
  }[view];
}

function updateSidebar() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
  const active = activeOrders().length;
  const notificationButton = document.querySelector("#notificationButton");
  const notificationCount = document.querySelector("#notificationCount");
  const sidebarOrderCount = document.querySelector("#sidebarOrderCount");
  document.querySelector("#sidebarMenuCount").textContent = state.menu.length;
  sidebarOrderCount.textContent = active || "";
  sidebarOrderCount.hidden = active === 0;
  notificationButton.classList.toggle("has-orders", active > 0);
  notificationButton.hidden = active === 0;
  notificationCount.textContent = active > 99 ? "99+" : String(active);
  notificationCount.hidden = active === 0;
  notificationButton.setAttribute("aria-label", active ? `Notifikasi, ${active} pesanan aktif` : "Notifikasi");
  // Angka di kedua badge bulat ini dipusatkan secara optis, sama seperti
  // badge keranjang di halaman pelanggan.
  pusatkanTinta(sidebarOrderCount);
  pusatkanTinta(notificationCount);
  elements.pageTitle.textContent = pageHeading(state.view);
}

function statCard(label, value, icon, tone = "", note = "") {
  return `
    <article class="stat-card">
      <div class="stat-head"><span>${escapeHtml(label)}</span><span class="stat-icon ${tone}"><i data-lucide="${icon}"></i></span></div>
      <div class="stat-value"><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>
    </article>`;
}

function statusPill(status) {
  return `<span class="status-pill status-${escapeHtml(status)}">${escapeHtml(STATUS_LABELS[status] || status)}</span>`;
}

function orderRows(orders) {
  if (!orders.length) {
    return `<tr><td colspan="5"><div class="admin-empty"><span><i data-lucide="inbox"></i></span><h2>Belum ada pesanan</h2><p>Pesanan baru dari pelanggan akan muncul di sini secara otomatis.</p></div></td></tr>`;
  }
  return orders
    .slice(0, 6)
    .map(
      (order) => `
        <tr>
          <td><div class="order-customer"><span class="customer-avatar">${escapeHtml(initials(order.customer.name))}</span><div><strong>${escapeHtml(order.customer.name)}</strong><small>${escapeHtml(formatDate(order.createdAt))}</small></div></div></td>
          <td><span class="order-code">${escapeHtml(order.code)}</span></td>
          <td>${order.items.reduce((sum, item) => sum + item.quantity, 0)} item</td>
          <td><strong>${formatCurrency(order.total)}</strong></td>
          <td>${statusPill(order.status)}</td>
        </tr>`,
    )
    .join("");
}

function renderOverview() {
  const todayOrders = state.orders.filter((order) => isToday(order.createdAt));
  const activeOrderCount = activeOrders().length;
  const todayRevenue = todayOrders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.total), 0);
  const availableMenu = state.menu.filter((item) => item.available).length;

  elements.content.innerHTML = `
    <section class="stats-grid">
      ${statCard("Pendapatan hari ini", formatCurrency(todayRevenue), "wallet-cards", "green")}
      ${statCard("Pesanan hari ini", String(todayOrders.length), "shopping-bag", "yellow")}
      ${statCard("Pesanan aktif", String(activeOrderCount), "loader-circle", "blue")}
      ${statCard("Menu tersedia", `${availableMenu}/${state.menu.length}`, "coffee", "", `${Math.round((availableMenu / Math.max(state.menu.length, 1)) * 100)}% aktif`)}
    </section>
    <section class="overview-layout">
      <article class="admin-card">
        <div class="admin-card-head"><div><h2>Pesanan terbaru</h2><p>6 pesanan terakhir dari semua pelanggan</p></div><button class="card-link" type="button" data-go-view="orders">Lihat semua <i data-lucide="arrow-right"></i></button></div>
        <div style="overflow-x:auto"><table class="recent-table"><thead><tr><th scope="col">Pelanggan</th><th scope="col">No. pesanan</th><th scope="col">Item</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead><tbody>${orderRows(state.orders)}</tbody></table></div>
      </article>
      <aside class="admin-card">
        <div class="admin-card-head"><div><h2>Aksi cepat</h2><p>Yang paling sering dibutuhkan</p></div></div>
        <div class="quick-actions">
          <button class="quick-action" type="button" data-add-menu><span><i data-lucide="coffee"></i></span><div><strong>Tambah menu baru</strong><small>Tampilkan produk baru</small></div><i data-lucide="chevron-right"></i></button>
          <button class="quick-action" type="button" data-go-view="orders"><span><i data-lucide="clipboard-check"></i></span><div><strong>Kelola pesanan</strong><small>Perbarui status pesanan</small></div><i data-lucide="chevron-right"></i></button>
          <button class="quick-action" type="button" data-go-view="settings"><span><i data-lucide="store"></i></span><div><strong>Edit informasi toko</strong><small>Alamat, jam, dan kontak</small></div><i data-lucide="chevron-right"></i></button>
        </div>
      </aside>
    </section>`;
}

function renderMenu() {
  const query = state.menuSearch.trim().toLocaleLowerCase("id-ID");
  const filtered = state.menu.filter((item) => `${item.name} ${item.category} ${item.description}`.toLocaleLowerCase("id-ID").includes(query));
  const rows = filtered.length
    ? filtered
        .map(
          (item) => `
            <tr>
              <td><div class="menu-product-cell">${imageThumb(item.image, "lg")}<div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></div></div></td>
              <td><span class="category-chip">${escapeHtml(item.category)}</span></td>
              <td>${escapeHtml(item.category)}</td>
              <td><strong>${formatCurrency(item.price)}</strong></td>
              <td><label class="switch" title="Tampilkan menu"><input type="checkbox" data-menu-toggle="${escapeHtml(item.id)}" ${item.available ? "checked" : ""} /><span></span></label></td>
              <td><div class="table-actions"><button class="table-action" type="button" data-edit-menu="${escapeHtml(item.id)}" title="Edit menu"><i data-lucide="pencil"></i></button><button class="table-action delete" type="button" data-delete-menu="${escapeHtml(item.id)}" title="Hapus menu"><i data-lucide="trash-2"></i></button></div></td>
            </tr>`,
        )
        .join("")
    : `<tr><td colspan="6"><div class="admin-empty"><span><i data-lucide="search-x"></i></span><h2>Menu tidak ditemukan</h2><p>Coba kata kunci yang lain atau tambahkan menu baru.</p></div></td></tr>`;

  elements.content.innerHTML = `
    <div class="page-toolbar">
      <div><h2>Semua menu</h2><p>${state.menu.length} produk · ${state.menu.filter((item) => item.available).length} sedang tersedia</p></div>
      <div class="toolbar-actions"><label class="admin-search"><i data-lucide="search"></i><input id="adminMenuSearch" type="search" value="${escapeHtml(state.menuSearch)}" placeholder="Cari menu..." /></label><button class="admin-button" type="button" data-add-menu><i data-lucide="plus"></i> Tambah menu</button></div>
    </div>
    <article class="admin-card admin-table-card">
      <table class="admin-menu-table">
        <thead><tr><th scope="col">Produk</th><th scope="col">Kategori</th><th scope="col">Stok</th><th scope="col">Harga</th><th scope="col">Tampil</th><th scope="col"><span class="sr-only">Aksi</span></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </article>`;

  document.querySelector("#adminMenuSearch")?.addEventListener("input", (event) => {
    state.menuSearch = event.target.value;
    const cursor = event.target.selectionStart;
    renderMenu();
    const next = document.querySelector("#adminMenuSearch");
    next.focus();
    next.setSelectionRange(cursor, cursor);
  });
}

function orderSummaryItem(label, value, icon) {
  return `<div class="order-summary-item"><span><i data-lucide="${icon}"></i></span><div><strong>${escapeHtml(value)}</strong><small>${escapeHtml(label)}</small></div></div>`;
}

function filteredOrders() {
  if (state.orderFilter === "all") return state.orders;
  if (state.orderFilter === "active") return activeOrders();
  return state.orders.filter((order) => order.status === state.orderFilter);
}

function renderOrders() {
  const orders = filteredOrders();
  const cards = orders.length
    ? orders
        .map((order) => {
          const images = order.items.slice(0, 3).map((item) => imageThumb(item.image, "sm")).join("");
          const orderType = order.orderType === "delivery" ? "Antar" : "Ambil di kedai";
          return `
            <article class="admin-order-card">
              <div class="admin-order-card-head">
                <div><small>No. pesanan</small><span class="order-code">${escapeHtml(order.code)}</span></div>
                <div><small>Pelanggan</small><strong>${escapeHtml(order.customer.name)} · ${escapeHtml(order.customer.phone)}</strong></div>
                <div><small>Waktu</small><strong>${escapeHtml(formatDate(order.createdAt))}</strong></div>
                <div>${statusPill(order.status)}</div>
              </div>
              <div class="order-card-body">
                <div class="order-items-preview">${images}<div>${order.items.map((item) => `${escapeHtml(item.name)} ×${item.quantity}`).join("<br />")}</div></div>
                <div class="order-total"><strong>${formatCurrency(order.total)}</strong><small>${escapeHtml(orderType)} · ${escapeHtml(order.paymentMethod === "qris" ? "QRIS" : "Tunai")}</small></div>
                <select class="order-status-select" data-order-status="${escapeHtml(order.id)}" aria-label="Ubah status pesanan">${Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${order.status === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>
              </div>
              ${order.customer.note || order.customer.address ? `<div class="order-note"><i data-lucide="message-square-text"></i>${order.customer.address ? `<span><strong>Alamat:</strong> ${escapeHtml(order.customer.address)}</span>` : ""}${order.customer.note ? `<span><strong>Catatan:</strong> ${escapeHtml(order.customer.note)}</span>` : ""}</div>` : ""}
            </article>`;
        })
        .join("")
    : `<div class="admin-card admin-empty"><span><i data-lucide="clipboard-list"></i></span><h2>Tidak ada pesanan di kategori ini</h2><p>Pilih filter lain atau tunggu pesanan baru masuk.</p></div>`;

  const filters = [
    ["all", "Semua"],
    ["active", `Aktif (${activeOrders().length})`],
    ["pending", "Baru"],
    ["preparing", "Dibuat"],
    ["ready", "Siap"],
    ["completed", "Selesai"],
    ["cancelled", "Dibatalkan"],
  ];

  elements.content.innerHTML = `
    <div class="order-summary-grid">
      ${orderSummaryItem("Semua pesanan", state.orders.length, "clipboard-list")}
      ${orderSummaryItem("Pesanan aktif", activeOrders().length, "loader-circle")}
      ${orderSummaryItem("Perlu diproses", state.orders.filter((order) => order.status === "pending").length, "circle-alert")}
      ${orderSummaryItem("Siap diambil", state.orders.filter((order) => order.status === "ready").length, "circle-check-big")}
    </div>
    <div class="page-toolbar">
      <div class="filter-tabs">${filters.map(([value, label]) => `<button class="${state.orderFilter === value ? "active" : ""}" type="button" data-order-filter="${value}">${label}</button>`).join("")}</div>
      <div class="toolbar-actions"><button class="admin-button secondary" type="button" data-export-orders ${state.orders.length ? "" : "disabled"}><i data-lucide="download"></i> Ekspor CSV</button></div>
    </div>
    <section class="orders-admin-list">${cards}</section>`;

  elements.content.querySelector(".filter-tabs .active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function renderSettings() {
  const settings = state.settings;
  elements.content.innerHTML = `
    <div class="settings-layout">
      <aside class="admin-card settings-nav">
        <button class="active" type="button"><i data-lucide="store"></i> Informasi toko</button>
        <button type="button" data-go-view="menu"><i data-lucide="coffee"></i> Kelola menu</button>
        <button type="button" data-go-view="orders"><i data-lucide="clipboard-list"></i> Pesanan</button>
      </aside>
      <form id="settingsForm">
        <article class="admin-card">
          <section class="settings-section">
            <div class="settings-section-head"><h2>Identitas toko</h2><p>Nama dan cerita yang tampil di halaman utama pelanggan.</p></div>
            <div class="settings-form-grid">
              <label class="field"><span>Nama toko</span><input name="name" value="${escapeHtml(settings.name)}" required /></label>
              <label class="field"><span>Slogan</span><input name="tagline" value="${escapeHtml(settings.tagline)}" required /></label>
              <label class="field full"><span>Deskripsi singkat</span><textarea name="description" required>${escapeHtml(settings.description)}</textarea></label>
            </div>
          </section>
          <section class="settings-section">
            <div class="settings-section-head"><h2>Lokasi & kontak</h2><p>Informasi yang membantu pelanggan menemukan dan menghubungi kedai.</p></div>
            <div class="settings-form-grid">
              <label class="field full"><span>Alamat</span><textarea name="address" required>${escapeHtml(settings.address)}</textarea></label>
              <label class="field"><span>Jam buka</span><input name="hours" value="${escapeHtml(settings.hours)}" required /></label>
              <label class="field"><span>Nomor telepon</span><input name="phone" value="${escapeHtml(settings.phone)}" required /></label>
              <label class="field"><span>Nomor WhatsApp</span><input name="whatsapp" inputmode="numeric" value="${escapeHtml(settings.whatsapp)}" required /><small style="color:#5f615a;font-size:8px">Gunakan format internasional, contoh 62812...</small></label>
              <label class="field"><span>Email</span><input name="email" type="email" value="${escapeHtml(settings.email)}" required /></label>
              <label class="field"><span>Biaya antar</span><div class="price-input"><b>Rp</b><input name="deliveryFee" type="number" min="0" step="500" value="${escapeHtml(settings.deliveryFee)}" required /></div></label>
            </div>
          </section>
          <section class="settings-section">
            <div class="settings-section-head"><h2>Status buka</h2><p>Kontrol cepat apakah toko sedang menerima pesanan.</p></div>
            <div class="shop-status-setting"><div><strong>Toko sedang buka</strong><small>Matikan bila sedang tutup atau kehabisan bahan.</small></div><label class="switch"><input name="isOpen" type="checkbox" aria-label="Toko menerima pesanan" ${settings.isOpen ? "checked" : ""} /><span></span></label></div>
          </section>
          <section class="settings-section"><div class="dialog-actions"><button class="admin-button" type="submit"><i data-lucide="save"></i> Simpan perubahan</button></div></section>
        </article>
        <article class="admin-card settings-section settings-danger" style="margin-top:16px">
          <div class="settings-section-head"><h2>Zona berisiko</h2><p>Tindakan berikut tidak dapat dibatalkan.</p></div>
          <div class="danger-box"><p>Menghapus data demo akan mengembalikan menu, pesanan, pengaturan, dan keranjang ke kondisi awal.</p><button class="admin-button danger" type="button" data-reset-data><i data-lucide="rotate-ccw"></i> Reset data demo</button></div>
        </article>
      </form>
    </div>`;
}

function renderView() {
  updateSidebar();
  if (state.view === "menu") renderMenu();
  else if (state.view === "orders") renderOrders();
  else if (state.view === "settings") renderSettings();
  else renderOverview();
  refreshIcons();
}

function navigate(view) {
  state.view = view;
  renderView();
  closeSidebar();
}

function updateDatalist() {
  const datalist = document.querySelector("#categoryOptions");
  const categories = [...new Set(state.menu.map((item) => item.category).filter(Boolean))];
  datalist.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
}

function openMenuDialog(id = "") {
  const item = id ? state.menu.find((menuItem) => menuItem.id === id) : null;
  elements.menuForm.reset();
  elements.menuForm.elements.id.value = item?.id || "";
  elements.menuForm.elements.name.value = item?.name || "";
  elements.menuForm.elements.category.value = item?.category || "Kopi";
  elements.menuForm.elements.price.value = item?.price ?? "";
  elements.menuForm.elements.description.value = item?.description || "";
  elements.menuForm.elements.image.value = item?.image || "";
  elements.menuForm.elements.badge.value = item?.badge || "";
  elements.menuForm.elements.available.checked = item ? item.available : true;
  elements.menuForm.elements.featured.checked = item?.featured || false;
  elements.menuDialogTitle.textContent = item ? "Edit menu" : "Tambah menu baru";
  updateDatalist();
  elements.menuDialog.showModal();
  window.setTimeout(() => elements.menuForm.elements.name.focus(), 60);
}

function saveMenuFromForm(event) {
  event.preventDefault();
  if (!elements.menuForm.reportValidity()) return;
  const form = new FormData(elements.menuForm);
  const payload = {
    name: String(form.get("name")).trim(),
    category: String(form.get("category")).trim(),
    price: Number(form.get("price")),
    description: String(form.get("description")).trim(),
    image: String(form.get("image")).trim(),
    badge: String(form.get("badge") || "").trim(),
    available: form.get("available") === "on",
    featured: form.get("featured") === "on",
  };
  const id = form.get("id");
  if (id) {
    updateMenuItem(String(id), payload);
    showToast("Menu berhasil diperbarui.");
  } else {
    addMenuItem(payload);
    showToast("Menu baru berhasil ditambahkan.");
  }
  state.menu = getMenu();
  elements.menuDialog.close();
  renderView();
}

function askConfirm({ title, message, label = "Hapus", action }) {
  state.confirmAction = action;
  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.confirmAction.textContent = label;
  elements.confirmDialog.showModal();
}

function confirmDestructiveAction() {
  const action = state.confirmAction;
  state.confirmAction = null;
  elements.confirmDialog.close();
  if (typeof action === "function") action();
}

function exportOrders() {
  if (!state.orders.length) {
    showToast("Belum ada pesanan untuk diekspor.", "error");
    return;
  }
  const headers = ["Kode", "Tanggal", "Nama", "Telepon", "Tipe", "Pembayaran", "Item", "Subtotal", "Ongkir", "Total", "Status", "Catatan", "Alamat"];
  const rows = state.orders.map((order) => [
    order.code,
    order.createdAt,
    order.customer.name,
    order.customer.phone,
    order.orderType,
    order.paymentMethod,
    order.items.map((item) => `${item.name} x${item.quantity}`).join(" | "),
    order.subtotal,
    order.deliveryFee,
    order.total,
    STATUS_LABELS[order.status] || order.status,
    order.customer.note,
    order.customer.address,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pesanan-kopi-senja-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Data pesanan berhasil diekspor.");
}

function handleContentClick(event) {
  const goButton = event.target.closest("[data-go-view]");
  if (goButton) navigate(goButton.dataset.goView);

  if (event.target.closest("[data-add-menu]")) openMenuDialog();

  const editButton = event.target.closest("[data-edit-menu]");
  if (editButton) openMenuDialog(editButton.dataset.editMenu);

  const deleteButton = event.target.closest("[data-delete-menu]");
  if (deleteButton) {
    const item = state.menu.find((menuItem) => menuItem.id === deleteButton.dataset.deleteMenu);
    askConfirm({
      title: `Hapus ${item?.name || "menu"}?`,
      message: "Menu akan langsung hilang dari storefront dan tidak dapat dipulihkan.",
      action: () => {
        deleteMenuItem(deleteButton.dataset.deleteMenu);
        state.menu = getMenu();
        renderView();
        showToast("Menu berhasil dihapus.");
      },
    });
  }

  const filterButton = event.target.closest("[data-order-filter]");
  if (filterButton) {
    state.orderFilter = filterButton.dataset.orderFilter;
    renderOrders();
    refreshIcons();
  }

  if (event.target.closest("[data-export-orders]")) exportOrders();

  if (event.target.closest("[data-reset-data]")) {
    askConfirm({
      title: "Reset semua data demo?",
      message: "Seluruh menu, pesanan, pengaturan, dan keranjang akan dikembalikan ke kondisi awal.",
      label: "Reset data",
      action: () => {
        resetAllData();
        showToast("Data demo berhasil direset.");
        window.setTimeout(() => window.location.reload(), 300);
      },
    });
  }
}

function handleContentChange(event) {
  const menuToggle = event.target.closest("[data-menu-toggle]");
  if (menuToggle) {
    const item = state.menu.find((menuItem) => menuItem.id === menuToggle.dataset.menuToggle);
    updateMenuItem(menuToggle.dataset.menuToggle, { available: menuToggle.checked });
    state.menu = getMenu();
    showToast(`${item?.name || "Menu"} ${menuToggle.checked ? "ditampilkan" : "disembunyikan"}.`);
    return;
  }

  const statusSelect = event.target.closest("[data-order-status]");
  if (statusSelect) {
    updateOrderStatus(statusSelect.dataset.orderStatus, statusSelect.value);
    state.orders = getOrders();
    updateSidebar();
    showToast(`Status pesanan diubah menjadi ${STATUS_LABELS[statusSelect.value]}.`);
  }
}

function openSidebar() {
  document.querySelector("#adminSidebar").classList.add("open");
  document.querySelector("#sidebarBackdrop").classList.add("open");
  document.body.classList.add("locked");
}

function closeSidebar() {
  document.querySelector("#adminSidebar").classList.remove("open");
  document.querySelector("#sidebarBackdrop").classList.remove("open");
  document.body.classList.remove("locked");
}

function saveSettingsFromForm(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  saveSettings({
    name: String(form.get("name")).trim(),
    tagline: String(form.get("tagline")).trim(),
    description: String(form.get("description")).trim(),
    address: String(form.get("address")).trim(),
    hours: String(form.get("hours")).trim(),
    phone: String(form.get("phone")).trim(),
    whatsapp: String(form.get("whatsapp")).replace(/\D/g, ""),
    email: String(form.get("email")).trim(),
    deliveryFee: Number(form.get("deliveryFee")),
    isOpen: form.get("isOpen") === "on",
  });
  state.settings = getSettings();
  showToast("Informasi toko berhasil disimpan.");
  renderView();
}

function initializeDashboard() {
  elements.content.addEventListener("click", handleContentClick);
  elements.content.addEventListener("change", handleContentChange);
  // Event "error" pada <img> tidak naik ke induk, jadi harus ditangkap saat capture.
  elements.content.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (image instanceof HTMLImageElement) replaceBrokenThumb(image);
    },
    true,
  );
  document.querySelector("#settingsForm")?.addEventListener("submit", saveSettingsFromForm);

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  document.querySelector("#quickAddMenu").addEventListener("click", () => openMenuDialog());
  document.querySelector("#openSidebar").addEventListener("click", openSidebar);
  document.querySelector("#closeSidebar").addEventListener("click", closeSidebar);
  document.querySelector("#sidebarBackdrop").addEventListener("click", closeSidebar);
  document.querySelector("#notificationButton").addEventListener("click", () => {
    state.orderFilter = "active";
    navigate("orders");
  });
  document.querySelector("#logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("senja.admin.session");
    window.location.reload();
  });

  document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  renderView();
}

function initializeAuth() {
  const loginForm = document.querySelector("#loginForm");
  const pinInput = document.querySelector("#adminPin");
  const error = document.querySelector("#loginError");

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (pinInput.value !== ADMIN_PIN) {
      error.hidden = false;
      pinInput.select();
      return;
    }
    sessionStorage.setItem("senja.admin.session", "active");
    elements.login.hidden = true;
    elements.app.hidden = false;
    initializeDashboard();
  });

  document.querySelector("#togglePin").addEventListener("click", (event) => {
    const isPassword = pinInput.type === "password";
    pinInput.type = isPassword ? "text" : "password";
    event.currentTarget.innerHTML = `<i data-lucide="${isPassword ? "eye-off" : "eye"}"></i>`;
    refreshIcons();
  });

  if (sessionStorage.getItem("senja.admin.session") === "active") {
    elements.login.hidden = true;
    elements.app.hidden = false;
    initializeDashboard();
  }
}

function initializeShared() {
  elements.menuForm.addEventListener("submit", saveMenuFromForm);
  document.querySelector("#confirmCancel").addEventListener("click", () => elements.confirmDialog.close());
  elements.confirmAction.addEventListener("click", confirmDestructiveAction);
  document.querySelectorAll("[data-close-menu-dialog]").forEach((button) => button.addEventListener("click", () => elements.menuDialog.close()));

  window.addEventListener("senja:changed", (event) => {
    const key = event.detail?.key;
    if (!["senja.menu.v1", "senja.orders.v1", "senja.settings.v1", "all"].includes(key)) return;
    state.menu = getMenu();
    state.orders = getOrders();
    state.settings = getSettings();
    if (!elements.app.hidden) renderView();
  });

  window.addEventListener("load", refreshIcons);
}

initializeShared();
initializeAuth();
