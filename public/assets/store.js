const KEYS = {
  menu: "senja.menu.v1",
  orders: "senja.orders.v1",
  settings: "senja.settings.v1",
  cart: "senja.cart.v1",
  theme: "senja.theme.v1",
};

export const DEFAULT_MENU = [
  {
    id: "kopi-susu-senja",
    name: "Kopi Susu Senja",
    category: "Kopi",
    price: 28000,
    description: "Espresso pilihan, susu segar, dan gula aren yang lembut.",
    image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=900&q=85",
    badge: "Paling diminati",
    featured: true,
    available: true,
  },
  {
    id: "cappuccino-classic",
    name: "Cappuccino Classic",
    category: "Kopi",
    price: 30000,
    description: "Tiga lapisan sempurna: espresso, susu, dan busa yang lembut.",
    image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=900&q=85",
    badge: "",
    featured: true,
    available: true,
  },
  {
    id: "cold-brew-orange",
    name: "Cold Brew Senja",
    category: "Kopi",
    price: 32000,
    description: "Cold brew 18 jam, disiram jeruk segar dan sedikit sirup gula aren.",
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=85",
    badge: "Segar",
    featured: true,
    available: true,
  },
  {
    id: "matcha-cloud",
    name: "Matcha Cloud",
    category: "Non Kopi",
    price: 30000,
    description: "Matcha premium, susu oat, dan foam vanilla yang lembut.",
    image: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=900&q=85",
    badge: "Baru",
    featured: false,
    available: true,
  },
  {
    id: "chocolate-kopi",
    name: "Dark Chocolate Latte",
    category: "Non Kopi",
    price: 33000,
    description: "Cokelat Belgia pekat berpadu dengan aroma kopi yang hangat.",
    image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?auto=format&fit=crop&w=900&q=85",
    badge: "",
    featured: false,
    available: true,
  },
  {
    id: "butter-croissant",
    name: "Butter Croissant",
    category: "Makanan",
    price: 24000,
    description: "Croissant berlapis dengan mentega churn pilihan, hangat dan renyah.",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=85",
    badge: "",
    featured: false,
    available: true,
  },
  {
    id: "nasi-goreng",
    name: "Nasi Goreng Senja",
    category: "Makanan",
    price: 32000,
    description: "Nasi goreng smoky dengan ayam, telur, dan kerupuk renyah.",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=85",
    badge: "",
    featured: false,
    available: true,
  },
  {
    id: "cookies",
    name: "Brown Butter Cookies",
    category: "Camilan",
    price: 22000,
    description: "Cookie lembut dengan aroma mentega caramel dan cokelat gelap.",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=85",
    badge: "",
    featured: false,
    available: false,
  },
];

export const DEFAULT_SETTINGS = {
  name: "Kopi Senja",
  tagline: "Secangkir hangat, cerita yang ringan.",
  description: "Ruang kopi untuk ngobrol lama, bekerja lebih lambat, dan pulang membawa suasana baik.",
  address: "Jl. Senja No. 18, Jakarta Selatan",
  hours: "Setiap hari · 08.00–22.00",
  phone: "0812-3456-7890",
  whatsapp: "6281234567890",
  email: "halo@kopi-senja.id",
  isOpen: true,
  deliveryFee: 5000,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("senja:changed", { detail: { key } }));
  return value;
}

function uid(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return `${prefix}-${random}`;
}

// Perpindahan teks label demo agar browser yang sudah menyimpan data lama
// ikut memakai istilah terbaru tanpa perlu reset data.
const MENU_TEXT_MIGRATIONS = [
  { id: "kopi-susu-senja", from: "Paling suka", to: "Paling diminati" },
];

function migrateMenu(menu) {
  let changed = false;
  const next = menu.map((item) => {
    const migration = MENU_TEXT_MIGRATIONS.find(
      (rule) => rule.id === item.id && item.badge === rule.from,
    );
    if (!migration) return item;
    changed = true;
    return { ...item, badge: migration.to };
  });
  return changed ? next : menu;
}

export function getMenu() {
  const stored = read(KEYS.menu, DEFAULT_MENU);
  const menu = Array.isArray(stored) ? stored : clone(DEFAULT_MENU);
  const migrated = migrateMenu(menu);
  if (migrated !== menu) write(KEYS.menu, migrated);
  return migrated;
}

export function saveMenu(menu) {
  return write(KEYS.menu, menu);
}

export function addMenuItem(item) {
  const menu = getMenu();
  const newItem = {
    id: uid("menu"),
    ...item,
    price: Number(item.price),
    featured: Boolean(item.featured),
    available: item.available !== false,
  };
  menu.unshift(newItem);
  saveMenu(menu);
  return newItem;
}

export function updateMenuItem(id, patch) {
  const menu = getMenu();
  const index = menu.findIndex((item) => item.id === id);
  if (index < 0) return null;
  menu[index] = { ...menu[index], ...patch, price: Number(patch.price ?? menu[index].price) };
  saveMenu(menu);
  return menu[index];
}

export function deleteMenuItem(id) {
  saveMenu(getMenu().filter((item) => item.id !== id));
}

export function getOrders() {
  const orders = read(KEYS.orders, []);
  return Array.isArray(orders) ? orders : [];
}

export function saveOrders(orders) {
  return write(KEYS.orders, orders);
}

export function createOrder(payload, menuItems) {
  const items = payload.items.map((cartItem) => {
    const product = menuItems.find((item) => item.id === cartItem.id);
    return {
      id: cartItem.id,
      name: product?.name || cartItem.name,
      price: Number(product?.price || cartItem.price),
      quantity: Number(cartItem.quantity),
      image: product?.image || cartItem.image || "",
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = payload.orderType === "delivery" ? Number(payload.deliveryFee || 0) : 0;
  const now = new Date();
  const order = {
    id: uid("order"),
    code: `SEN-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`,
    createdAt: now.toISOString(),
    customer: {
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      note: payload.note?.trim() || "",
      address: payload.orderType === "delivery" ? payload.address.trim() : "",
    },
    orderType: payload.orderType,
    paymentMethod: payload.paymentMethod,
    status: "pending",
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
  saveOrders([order, ...getOrders()]);
  return order;
}

export function updateOrderStatus(id, status) {
  const orders = getOrders();
  const order = orders.find((item) => item.id === id);
  if (!order) return null;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  saveOrders(orders);
  return order;
}

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, DEFAULT_SETTINGS) };
}

export function saveSettings(settings) {
  return write(KEYS.settings, { ...getSettings(), ...settings });
}

export function getCart() {
  const cart = read(KEYS.cart, []);
  return Array.isArray(cart) ? cart : [];
}

// Preferensi tampilan disimpan sebagai string polos (bukan JSON) supaya
// script kecil di <head> bisa membacanya tanpa try/catch berlapis.
export function getTheme() {
  return localStorage.getItem(KEYS.theme) || "";
}

export function saveTheme(theme) {
  localStorage.setItem(KEYS.theme, theme);
  return theme;
}

export function saveCart(cart) {
  return write(KEYS.cart, cart);
}

export function resetAllData() {
  // Preferensi tema sengaja tidak ikut terhapus: reset data demo tidak
  // seharusnya mengubah tampilan yang sudah dipilih pemilik kedai.
  Object.entries(KEYS)
    .filter(([key]) => key !== "theme")
    .forEach(([, key]) => localStorage.removeItem(key));
  window.dispatchEvent(new CustomEvent("senja:changed", { detail: { key: "all" } }));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

window.addEventListener("storage", (event) => {
  if (Object.values(KEYS).includes(event.key)) {
    window.dispatchEvent(new CustomEvent("senja:changed", { detail: { key: event.key } }));
  }
});
