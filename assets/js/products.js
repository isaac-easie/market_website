import { formatUGX, filterProducts, addToCart, loadCatalog, escapeHtml, getCategories } from "./store-data.js";

const productGrid = document.querySelector("#product-grid");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#product-search");
const sortSelect = document.querySelector("#product-sort");
const resultMessage = document.querySelector("#results-message");
const emptyState = document.querySelector("#empty-state");
let categoryButtons = [...document.querySelectorAll(".category-filter")];
const toast = document.querySelector("#toast");
let activeCategory = "All";
let toastTimer;
let catalog = [];
let isSample = true;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
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
        <div class="product-category"><span>${escapeHtml(product.category)}</span><span class="sample-label">${isSample ? "Sample listing" : product.stock > 0 ? "In stock" : "Out of stock"}</span></div>
        <h3><a href="./product.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
        <p class="product-description">${escapeHtml(product.description)}</p>
        <p class="product-price">${formatUGX(product.price)} <span>${isSample ? "sample price" : `${product.stock} available`}</span></p>
        <div class="product-actions">
          <a class="secondary-button" href="./product.html?id=${encodeURIComponent(product.id)}">View</a>
          <button class="primary-button" type="button" data-add-to-cart="${product.id}">Add to bag</button>
        </div>
      </div>
    </article>
  `).join("");

  resultMessage.textContent = `Showing ${products.length} ${products.length === 1 ? "item" : "items"}`;
  emptyState.hidden = products.length > 0;
  productGrid.hidden = products.length === 0;

  for (const button of productGrid.querySelectorAll("[data-add-to-cart]")) {
    button.addEventListener("click", () => {
      addToCart(button.dataset.addToCart, 1);
      showToast("Added to bag.");
      updateBagCount();
    });
  }
}

function updateBagCount() {
  const bagCountNodes = document.querySelectorAll(".bag-count");
  let items = [];
  try {
    items = JSON.parse(window.localStorage.getItem("isax-cart") || "[]");
  } catch {
    items = [];
  }
  const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  bagCountNodes.forEach((node) => {
    node.textContent = String(count);
    node.setAttribute("aria-label", `${count} items`);
  });
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

function renderCategoryButtons() {
  const container = document.querySelector(".category-filters");
  const categories = getCategories(catalog);
  container.replaceChildren();
  const allButton = document.createElement("button");
  allButton.className = "category-filter is-active";
  allButton.type = "button";
  allButton.dataset.category = "All";
  allButton.setAttribute("aria-pressed", "true");
  allButton.append("All items ");
  const count = document.createElement("span");
  count.className = "all-count";
  count.textContent = String(catalog.length).padStart(2, "0");
  allButton.append(count);
  container.append(allButton);

  for (const category of categories) {
    const button = document.createElement("button");
    button.className = "category-filter";
    button.type = "button";
    button.dataset.category = category;
    button.setAttribute("aria-pressed", "false");
    button.textContent = category;
    container.append(button);
  }
  categoryButtons = [...container.querySelectorAll(".category-filter")];
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => selectCategory(button.dataset.category));
  });
}

searchInput.addEventListener("input", renderProducts);
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  productGrid.scrollIntoView({ behavior: "smooth", block: "start" });
});
sortSelect.addEventListener("change", renderProducts);
document.querySelector(".reset-filters").addEventListener("click", () => {
  searchInput.value = "";
  sortSelect.value = "featured";
  selectCategory("All");
  searchInput.focus();
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
updateBagCount();
loadCatalog().then((result) => {
  catalog = result.products;
  isSample = result.isSample;
  if (!isSample) {
    searchInput.placeholder = "Search products";
    document.querySelector('label[for="product-search"]').textContent = "Search products";
    document.querySelector(".category-filters").setAttribute("aria-label", "Filter products by category");
    emptyState.querySelector("h3").textContent = "No products match";
  }
  renderCategoryButtons();
  renderProducts();
}).catch((error) => {
  console.error("Catalogue load failed:", error);
  resultMessage.textContent = "The catalogue could not be loaded. Please try again later.";
  productGrid.hidden = true;
  emptyState.hidden = false;
  emptyState.querySelector("h3").textContent = "Catalogue unavailable";
  emptyState.querySelector("p").textContent = "We could not load products right now.";
});
