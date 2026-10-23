import { formatUGX, escapeHtml } from "./store-data.js";
import { getFirebase, callFunction, getFirebaseErrorMessage } from "./firebase-client.js";

const dashboardContent = document.querySelector("#dashboard-content");
const transitions = {
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready_for_collection", "out_for_delivery", "cancelled"],
  ready_for_collection: ["completed"],
  out_for_delivery: ["completed"],
  completed: [],
  cancelled: []
};
const statusLabels = {
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  processing: "Processing",
  ready_for_collection: "Ready for collection",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled"
};

function renderGuard(title, message, link = "../login.html", linkText = "Go to account") {
  dashboardContent.innerHTML = `
    <section class="panel empty-panel">
      <p class="eyebrow">OWNER ACCESS ONLY</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <a class="primary-button" href="${link}">${escapeHtml(linkText)}</a>
    </section>
  `;
}

function renderDashboard(firebase, user, products, orders, payments, settings) {
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
  const outOfStock = products.filter((product) => product.stock === 0).length;
  const pendingOrders = orders.filter((order) => order.orderStatus === "pending_confirmation").length;
  const pendingPayments = orders.filter((order) => order.paymentStatus === "pending_verification").length;
  const paidRevenue = orders
    .filter((order) => order.paymentStatus === "paid" && order.orderStatus !== "cancelled")
    .reduce((sum, order) => sum + Number(order.totalUgx || 0), 0);

  dashboardContent.innerHTML = `
    <p class="dashboard-note">Live Firestore records. Revenue counts only orders marked paid and excludes cancelled orders.</p>
    <p class="dashboard-note">Order and payment counts and the paid total below are limited to the latest 50 orders.</p>
    <section class="stats-grid">
      <article class="panel stat-card"><p>Total products</p><strong>${products.length}</strong></article>
      <article class="panel stat-card"><p>Low stock</p><strong>${lowStock}</strong></article>
      <article class="panel stat-card"><p>Out of stock</p><strong>${outOfStock}</strong></article>
      <article class="panel stat-card"><p>New (latest 50)</p><strong>${pendingOrders}</strong></article>
      <article class="panel stat-card"><p>Pending (latest 50)</p><strong>${pendingPayments}</strong></article>
      <article class="panel stat-card"><p>Paid total (latest 50)</p><strong>${formatUGX(paidRevenue)}</strong></article>
    </section>

    <section class="panel admin-section">
      <p class="eyebrow">STORE SETTINGS</p><h2>Checkout and payments</h2>
      <form id="store-settings-form" class="product-admin-form">
        <label class="checkbox-field"><input name="checkoutEnabled" type="checkbox" ${settings.checkoutEnabled === true ? "checked" : ""}><span>Enable server-validated checkout</span></label>
        <label><span>Delivery fee (UGX)</span><input name="deliveryFeeUgx" type="number" min="0" step="1" value="${Number.isSafeInteger(settings.deliveryFeeUgx) ? settings.deliveryFeeUgx : ""}"></label>
        <label class="checkbox-field"><input name="cashOnDelivery" type="checkbox" ${(settings.allowedPaymentMethods || []).includes("cash_on_delivery") ? "checked" : ""}><span>Cash on delivery</span></label>
        <label class="checkbox-field"><input name="cashOnCollection" type="checkbox" ${(settings.allowedPaymentMethods || []).includes("cash_on_collection") ? "checked" : ""}><span>Cash on collection</span></label>
        <label class="checkbox-field"><input name="mobileMoney" type="checkbox" ${(settings.allowedPaymentMethods || []).includes("mobile_money") ? "checked" : ""}><span>Manual mobile money</span></label>
        <label class="wide-field"><span>Mobile money payment instructions (shown publicly)</span><textarea name="mobileMoneyInstructions" rows="3" maxlength="500">${escapeHtml(settings.mobileMoneyInstructions || "")}</textarea></label>
        <p id="store-settings-message" class="form-message wide-field" role="status" hidden></p>
        <div class="form-actions wide-field"><button class="primary-button" type="submit">Save store settings</button></div>
      </form>
      <p class="dashboard-note">Only enable methods and publish instructions confirmed by the business owner. Online card/mobile payment-provider processing is not included.</p>
    </section>

    <section class="panel admin-section">
      <div class="section-title-row"><div><p class="eyebrow">CATALOGUE</p><h2>Manage products</h2></div></div>
      <form id="product-form" class="product-admin-form">
        <input type="hidden" name="productId">
        <label><span>Product name</span><input name="name" maxlength="120" required></label>
        <label><span>Category</span><input name="category" maxlength="60" required></label>
        <label><span>SKU</span><input name="sku" maxlength="60"></label>
        <label><span>Price (UGX)</span><input name="priceUgx" type="number" min="0" step="1" required></label>
        <label><span>Stock</span><input name="stock" type="number" min="0" step="1" required></label>
        <label><span>Condition</span><input name="condition" maxlength="40" value="New"></label>
        <label class="wide-field"><span>Description</span><textarea name="description" rows="3" maxlength="2000" required></textarea></label>

        <label class="wide-field"><span>Product image URL (optional)</span> <input name="imageUrl" type="url" placeholder="https://example.com/product-image.jpg"></label>
        
        <label class="checkbox-field"><input name="isActive" type="checkbox" checked><span>Active listing</span></label>
        <label class="checkbox-field"><input name="featured" type="checkbox"><span>Featured</span></label>
        <p id="product-form-message" class="form-message wide-field" role="status" hidden></p>
        <div class="form-actions wide-field">
          <button class="primary-button" type="submit">Save product</button>
          <button class="secondary-button" id="reset-product-form" type="button">Clear</button>
        </div>
      </form>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${products.length ? products.map((product) => `
              <tr>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.category)}</td>
                <td>${Number(product.stock) || 0}</td>
                <td>${formatUGX(product.priceUgx)}</td>
                <td>${product.isActive ? "Active" : "Inactive"}</td>
                <td><button class="text-button edit-product" type="button" data-product-id="${escapeHtml(product.id)}">Edit</button></td>
              </tr>
            `).join("") : '<tr><td colspan="6">No products in Firestore yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel admin-section">
      <p class="eyebrow">ORDERS</p><h2>Recent orders</h2>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Reference</th><th>Customer</th><th>Total</th><th>Order</th><th>Payment</th><th>Payment reference</th><th>Actions</th></tr></thead>
          <tbody>
            ${orders.length ? orders.map((order) => {
    const payment = payments.find((item) => item.id === order.id);
    const choices = transitions[order.orderStatus] || [];
    return `<tr>
                <td>${escapeHtml(order.id)}</td>
                <td>${escapeHtml(order.customerName)}<br><small>${escapeHtml(order.customerEmail)}</small></td>
                <td>${formatUGX(order.totalUgx)}</td>
                <td>${escapeHtml(statusLabels[order.orderStatus] || order.orderStatus)}</td>
                <td>${escapeHtml(order.paymentStatus)}</td>
                <td>${escapeHtml(payment?.reference || "—")}</td>
                <td class="order-actions">
                  ${choices.length ? `<select class="order-status-select" aria-label="Set order status for ${escapeHtml(order.id)}" data-order-id="${escapeHtml(order.id)}"><option value="">Update status</option>${choices.map((status) => `<option value="${status}">${escapeHtml(statusLabels[status])}</option>`).join("")}</select>` : ""}
                  ${order.paymentStatus === "pending_verification" ? `<button class="text-button verify-payment" type="button" data-order-id="${escapeHtml(order.id)}" data-verified="true">Verify</button><button class="text-button reject-payment" type="button" data-order-id="${escapeHtml(order.id)}">Reject</button>` : ""}
                </td>
              </tr>`;
  }).join("") : '<tr><td colspan="7">No orders recorded.</td></tr>'}
          </tbody>
        </table>
      </div>
      <p id="order-action-message" class="form-message" role="status" hidden></p>
    </section>
  `;

  const productForm = document.querySelector("#product-form");
  const productMessage = document.querySelector("#product-form-message");
  const fields = productForm.elements;

  function setProductMessage(message, isError = false) {
    productMessage.textContent = message;
    productMessage.classList.toggle("is-error", isError);
    productMessage.hidden = false;
  }

  const settingsForm = document.querySelector("#store-settings-form");
  const settingsMessage = document.querySelector("#store-settings-message");
  settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = settingsForm.querySelector("[type=submit]");
    button.disabled = true;
    settingsMessage.hidden = true;
    try {
      const settingsFields = settingsForm.elements;
      const methods = [];
      if (settingsFields.cashOnDelivery.checked) methods.push("cash_on_delivery");
      if (settingsFields.cashOnCollection.checked) methods.push("cash_on_collection");
      if (settingsFields.mobileMoney.checked) methods.push("mobile_money");
      const deliveryFeeUgx = Number(settingsFields.deliveryFeeUgx.value);
      const mobileMoneyInstructions = settingsFields.mobileMoneyInstructions.value.trim();
      if (settingsFields.checkoutEnabled.checked && methods.length === 0) {
        throw new Error("Select at least one payment method before enabling checkout.");
      }
      if (settingsFields.checkoutEnabled.checked
        && (!Number.isSafeInteger(deliveryFeeUgx) || deliveryFeeUgx < 0)) {
        throw new Error("Set a whole-number delivery fee before enabling checkout.");
      }
      if (settingsFields.mobileMoney.checked && !mobileMoneyInstructions) {
        throw new Error("Add the confirmed mobile money instructions before enabling that method.");
      }
      await firebase.firestoreSdk.setDoc(firebase.firestoreSdk.doc(firebase.db, "settings", "public"), {
        checkoutEnabled: settingsFields.checkoutEnabled.checked,
        allowedPaymentMethods: methods,
        deliveryFeeUgx: Number.isSafeInteger(deliveryFeeUgx) && deliveryFeeUgx >= 0 ? deliveryFeeUgx : null,
        mobileMoneyInstructions: methods.includes("mobile_money") ? mobileMoneyInstructions : "",
        updatedAt: firebase.firestoreSdk.serverTimestamp(),
        updatedBy: user.uid
      }, { merge: true });
      settingsMessage.textContent = "Store settings saved.";
      settingsMessage.hidden = false;
    } catch (error) {
      settingsMessage.textContent = getFirebaseErrorMessage(error);
      settingsMessage.classList.add("is-error");
      settingsMessage.hidden = false;
    } finally {
      button.disabled = false;
    }
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveButton = productForm.querySelector("[type=submit]");
    saveButton.disabled = true;
    productMessage.hidden = true;
    try {
      const name = fields.name.value.trim();
      const category = fields.category.value.trim();
      const priceUgx = Number(fields.priceUgx.value);
      const stock = Number(fields.stock.value);
      if (!name || !category || !Number.isSafeInteger(priceUgx) || priceUgx < 0
        || !Number.isSafeInteger(stock) || stock < 0) {
        throw new Error("Check product name, category, whole-number price, and stock.");
      }

      const id = fields.productId.value || firebase.firestoreSdk.doc(firebase.firestoreSdk.collection(firebase.db, "products")).id;
      let imageUrl = products.find((product) => product.id === id)?.imageUrl || "";
      const imageFile = fields.image.files[0];
      if (imageFile) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type) || imageFile.size >= 5 * 1024 * 1024) {
          throw new Error("Choose a JPEG, PNG, or WebP image under 5 MB.");
        }
        const imageRef = firebase.storageSdk.ref(firebase.storage, `products/${id}/${crypto.randomUUID()}`);
        await firebase.storageSdk.uploadBytes(imageRef, imageFile, { contentType: imageFile.type });
        imageUrl = await firebase.storageSdk.getDownloadURL(imageRef);
      }

      const productData = {
        name,
        category,
        description: fields.description.value.trim(),
        sku: fields.sku.value.trim(),
        condition: fields.condition.value.trim() || "New",
        priceUgx,
        stock,
        isActive: fields.isActive.checked,
        featured: fields.featured.checked,
        imageUrl,
        updatedAt: firebase.firestoreSdk.serverTimestamp()
      };
      if (!fields.productId.value) productData.createdAt = firebase.firestoreSdk.serverTimestamp();
      await firebase.firestoreSdk.setDoc(firebase.firestoreSdk.doc(firebase.db, "products", id), productData, { merge: true });
      setProductMessage("Product saved. Reload the dashboard to refresh the listing.");
      productForm.reset();
      fields.productId.value = "";
    } catch (error) {
      setProductMessage(getFirebaseErrorMessage(error), true);
    } finally {
      saveButton.disabled = false;
    }
  });

  document.querySelector("#reset-product-form").addEventListener("click", () => {
    productForm.reset();
    fields.productId.value = "";
    fields.isActive.checked = true;
  });

  document.querySelectorAll(".edit-product").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((entry) => entry.id === button.dataset.productId);
      if (!product) return;
      fields.productId.value = product.id;
      fields.name.value = product.name || "";
      fields.category.value = product.category || "";
      fields.sku.value = product.sku || "";
      fields.priceUgx.value = product.priceUgx;
      fields.stock.value = product.stock;
      fields.condition.value = product.condition || "New";
      fields.description.value = product.description || "";
      fields.isActive.checked = product.isActive === true;
      fields.featured.checked = product.featured === true;
      productForm.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  const orderMessage = document.querySelector("#order-action-message");
  document.querySelectorAll(".order-status-select").forEach((select) => {
    select.addEventListener("change", async () => {
      if (!select.value) return;
      select.disabled = true;
      try {
        await callFunction("updateOrderStatus", { orderId: select.dataset.orderId, status: select.value });
        orderMessage.textContent = "Order status updated. Reload to refresh.";
        orderMessage.hidden = false;
      } catch (error) {
        orderMessage.textContent = getFirebaseErrorMessage(error);
        orderMessage.classList.add("is-error");
        orderMessage.hidden = false;
        select.disabled = false;
      }
    });
  });

  document.querySelectorAll(".verify-payment, .reject-payment").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await callFunction("verifyManualPayment", {
          orderId: button.dataset.orderId,
          verified: button.classList.contains("verify-payment")
        });
        orderMessage.textContent = "Payment reviewed. Reload to refresh.";
        orderMessage.hidden = false;
      } catch (error) {
        orderMessage.textContent = getFirebaseErrorMessage(error);
        orderMessage.classList.add("is-error");
        orderMessage.hidden = false;
        button.disabled = false;
      }
    });
  });
}

async function initialize() {
  document.querySelector("#current-year").textContent = new Date().getFullYear();
  try {
    const firebase = await getFirebase();
    await firebase.auth.authStateReady();
    const user = firebase.auth.currentUser;
    if (!user) {
      renderGuard("Secure admin access is required.", "Sign in using the store owner account.");
      return;
    }
    const token = await user.getIdTokenResult(true);
    if (token.claims.admin !== true) {
      renderGuard("This account is not authorized.", "Only an administrator with a server-managed Firebase custom claim can access this dashboard.");
      return;
    }

    const { collection, doc, getDoc, getDocs, limit, orderBy, query } = firebase.firestoreSdk;
    const [productsSnapshot, ordersSnapshot, settingsSnapshot] = await Promise.all([
      getDocs(collection(firebase.db, "products")),
      getDocs(query(collection(firebase.db, "orders"), orderBy("createdAt", "desc"), limit(50))),
      getDoc(doc(firebase.db, "settings", "public"))
    ]);
    const products = productsSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
    const orders = ordersSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    const payments = (await Promise.all(orders.map((order) =>
      getDoc(doc(firebase.db, "payments", order.id))
    ))).filter((snapshot) => snapshot.exists()).map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
    renderDashboard(firebase, user, products, orders, payments, settingsSnapshot.exists() ? settingsSnapshot.data() : {});
  } catch (error) {
    console.error("Owner dashboard load failed:", error);
    renderGuard("Dashboard unavailable.", getFirebaseErrorMessage(error), "../index.html", "Return to store");
  }
}

initialize();
