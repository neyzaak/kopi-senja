import {
  createOrder,
  formatCurrency,
  getCart,
  getMenu,
  getSettings,
  getTheme,
  saveCart,
  saveTheme,
} from "./store.js";
import { pusatkanTinta } from "./optical-center.js";

const state = {
  menu: getMenu(),
  settings: getSettings(),
  cart: getCart(),
  category: "Semua",
  search: "",
  selectedProduct: null,
  lastOrder: null,
};

const elements = {
  menuGrid: document.querySelector("#menuGrid"),
  featuredGrid: document.querySelector("#featuredGrid"),
  categoryTabs: document.querySelector("#categoryTabs"),
  menuSearch: document.querySelector("#menuSearch"),
  emptySearch: document.querySelector("#emptySearch"),
  cartDrawer: document.querySelector("#cartDrawer"),
  cartBackdrop: document.querySelector("#cartBackdrop"),
  cartContent: document.querySelector("#cartContent"),
  cartFooter: document.querySelector("#cartFooter"),
  cartCount: document.querySelector("#cartCount"),
  openCart: document.querySelector("#openCart"),
  drawerCount: document.querySelector("#drawerCount"),
  cartSubtotal: document.querySelector("#cartSubtotal"),
  productDialog: document.querySelector("#productDialog"),
  productDetail: document.querySelector("#productDetail"),
  checkoutDialog: document.querySelector("#checkoutDialog"),
  checkoutForm: document.querySelector("#checkoutForm"),
  checkoutTotal: document.querySelector("#checkoutTotal"),
  checkoutBreakdown: document.querySelector("#checkoutBreakdown"),
  successDialog: document.querySelector("#successDialog"),
  successCode: document.querySelector("#successCode"),
  mobileCartBar: document.querySelector("#mobileCartBar"),
  mobileCartCount: document.querySelector("#mobileCartCount"),
  mobileCartTotal: document.querySelector("#mobileCartTotal"),
  themeToggle: document.querySelector("#themeToggle"),
  themeHint: document.querySelector("#themeHint"),
  toast: document.querySelector("#toast"),
};

// Warna bilah browser (address bar) ikut mengikuti tema aktif.
const THEME_COLORS = { light: "#f4efe6", dark: "#17150f" };

function activeTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[next]);
  if (elements.themeToggle) {
    elements.themeToggle.setAttribute("aria-checked", String(next === "dark"));
    elements.themeHint.textContent = `Sekarang: ${next}`;
  }
  return next;
}

function toggleTheme() {
  const next = activeTheme() === "dark" ? "light" : "dark";
  saveTheme(next);
  applyTheme(next);
  showToast(next === "dark" ? "Mode gelap aktif." : "Mode terang aktif.");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeImage(value, fallback = "") {
  if (!value) return fallback;
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? escapeHtml(url.href) : fallback;
  } catch {
    return fallback;
  }
}

const PHOTO_MISSING_HTML = '<span class="photo-missing" aria-hidden="true"><i data-lucide="image-off"></i></span>';

function createPhotoMissing() {
  const template = document.createElement("template");
  template.innerHTML = PHOTO_MISSING_HTML;
  return template.content.firstElementChild;
}

// src="" tidak berarti "tanpa gambar": browser mengambil dokumen saat ini
// lalu gagal memecahnya sebagai gambar. Jadi URL kosong tidak boleh jadi <img>.
function imageThumb(value, alt, lazy = true) {
  const src = safeImage(value);
  if (!src) return PHOTO_MISSING_HTML;
  return `<img src="${src}" alt="${escapeHtml(alt)}"${lazy ? ' loading="lazy"' : ""} />`;
}

// src="" dan URL mati sama-sama memicu event "error" yang tidak naik ke induk,
// jadi harus ditangkap saat capture di level document.
function replaceBrokenPhoto(image) {
  image.replaceWith(createPhotoMissing());
  refreshIcons();
}

// Gambar yang sudah gagal dimuat sebelum listener terpasang tidak pernah
// memunculkan event. naturalWidth 0 + complete berarti memang tidak ada gambarnya.
function repairBrokenPhotos() {
  const broken = document.querySelectorAll('img[src]:not([src=""])');
  let found = false;
  broken.forEach((image) => {
    if (!image.complete || image.naturalWidth > 0) return;
    image.replaceWith(createPhotoMissing());
    found = true;
  });
  if (found) refreshIcons();
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: { "stroke-width": 1.8 },
    });
  }
}

let toastTimer;
function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.querySelector("span").textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function getCartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartSubtotal() {
  return state.cart.reduce((sum, item) => {
    const product = state.menu.find((menuItem) => menuItem.id === item.id);
    return sum + Number(product?.price || item.price || 0) * item.quantity;
  }, 0);
}

function applySettings() {
  const settings = state.settings;
  document.title = `${settings.name} — ${settings.tagline}`;
  document.querySelector("#heroDescription").textContent = settings.description;
  document.querySelector("#openStatusText").textContent = settings.isOpen ? "Buka sekarang" : "Tutup saat ini";
  document.querySelector("#addressText").textContent = settings.address;
  document.querySelector("#hoursText").textContent = settings.hours;
  document.querySelector("#phoneText").textContent = settings.phone;
  document.querySelector("#footerPhone").textContent = settings.phone;
  document.querySelector("#footerPhone").href = `tel:${settings.phone.replace(/[^+\d]/g, "")}`;
  document.querySelector("#footerEmail").textContent = settings.email;
  document.querySelector("#footerEmail").href = `mailto:${settings.email}`;
  document.querySelector("#mapsLink").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;

  const featured = state.menu.find((item) => item.featured && item.available) || state.menu.find((item) => item.available);
  if (featured) {
    document.querySelector("#heroProductName").textContent = featured.name;
    document.querySelector("#heroProductPrice").textContent = formatCurrency(featured.price);
    renderHeroPhoto(featured);
  }
}

// applySettings() bisa dipanggil ulang dari event "senja:changed", jadi elemen
// <img> hero harus disimpan dan bisa dipasang kembali setelah diganti placeholder.
let heroImage = null;

function renderHeroPhoto(product) {
  const container = document.querySelector(".hero-special");
  if (!container) return;
  if (!heroImage) heroImage = document.querySelector("#heroProductImage");
  const src = safeImage(product.image);
  const holder = container.querySelector(".photo-missing");

  if (src) {
    holder?.remove();
    if (heroImage) {
      if (!heroImage.isConnected) container.prepend(heroImage);
      if (heroImage.getAttribute("src") !== src) heroImage.src = src;
      heroImage.alt = product.name;
    }
    return;
  }

  if (holder || !heroImage?.isConnected) return;
  heroImage.replaceWith(createPhotoMissing());
  refreshIcons();
}

function renderCategories() {
  const categories = ["Semua", ...new Set(state.menu.map((item) => item.category).filter(Boolean))];
  if (!categories.includes(state.category)) state.category = "Semua";
  elements.categoryTabs.innerHTML = categories
    .map(
      (category) => `
        <button class="category-tab ${state.category === category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}" role="tab" aria-selected="${state.category === category}">
          ${escapeHtml(category)}
        </button>`,
    )
    .join("");
}

function featuredCard(item, index) {
  const number = `0${index + 1}`;
  const visualLabel = ["Lihat", item.name, item.badge, number].filter(Boolean).join(", ");
  return `
    <article class="featured-card">
      <div class="featured-visual" data-view-product="${escapeHtml(item.id)}" tabindex="0" role="button" aria-label="${escapeHtml(visualLabel)}">
        ${imageThumb(item.image, item.name)}
        ${item.badge ? `<span class="menu-badge">${escapeHtml(item.badge)}</span>` : ""}
        <span class="featured-number">${number}</span>
      </div>
      <div class="featured-info">
        <div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p></div>
        <button class="add-round" type="button" data-add-product="${escapeHtml(item.id)}" aria-label="Tambah ${escapeHtml(item.name)}"><i data-lucide="plus"></i></button>
      </div>
    </article>`;
}

function renderFeatured() {
  let featured = state.menu.filter((item) => item.featured && item.available);
  if (featured.length < 3) {
    featured = [...new Map([...featured, ...state.menu.filter((item) => item.available)].map((item) => [item.id, item])).values()];
  }
  elements.featuredGrid.innerHTML = featured.slice(0, 3).map(featuredCard).join("");
}

function menuCard(item) {
  const visualLabel = ["Lihat", item.name, item.badge, !item.available ? "Stok habis" : ""].filter(Boolean).join(", ");
  return `
    <article class="menu-card">
      <div class="menu-card-visual" data-view-product="${escapeHtml(item.id)}" tabindex="0" role="button" aria-label="${escapeHtml(visualLabel)}">
        ${imageThumb(item.image, item.name)}
        ${item.badge ? `<span class="menu-badge">${escapeHtml(item.badge)}</span>` : ""}
        ${!item.available ? '<span class="menu-card-unavailable">Stok habis</span>' : ""}
      </div>
      <div class="menu-card-info">
        <span class="menu-card-category">${escapeHtml(item.category)}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <button class="add-round" type="button" data-add-product="${escapeHtml(item.id)}" aria-label="Tambah ${escapeHtml(item.name)}" ${!item.available ? "disabled" : ""}><i data-lucide="plus"></i></button>
      </div>
    </article>`;
}

function renderMenu() {
  const query = state.search.trim().toLocaleLowerCase("id-ID");
  const filtered = state.menu.filter((item) => {
    const inCategory = state.category === "Semua" || item.category === state.category;
    const searchable = `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase("id-ID");
    return inCategory && (!query || searchable.includes(query));
  });

  elements.menuGrid.innerHTML = filtered.map(menuCard).join("");
  elements.emptySearch.hidden = filtered.length > 0;
  elements.menuGrid.hidden = filtered.length === 0;
  refreshIcons();
}

function renderCatalog() {
  renderCategories();
  renderFeatured();
  renderMenu();
  refreshIcons();
}

// Badge keranjang: angka di dalamnya dipusatkan secara optis oleh
// optical-center.js, yang menggeser teks supaya massa tintanya jatuh di
// titik tengah lingkaran - bukan sekadar advance box-nya.
function centerCartBadge() {
  pusatkanTinta(elements.cartCount);
}

function renderCart() {
  const count = getCartCount();
  const subtotal = getCartSubtotal();
  elements.cartCount.textContent = count;
  centerCartBadge();
  elements.openCart.setAttribute("aria-label", `Keranjang ${count} item, buka`);
  elements.drawerCount.textContent = `(${count} item)`;
  elements.cartSubtotal.textContent = formatCurrency(subtotal);
  elements.mobileCartCount.textContent = `${count} item`;
  elements.mobileCartTotal.textContent = formatCurrency(subtotal);
  elements.mobileCartBar.hidden = count === 0;
  elements.cartFooter.hidden = count === 0;

  if (count === 0) {
    elements.cartContent.innerHTML = `
      <div class="empty-cart">
        <span><i data-lucide="shopping-bag"></i></span>
        <h3>Keranjang masih kosong</h3>
        <p>Temukan teman ngopi hari ini dan tambahkan ke keranjang.</p>
      </div>`;
    refreshIcons();
    return;
  }

  elements.cartContent.innerHTML = state.cart
    .map((item) => {
      const product = state.menu.find((menuItem) => menuItem.id === item.id);
      if (!product) return "";
      return `
        <article class="cart-item">
          ${imageThumb(product.image, product.name, false)}
          <div class="cart-item-info">
            <strong>${escapeHtml(product.name)}</strong>
            <span>${formatCurrency(product.price)}</span>
            <div class="quantity-control">
              <button type="button" data-cart-action="decrease" data-product-id="${escapeHtml(item.id)}" aria-label="Kurangi jumlah"><i data-lucide="minus"></i></button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-action="increase" data-product-id="${escapeHtml(item.id)}" aria-label="Tambah jumlah"><i data-lucide="plus"></i></button>
            </div>
          </div>
          <button type="button" data-cart-action="remove" data-product-id="${escapeHtml(item.id)}" aria-label="Hapus ${escapeHtml(product.name)}"><i data-lucide="trash-2"></i></button>
        </article>`;
    })
    .join("");
  refreshIcons();
}

function openCart() {
  elements.cartDrawer.classList.add("open");
  elements.cartBackdrop.classList.add("open");
  elements.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
}

function closeCart() {
  elements.cartDrawer.classList.remove("open");
  elements.cartBackdrop.classList.remove("open");
  elements.cartDrawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
}

function addToCart(id) {
  const product = state.menu.find((item) => item.id === id);
  if (!product || !product.available) {
    showToast("Menu ini sedang tidak tersedia.");
    return;
  }
  const existing = state.cart.find((item) => item.id === id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
  saveCart(state.cart);
  renderCart();
  showToast(`${product.name} ditambahkan ke keranjang.`);
}

function changeCart(id, action) {
  const item = state.cart.find((cartItem) => cartItem.id === id);
  if (!item) return;
  if (action === "increase") item.quantity += 1;
  if (action === "decrease") item.quantity -= 1;
  if (action === "remove" || item.quantity <= 0) state.cart = state.cart.filter((cartItem) => cartItem.id !== id);
  saveCart(state.cart);
  renderCart();
}

function openProduct(id) {
  const product = state.menu.find((item) => item.id === id);
  if (!product) return;
  state.selectedProduct = product;
  elements.productDetail.innerHTML = `
    <div class="product-detail">
      <div class="product-detail-visual">${imageThumb(product.image, product.name, false)}</div>
      <div class="product-detail-info">
        <span class="kicker">${escapeHtml(product.category)}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.description)}</p>
        <span class="detail-price">${formatCurrency(product.price)}</span>
        <span class="detail-note"><i data-lucide="leaf"></i> Diracik setelah kamu memesan</span>
        <button class="btn btn-primary btn-full" type="button" data-add-from-dialog="${escapeHtml(product.id)}" ${!product.available ? "disabled" : ""}>
          <i data-lucide="plus"></i> ${product.available ? "Tambah ke keranjang" : "Stok habis"}
        </button>
      </div>
    </div>`;
  elements.productDialog.showModal();
  refreshIcons();
}

function openCheckout() {
  if (getCartCount() === 0) {
    showToast("Keranjangmu masih kosong.");
    return;
  }
  closeCart();
  elements.checkoutDialog.showModal();
  updateCheckoutTotal();
  window.setTimeout(() => elements.checkoutForm.elements.name.focus(), 80);
}

function updateCheckoutTotal() {
  const type = elements.checkoutForm.querySelector('input[name="orderType"]:checked')?.value;
  const deliveryFee = type === "delivery" ? Number(state.settings.deliveryFee || 0) : 0;
  const subtotal = getCartSubtotal();
  elements.checkoutTotal.textContent = formatCurrency(subtotal + deliveryFee);
  elements.checkoutBreakdown.textContent = `${formatCurrency(subtotal)} untuk ${getCartCount()} item${deliveryFee ? ` + ${formatCurrency(deliveryFee)} ongkir` : " · tanpa ongkir"}`;
  elements.checkoutForm.querySelector(".address-field").hidden = type !== "delivery";
  elements.checkoutForm.elements.address.required = type === "delivery";
}

function submitOrder(event) {
  event.preventDefault();
  if (!elements.checkoutForm.reportValidity() || getCartCount() === 0) return;
  const form = new FormData(elements.checkoutForm);
  const type = form.get("orderType");
  const order = createOrder(
    {
      name: form.get("name"),
      phone: form.get("phone"),
      address: form.get("address") || "",
      note: form.get("note") || "",
      orderType: type,
      paymentMethod: form.get("paymentMethod"),
      deliveryFee: type === "delivery" ? Number(state.settings.deliveryFee || 0) : 0,
      items: state.cart,
    },
    state.menu,
  );

  state.lastOrder = order;
  state.cart = [];
  saveCart(state.cart);
  renderCart();
  elements.checkoutDialog.close();
  elements.checkoutForm.reset();
  elements.successCode.textContent = order.code;
  elements.successDialog.showModal();
}

function sendWhatsApp() {
  const order = state.lastOrder;
  if (!order) return;
  const lines = [
    `Halo ${state.settings.name}, saya ingin konfirmasi pesanan ${order.code}.`,
    "",
    ...order.items.map((item) => `• ${item.name} ×${item.quantity} — ${formatCurrency(item.price * item.quantity)}`),
    "",
    `Total: ${formatCurrency(order.total)}`,
    `Pengambilan: ${order.orderType === "delivery" ? "Antar" : "Ambil di kedai"}`,
    `Nama: ${order.customer.name}`,
  ];
  const url = `https://wa.me/${state.settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function handleCatalogClick(event) {
  const addButton = event.target.closest("[data-add-product]");
  if (addButton) {
    event.stopPropagation();
    addToCart(addButton.dataset.addProduct);
    return;
  }
  const productTarget = event.target.closest("[data-view-product]");
  if (productTarget) openProduct(productTarget.dataset.viewProduct);
}

function initialize() {
  // Harus dipasang sebelum render: gambar yang gagal bisa memunculkan event
  // "error" di task yang sama dengan pen_settingan src.
  document.addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLImageElement) replaceBrokenPhoto(event.target);
    },
    true,
  );

  state.menu = getMenu();
  state.settings = getSettings();
  state.cart = getCart();
  applySettings();
  renderCatalog();
  renderCart();
  // Gambar dari HTML awal sudah mulai dimuat sebelum module ini jalan, jadi
  // ada yang gagal tanpa event: cek ulang lewat naturalWidth.
  repairBrokenPhotos();

  // Font dimuat dengan display=swap, jadi bisa saja penggeseran pertama
  // dipakai saat metrik font cadangan masih yang aktif. Hitung ulang setelah
  // font asli siap, dan tiap resize: breakpoint 560px menukar ukuran font
  // badge dari 11px ke 8px, jadi tabel optisnya berbeda.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(centerCartBadge);
  }
  window.addEventListener("resize", centerCartBadge);

  document.addEventListener("click", handleCatalogClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("[data-view-product]")) {
      openProduct(event.target.dataset.viewProduct);
    }
  });

  elements.categoryTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderCategories();
    renderMenu();
  });

  elements.menuSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderMenu();
  });

  document.querySelector("#openCart").addEventListener("click", openCart);
  document.querySelector("#closeCart").addEventListener("click", closeCart);
  elements.cartBackdrop.addEventListener("click", closeCart);
  document.querySelector("#checkoutButton").addEventListener("click", openCheckout);
  document.querySelector("#mobileCheckout").addEventListener("click", openCart);

  elements.cartContent.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart-action]");
    if (button) changeCart(button.dataset.productId, button.dataset.cartAction);
  });

  elements.productDetail.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-from-dialog]");
    if (!button) return;
    addToCart(button.dataset.addFromDialog);
    elements.productDialog.close();
  });

  elements.checkoutForm.addEventListener("change", (event) => {
    if (event.target.name === "orderType") updateCheckoutTotal();
  });
  elements.checkoutForm.addEventListener("submit", submitOrder);
  document.querySelector("#whatsappOrder").addEventListener("click", sendWhatsApp);

  document.querySelectorAll("[data-close-product]").forEach((button) =>
    button.addEventListener("click", () => elements.productDialog.close()),
  );
  document.querySelectorAll("[data-close-checkout]").forEach((button) =>
    button.addEventListener("click", () => elements.checkoutDialog.close()),
  );
  document.querySelectorAll("[data-close-success]").forEach((button) =>
    button.addEventListener("click", () => elements.successDialog.close()),
  );

  const menuToggle = document.querySelector("#menuToggle");
  const mobileNav = document.querySelector("#mobileNav");
  menuToggle.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.innerHTML = `<i data-lucide="${isOpen ? "x" : "menu"}"></i>`;
    refreshIcons();
  });
  mobileNav.addEventListener("click", () => {
    mobileNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.innerHTML = '<i data-lucide="menu"></i>';
    refreshIcons();
  });

  const header = document.querySelector("#siteHeader");
  const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 20);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 },
  );
  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  document.querySelector("#newsletterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    showToast("Terima kasih! Catatan kami akan segera datang.");
  });

  document.querySelector("#currentYear").textContent = new Date().getFullYear();

  // Menyelaraskan tombol + meta theme-color dengan tema yang sudah dipasang
  // script <head> (bisa saja "dark" dari prefers-color-scheme).
  applyTheme(activeTheme());
  elements.themeToggle.addEventListener("click", toggleTheme);

  // Kalau belum pernah memilih manual, ikuti perubahan setelan sistem.
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    if (getTheme()) return;
    applyTheme(event.matches ? "dark" : "light");
  });

  window.addEventListener("senja:changed", (event) => {
    if (![event.detail?.key, "all"].some((key) => ["senja.menu.v1", "senja.settings.v1", "all"].includes(key))) return;
    state.menu = getMenu();
    state.settings = getSettings();
    applySettings();
    renderCatalog();
    renderCart();
  });

  window.addEventListener("load", refreshIcons);
}

initialize();
