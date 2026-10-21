import { formatUGX, getCart, getCartItems, getCartTotals, saveCart, loadCatalog, escapeHtml } from "./store-data.js";
import { callFunction, getFirebase, getFirebaseErrorMessage } from "./firebase-client.js";

const checkoutContent = document.querySelector("#checkout-content");

function checkoutIdempotencyKey(items) {
  const fingerprint = JSON.stringify([...items]
    .map((item) => ({ productId: item.productId, quantity: item.quantity }))
    .sort((first, second) => first.productId.localeCompare(second.productId)));
  try {
    const stored = JSON.parse(localStorage.getItem("isax-checkout-request") || "null");
    if (stored?.fingerprint === fingerprint && typeof stored.key === "string") return stored.key;
    const key = crypto.randomUUID();
    localStorage.setItem("isax-checkout-request", JSON.stringify({ key, fingerprint }));
    return key;
  } catch {
    return crypto.randomUUID();
  }
}

function updateBagCount() {
  const items = getCart();
  const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  document.querySelectorAll(".bag-count").forEach((node) => {
    node.textContent = String(count);
    node.setAttribute("aria-label", `${count} items`);
  });
}

function renderMessage(title, message, link = "./products.html", linkText = "Continue shopping") {
  checkoutContent.innerHTML = `
    <section class="panel empty-panel">
      <p class="eyebrow">CHECKOUT</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <a class="primary-button" href="${link}">${escapeHtml(linkText)}</a>
    </section>
  `;
}

function renderCheckout(user, settings, products) {
  const totals = getCartTotals(products);
  if (!totals.itemCount) {
    renderMessage("Your cart is empty.", "Add items before continuing.");
    return;
  }
  const paymentMethods = Array.isArray(settings.allowedPaymentMethods)
    ? settings.allowedPaymentMethods.filter((method) => ["cash_on_delivery", "cash_on_collection", "mobile_money"].includes(method))
    : [];
  if (settings.checkoutEnabled !== true || paymentMethods.length === 0) {
    renderMessage("Checkout is not enabled yet.", "The store owner must configure checkout and available payment methods.");
    return;
  }

  const mobileInstructions = typeof settings.mobileMoneyInstructions === "string"
    ? settings.mobileMoneyInstructions
    : "";
  const estimatedDeliveryFee = Number.isSafeInteger(settings.deliveryFeeUgx) ? settings.deliveryFeeUgx : 0;
  const paymentLabels = {
    cash_on_delivery: "Cash on delivery",
    cash_on_collection: "Cash on collection",
    mobile_money: "Mobile money (manual verification)"
  };

  checkoutContent.innerHTML = `
    <div class="checkout-layout">
      <section class="panel form-panel">
        <form id="checkout-form">
          <label>
            <span>Full name</span>
            <input type="text" name="name" maxlength="100" value="${escapeHtml(user.displayName || "")}" required>
          </label>
          <label>
            <span>Email</span>
            <input type="email" value="${escapeHtml(user.email || "")}" readonly>
          </label>
          <label>
            <span>Fulfilment</span>
            <select name="fulfilmentMethod" required>
              <option value="delivery">Delivery</option>
              <option value="collection">Collection</option>
            </select>
          </label>
          <label id="delivery-address-label">
            <span>Delivery address</span>
            <textarea name="address" rows="3" maxlength="500" required></textarea>
          </label>
          <label>
            <span>Payment method</span>
            <select name="paymentMethod" required>
              ${paymentMethods
                .filter((method) => method !== "cash_on_collection")
                .map((method) => `<option value="${method}">${paymentLabels[method]}</option>`).join("")}
            </select>
          </label>
          <p class="checkout-note">The server checks live stock and calculates the final total. Sample prices shown in this browser are not used to create the order.</p>
          <p id="checkout-error" class="form-message" role="alert" hidden></p>
          <button class="primary-button" type="submit">Place order</button>
        </form>
      </section>

      <aside class="panel summary-panel">
        <p class="eyebrow">ESTIMATE ONLY</p>
        ${getCartItems(products).map((item) => `<div class="summary-row"><span>${escapeHtml(item.product.name)} × ${item.quantity}</span><strong>${formatUGX(item.product.price * item.quantity)}</strong></div>`).join("")}
        <div class="summary-row"><span>Estimated delivery</span><strong>${formatUGX(estimatedDeliveryFee)}</strong></div>
        <div class="summary-row total"><span>Estimated total</span><strong>${formatUGX(totals.subtotal + estimatedDeliveryFee)}</strong></div>
      </aside>
    </div>
  `;

  const form = document.querySelector("#checkout-form");
  const fulfilmentSelect = form.elements.fulfilmentMethod;
  const address = form.elements.address;
  const addressLabel = document.querySelector("#delivery-address-label");
  const paymentSelect = form.elements.paymentMethod;
  const updatePaymentOptions = () => {
    const fulfilment = fulfilmentSelect.value;
    const compatible = paymentMethods.filter((method) => {
      if (method === "cash_on_delivery") return fulfilment === "delivery";
      if (method === "cash_on_collection") return fulfilment === "collection";
      return method === "mobile_money";
    });
    const previousValue = paymentSelect.value;
    paymentSelect.innerHTML = compatible.map((method) => `<option value="${method}">${paymentLabels[method]}</option>`).join("");
    if (compatible.includes(previousValue)) paymentSelect.value = previousValue;
    paymentSelect.disabled = compatible.length === 0;
    form.querySelector("[type=submit]").disabled = compatible.length === 0;
    if (compatible.length === 0) {
      document.querySelector("#checkout-error").textContent = "No configured payment method is available for this fulfilment choice.";
      document.querySelector("#checkout-error").hidden = false;
    } else {
      document.querySelector("#checkout-error").hidden = true;
    }
  };
  fulfilmentSelect.addEventListener("change", () => {
    const isDelivery = fulfilmentSelect.value === "delivery";
    address.required = isDelivery;
    addressLabel.querySelector("span").textContent = isDelivery ? "Delivery address" : "Collection notes (optional)";
    updatePaymentOptions();
  });
  updatePaymentOptions();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("[type=submit]");
    const errorMessage = document.querySelector("#checkout-error");
    submitButton.disabled = true;
    errorMessage.hidden = true;
    try {
      const currentItems = getCart();
      if (!currentItems.length) throw new Error("Your cart is empty.");
      const result = await callFunction("createOrder", {
        idempotencyKey: checkoutIdempotencyKey(currentItems),
        name: form.elements.name.value,
        address: form.elements.address.value,
        fulfilmentMethod: form.elements.fulfilmentMethod.value,
        paymentMethod: form.elements.paymentMethod.value,
        items: currentItems
      });
      saveCart([]);
      try {
        localStorage.removeItem("isax-checkout-request");
      } catch {
        // The idempotency key is best-effort persisted; the server still protects retries while it is available.
      }
      updateBagCount();
      renderOrderSuccess(result, paymentSelect.value, mobileInstructions);
    } catch (error) {
      errorMessage.textContent = getFirebaseErrorMessage(error);
      errorMessage.hidden = false;
      submitButton.disabled = false;
    }
  });
}

function renderOrderSuccess(order, paymentMethod, mobileInstructions) {
  checkoutContent.innerHTML = `
    <section class="panel success-panel">
      <p class="eyebrow">ORDER CREATED</p>
      <h2>Thank you. Your order is awaiting store confirmation.</h2>
      <p>Order reference: <strong>${escapeHtml(order.orderId)}</strong></p>
      <p>Order total: <strong>${formatUGX(order.totalUgx)}</strong></p>
      <p>Payment status: <strong>${escapeHtml(order.paymentStatus)}</strong> · Order status: <strong>${escapeHtml(order.orderStatus)}</strong></p>
      ${paymentMethod === "mobile_money" ? `
        ${mobileInstructions ? `<p>${escapeHtml(mobileInstructions)}</p>` : "<p>Payment instructions have not been configured. Contact the store owner before sending money.</p>"}
        <form id="payment-reference-form" class="reference-form">
          <label><span>Transaction reference</span><input name="reference" maxlength="100" required></label>
          <p id="reference-error" class="form-message" role="alert" hidden></p>
          <button class="secondary-button" type="submit">Submit reference for review</button>
        </form>
      ` : ""}
      <a class="primary-button" href="./products.html">Continue shopping</a>
    </section>
  `;

  const referenceForm = document.querySelector("#payment-reference-form");
  if (referenceForm) {
    referenceForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = referenceForm.querySelector("[type=submit]");
      const errorMessage = document.querySelector("#reference-error");
      button.disabled = true;
      try {
        await callFunction("submitManualPaymentReference", {
          orderId: order.orderId,
          reference: referenceForm.elements.reference.value
        });
        referenceForm.innerHTML = "<p>Reference submitted. Payment remains pending until the store owner verifies it.</p>";
      } catch (error) {
        errorMessage.textContent = getFirebaseErrorMessage(error);
        errorMessage.hidden = false;
        button.disabled = false;
      }
    });
  }
}

async function initialize() {
  document.querySelector("#current-year").textContent = new Date().getFullYear();
  updateBagCount();
  try {
    const firebase = await getFirebase();
    await firebase.auth.authStateReady();
    const user = firebase.auth.currentUser;
    if (!user) {
      renderMessage("Sign in to check out.", "Orders are linked to your customer account.", "./login.html?next=checkout.html", "Sign in");
      return;
    }
    const settingsSnapshot = await firebase.firestoreSdk.getDoc(
      firebase.firestoreSdk.doc(firebase.db, "settings", "public")
    );
    const settings = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
    const { products } = await loadCatalog();
    renderCheckout(user, settings, products);
  } catch (error) {
    renderMessage("Checkout is unavailable.", getFirebaseErrorMessage(error), "./products.html");
  }
}

initialize();
