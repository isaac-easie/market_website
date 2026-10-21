import { formatUGX, getCart, getCartItems, getCartTotals, removeCartItem, updateCartItem, loadCatalog, escapeHtml } from "./store-data.js";

const cartContent = document.querySelector("#cart-content");
const toast = document.querySelector("#toast");
let products = [];

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

function renderCart() {
  const items = getCartItems(products);
  const totals = getCartTotals(products);
  const cart = getCart();

  if (cart.length && !items.length) {
    cartContent.innerHTML = `
      <section class="panel empty-panel">
        <p class="eyebrow">YOUR BAG</p>
        <h2>Some bag items are no longer available.</h2>
        <p>Remove unavailable items or return to the catalogue.</p>
        <button class="secondary-button" id="clear-unavailable" type="button">Clear bag</button>
      </section>
    `;
    document.querySelector("#clear-unavailable").addEventListener("click", () => {
      localStorage.removeItem("isax-cart");
      renderCart();
    });
    updateBagCount();
    return;
  }

  if (!items.length) {
    cartContent.innerHTML = `
      <section class="panel empty-panel">
        <p class="eyebrow">YOUR BAG</p>
        <h2>Your shopping bag is empty.</h2>
        <a class="primary-button" href="./products.html">Browse products</a>
      </section>
    `;
    updateBagCount();
    return;
  }

  cartContent.innerHTML = `
    <div class="cart-layout">
      <section class="panel cart-panel">
        <div class="cart-items">
          ${items.map((item) => `
            <article class="cart-item">
              <div class="cart-thumb product-image" role="img" aria-label="${escapeHtml(item.product.name)}">
                ${item.product.image ? `<img src="${escapeHtml(item.product.image)}" alt="${escapeHtml(item.product.name)}">` : "<span>Product photo<br>not supplied</span>"}
              </div>
              <div class="cart-info">
                <div class="cart-row">
                  <div><h3>${escapeHtml(item.product.name)}</h3><p>${escapeHtml(item.product.category)}</p></div>
                  <button class="text-button remove-item" type="button" data-product-id="${escapeHtml(item.productId)}">Remove</button>
                </div>
                <div class="cart-row cart-controls">
                  <label class="quantity-picker compact">
                    <span>Qty</span>
                    <input type="number" min="1" max="${Math.min(20, Math.max(1, item.product.stock))}" value="${item.quantity}" data-quantity-id="${escapeHtml(item.productId)}">
                  </label>
                  <strong>${formatUGX(item.product.price * item.quantity)}</strong>
                </div>
                ${item.quantity > item.product.stock ? '<p class="form-message is-error">Quantity exceeds currently listed stock. Reduce it before checkout.</p>' : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <aside class="panel summary-panel">
        <p class="eyebrow">ESTIMATE ONLY</p>
        <div class="summary-row"><span>Subtotal</span><strong>${formatUGX(totals.subtotal)}</strong></div>
        <p class="checkout-note">The final price and availability are validated by the server at checkout.</p>
        <a class="primary-button full-width" href="./checkout.html">Proceed to checkout</a>
      </aside>
    </div>
  `;

  cartContent.querySelectorAll(".remove-item").forEach((button) => {
    button.addEventListener("click", () => {
      removeCartItem(button.dataset.productId);
      renderCart();
      showToast("Item removed.");
    });
  });
  cartContent.querySelectorAll("[data-quantity-id]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const productId = event.target.dataset.quantityId;
      const product = products.find((entry) => entry.id === productId);
      const quantity = Math.max(1, Math.min(20, Number(event.target.value || 1), product?.stock || 1));
      updateCartItem(productId, quantity);
      renderCart();
    });
  });
  updateBagCount();
}

async function initialize() {
  document.querySelector("#current-year").textContent = new Date().getFullYear();
  try {
    const result = await loadCatalog();
    products = result.products;
    renderCart();
  } catch (error) {
    console.error("Cart catalogue load failed:", error);
    cartContent.textContent = "Your bag could not be loaded because the catalogue is unavailable.";
  }
}

initialize();
