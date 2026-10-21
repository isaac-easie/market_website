import { formatUGX, loadProductById, addToCart, getCart, escapeHtml } from "./store-data.js";

const detailContainer = document.querySelector("#product-detail");
const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function updateBagCount() {
  const items = getCart();
  const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  document.querySelectorAll(".bag-count").forEach((node) => {
    node.textContent = String(count);
    node.setAttribute("aria-label", `${count} items`);
  });
}

function renderProduct(product, isSample) {
  if (!product) {
    detailContainer.innerHTML = `
      <section class="panel empty-panel">
        <p class="eyebrow">PRODUCT NOT FOUND</p>
        <h1>We could not find that item.</h1>
        <a class="primary-button" href="./products.html">Back to catalog</a>
      </section>
    `;
    return;
  }

  detailContainer.innerHTML = `
    <section class="product-detail-layout">
      <div class="product-visual">
        <div class="product-image large" role="img" aria-label="${escapeHtml(product.name)}">
          ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">` : "<span>Product photo<br>not supplied</span>"}
        </div>
      </div>
      <div class="product-summary panel">
        <p class="eyebrow">${escapeHtml(product.category)}${isSample ? " · SAMPLE LISTING" : ""}</p>
        <h1>${escapeHtml(product.name)}</h1>
        <div class="detail-price-row">
          <span class="detail-price">${formatUGX(product.price)}</span>
          <span class="stock-badge">${isSample ? "Sample stock" : product.stock > 0 ? `${product.stock} available` : "Out of stock"}</span>
        </div>
        <p class="product-description">${escapeHtml(product.description)}</p>
        <div class="detail-meta">
          ${product.sku ? `<span>SKU: ${escapeHtml(product.sku)}</span>` : ""}
          <span>Condition: ${escapeHtml(product.condition)}</span>
        </div>
        <div class="detail-actions">
          <label class="quantity-picker">
            <span>Qty</span>
            <input id="quantity-input" type="number" min="1" max="${isSample ? 20 : Math.max(1, product.stock)}" value="1" ${!isSample && product.stock < 1 ? "disabled" : ""}>
          </label>
          <button class="primary-button" id="add-to-cart" type="button" ${!isSample && product.stock < 1 ? "disabled" : ""}>Add to bag</button>
        </div>
        ${isSample ? '<p class="sample-warning">Sample catalogue item. Checkout validates against the live store catalogue.</p>' : ""}
        <div class="detail-links">
          <a class="secondary-button" href="./products.html">Continue shopping</a>
          <a class="secondary-button" href="./checkout.html">Checkout</a>
        </div>
      </div>
    </section>
  `;

  document.querySelector("#add-to-cart").addEventListener("click", () => {
    const quantityInput = document.querySelector("#quantity-input");
    const quantity = Math.max(1, Math.min(Number(quantityInput.value || 1), Number(quantityInput.max)));
    addToCart(product.id, quantity);
    updateBagCount();
    showToast(`${quantity} item${quantity > 1 ? "s" : ""} added.`);
  });
}

async function initialize() {
  document.querySelector("#current-year").textContent = new Date().getFullYear();
  const productId = new URLSearchParams(window.location.search).get("id");
  try {
    const result = await loadProductById(productId);
    renderProduct(result.product, result.isSample);
  } catch (error) {
    console.error("Product load failed:", error);
    detailContainer.textContent = "This product could not be loaded right now.";
  }
  updateBagCount();
}

initialize();
