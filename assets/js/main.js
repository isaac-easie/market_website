import { formatUGX, filterProducts, addToCart, loadCatalog, escapeHtml } from "./store-data.js";

const productGrid = document.querySelector("#product-grid");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#product-search");
const sortSelect = document.querySelector("#product-sort");
const resultMessage = document.querySelector("#results-message");
const emptyState = document.querySelector("#empty-state");
const toast = document.querySelector("#toast");
const categoryButtons = [...document.querySelectorAll(".category-filter")];
let activeCategory = "All";
let toastTimer;
let catalog = [];

function updateBagCount() {
  const bagCountNodes = document.querySelectorAll(".bag-count");
  const items = JSON.parse(window.localStorage.getItem("isax-cart") || "[]");
  const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  bagCountNodes.forEach((node) => {
    node.textContent = String(count);
    node.setAttribute("aria-label", `${count} items`);
  });
}

function renderProducts() {
  const products = filterProducts(catalog, {
    query: searchInput.value,
    category: activeCategory,
    sort: sortSelect.value
  });

  productGrid.innerHTML = products.map((product) => `
    <article class="product-card">
      <a href="./product.html?id=${encodeURIComponent(product.id)}" class="product-media-link" aria-label="View ${escapeHtml(product.name)}">
        <div class="product-image" role="img" aria-label="Product photo not supplied for ${escapeHtml(product.name)}">
          ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">` : "<span>Product photo<br>not supplied</span>"}
        </div>
      </a>
      <div class="product-details">
        <div class="product-category"><span>${escapeHtml(product.category)}</span><span class="sample-label">Sample listing</span></div>
        <h3><a href="./product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
        <p class="product-description">${escapeHtml(product.description)}</p>
        <p class="product-price">${formatUGX(product.price)} <span>sample price</span></p>
        <div class="product-actions">
          <a class="secondary-button" href="./product.html?id=${encodeURIComponent(product.id)}">View</a>
          <button class="primary-button" type="button" data-add-to-cart="${product.id}">Add to bag</button>
        </div>
      </div>
    </article>`).join("");

  resultMessage.textContent = `Showing ${products.length} ${products.length === 1 ? "item" : "items"}`;
  emptyState.hidden = products.length > 0;
  productGrid.hidden = products.length === 0;
  updateBagCount();

  for (const button of productGrid.querySelectorAll("[data-add-to-cart]")) {
    button.addEventListener("click", () => {
      addToCart(button.dataset.addToCart, 1);
      showToast("Added to bag.");
    });
  }
}

function selectCategory(category) {
  activeCategory = category;
  for (const button of categoryButtons) {
    const isActive = button.dataset.category === category;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
  renderProducts();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

for (const button of categoryButtons) {
  button.addEventListener("click", () => selectCategory(button.dataset.category));
}

searchInput.addEventListener("input", renderProducts);
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#collection").scrollIntoView({ behavior: "smooth" });
});
sortSelect.addEventListener("change", renderProducts);
document.querySelector(".reset-filters").addEventListener("click", () => {
  searchInput.value = "";
  sortSelect.value = "featured";
  selectCategory("All");
  searchInput.focus();
});

const themeToggle = document.querySelector(".theme-toggle");
themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-theme");
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
  try {
    localStorage.setItem("isax-theme", isDark ? "dark" : "light");
  } catch {
    showToast("Theme changed for this visit only.");
  }
});

try {
  if (localStorage.getItem("isax-theme") === "dark") {
    document.body.classList.add("dark-theme");
    themeToggle.setAttribute("aria-label", "Switch to light theme");
  }
} catch {
  // The theme toggle remains available for this visit when storage is unavailable.
}

const navigation = document.querySelector(".main-nav");
const menuToggle = document.querySelector(".menu-toggle");

function closeMenu() {
  navigation.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
}

menuToggle.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

const assistantPanel = document.querySelector("#assistant-panel");
const assistantToggle = document.querySelector(".assistant-toggle");
const assistantClose = document.querySelector(".assistant-close");

function setAssistantOpen(isOpen) {
  assistantPanel.hidden = !isOpen;
  assistantToggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) assistantClose.focus();
  else assistantToggle.focus();
}

assistantToggle.addEventListener("click", () => setAssistantOpen(assistantPanel.hidden));
assistantClose.addEventListener("click", () => setAssistantOpen(false));
import("./gemini-assistant.js").catch((error) => {
  console.error("Shopping assistant failed to initialize:", error);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
    if (!assistantPanel.hidden) setAssistantOpen(false);
  }
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
updateBagCount();
loadCatalog().then(({ products }) => {
  catalog = products;
  renderProducts();
}).catch((error) => {
  console.error("Catalogue load failed:", error);
  resultMessage.textContent = "The catalogue could not be loaded. Please try again later.";
  productGrid.hidden = true;
  emptyState.hidden = false;
  emptyState.querySelector("h3").textContent = "Catalogue unavailable";
  emptyState.querySelector("p").textContent = "We could not load products right now.";
});
