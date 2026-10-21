export const sampleProducts = [
  {
    id: "air-sense-14",
    name: "AirSense 14 Laptop",
    category: "Tech",
    price: 1420000,
    description: "A lightweight laptop built for everyday work, study, and remote meetings.",
    featured: 1,
    stock: 12,
    sku: "AS-14-001",
    condition: "New",
    image: ""
  },
  {
    id: "solar-bloom-lamp",
    name: "Solar Bloom Lamp",
    category: "Home",
    price: 240000,
    description: "An energy-saving desk lamp with warm ambience and easy USB charging.",
    featured: 2,
    stock: 18,
    sku: "SB-001",
    condition: "New",
    image: ""
  },
  {
    id: "riverline-bottle",
    name: "Riverline Bottle",
    category: "Style",
    price: 98000,
    description: "Double-wall insulated bottle designed for commuting and long days out.",
    featured: 3,
    stock: 26,
    sku: "RL-204",
    condition: "New",
    image: ""
  },
  {
    id: "harvest-audio-bar",
    name: "Harvest Audio Bar",
    category: "Tech",
    price: 610000,
    description: "Compact audio bar for clearer calls, music playback, and small-room sound.",
    featured: 4,
    stock: 8,
    sku: "HA-312",
    condition: "New",
    image: ""
  },
  {
    id: "terra-throw-blanket",
    name: "Terra Throw Blanket",
    category: "Home",
    price: 180000,
    description: "A soft woven blanket for evenings, guest rooms, and weekend comfort.",
    featured: 5,
    stock: 14,
    sku: "TT-113",
    condition: "New",
    image: ""
  },
  {
    id: "stride-urban-bag",
    name: "Stride Urban Bag",
    category: "Style",
    price: 260000,
    description: "Structured day bag with laptop sleeve and weather-ready exterior details.",
    featured: 6,
    stock: 7,
    sku: "SU-117",
    condition: "New",
    image: ""
  }
];

export function formatUGX(value) {
  return `UGX ${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

export function getProductById(productId) {
  return sampleProducts.find((product) => product.id === productId) || null;
}

export async function loadCatalog() {
  const { hasFirebaseConfig } = await import("./firebase-config.js");
  if (!hasFirebaseConfig()) return { products: sampleProducts, isSample: true };

  const { getFirebase } = await import("./firebase-client.js");
  const firebase = await getFirebase();
  const { collection, getDocs, query, where } = firebase.firestoreSdk;
  const snapshot = await getDocs(query(
    collection(firebase.db, "products"),
    where("isActive", "==", true)
  ));
  const products = snapshot.docs.map((productDoc) => {
    const product = productDoc.data();
    const normalized = {
      id: productDoc.id,
      name: String(product.name || ""),
      category: String(product.category || ""),
      price: Number(product.priceUgx),
      description: String(product.description || ""),
      featured: product.featured === true ? 0 : 1,
      stock: Number(product.stock),
      sku: String(product.sku || ""),
      condition: String(product.condition || "New"),
      image: String(product.imageUrl || "")
    };
    if (!normalized.name
        || !normalized.category
        || !normalized.description
        || !Number.isSafeInteger(normalized.price)
        || normalized.price < 0
        || !Number.isSafeInteger(normalized.stock)
        || normalized.stock < 0) {
      throw new Error(`Product ${productDoc.id} has invalid catalogue fields.`);
    }
    if (normalized.image) {
      try {
        if (new URL(normalized.image).protocol !== "https:") normalized.image = "";
      } catch {
        normalized.image = "";
      }
    }
    return normalized;
  });

  return { products, isSample: false };
}

export async function loadProductById(productId) {
  const { products, isSample } = await loadCatalog();
  return {
    product: products.find((product) => product.id === productId) || null,
    isSample
  };
}

export function getVisibleProducts({ query = "", category = "All", sort = "featured" } = {}) {
  return filterProducts(sampleProducts, { query, category, sort });
}

export function filterProducts(products, { query = "", category = "All", sort = "featured" } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return products
    .filter((product) => category === "All" || product.category === category)
    .filter((product) => {
      if (!normalizedQuery) return true;
      const haystack = `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .sort((first, second) => {
      if (sort === "price-low") return first.price - second.price;
      if (sort === "price-high") return second.price - first.price;
      if (sort === "name") return first.name.localeCompare(second.name);
      return first.featured - second.featured;
    });
}

export function getCategories(products) {
  return [...new Set(products.map((product) => product.category).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));
}

export function getCart() {
  try {
    const raw = window.localStorage.getItem("isax-cart");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item
      && typeof item.productId === "string"
      && /^[a-zA-Z0-9_-]{1,100}$/.test(item.productId)
      && Number.isSafeInteger(item.quantity)
      && item.quantity > 0
      && item.quantity <= 20
    );
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  try {
    window.localStorage.setItem("isax-cart", JSON.stringify(cart));
  } catch {
    // Ignore storage errors in restricted browser modes.
  }
}

export function addToCart(productId, quantity = 1) {
  if (typeof productId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(productId)) return getCart();
  const cart = getCart();
  const nextQuantity = Math.max(1, Math.min(20, Number(quantity) || 1));
  const existingIndex = cart.findIndex((item) => item.productId === productId);

  if (existingIndex >= 0) {
    cart[existingIndex].quantity = Math.min(20, cart[existingIndex].quantity + nextQuantity);
  } else {
    cart.push({ productId, quantity: nextQuantity });
  }

  saveCart(cart);
  return cart;
}

export function updateCartItem(productId, quantity) {
  if (typeof productId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(productId)) return getCart();
  const cart = getCart();
  const nextQuantity = Math.max(0, Math.min(20, Number(quantity) || 0));
  const filtered = cart
    .map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item))
    .filter((item) => item.quantity > 0);

  saveCart(filtered);
  return filtered;
}

export function removeCartItem(productId) {
  if (typeof productId !== "string") return getCart();
  const filtered = getCart().filter((item) => item.productId !== productId);
  saveCart(filtered);
  return filtered;
}

export function getCartItems(products = sampleProducts) {
  return getCart().map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);
}

export function getCartTotals(products = sampleProducts) {
  const items = getCartItems(products);
  const subtotal = items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const deliveryFee = subtotal > 0 ? 20000 : 0;
  const total = subtotal + deliveryFee;
  return { subtotal, deliveryFee, total, itemCount: items.reduce((count, item) => count + item.quantity, 0) };
}
