import { formatUGX, escapeHtml } from "./store-data.js";
import { getFirebase, callFunction, getFirebaseErrorMessage } from "./firebase-client.js";

const ordersContent = document.querySelector("#orders-content");

async function initialize() {
  document.querySelector("#current-year").textContent = new Date().getFullYear();
  try {
    const firebase = await getFirebase();
    await firebase.auth.authStateReady();
    const user = firebase.auth.currentUser;
    if (!user) {
      ordersContent.innerHTML = '<section class="panel empty-panel"><h2>Sign in to view your orders.</h2><a class="primary-button" href="./login.html?next=orders.html">Sign in</a></section>';
      return;
    }

    const { collection, getDocs, query, where } = firebase.firestoreSdk;
    const snapshot = await getDocs(query(
      collection(firebase.db, "orders"),
      where("customerUid", "==", user.uid)
    ));
    const orders = snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    if (!orders.length) {
      ordersContent.innerHTML = '<section class="panel empty-panel"><h2>No orders yet.</h2><a class="primary-button" href="./products.html">Browse products</a></section>';
      return;
    }

    ordersContent.innerHTML = orders.map((order) => `
      <article class="panel order-card">
        <div class="order-card-heading">
          <div><p class="eyebrow">ORDER ${escapeHtml(order.id)}</p><h2>${escapeHtml(order.customerName)}</h2></div>
          <span class="stock-badge">${escapeHtml(order.orderStatus.replaceAll("_", " "))}</span>
        </div>
        <div class="order-card-meta">
          <span>Payment: ${escapeHtml(order.paymentStatus.replaceAll("_", " "))}</span>
          <span>Method: ${escapeHtml(order.paymentMethod.replaceAll("_", " "))}</span>
          <span>Total: <strong>${formatUGX(order.totalUgx)}</strong></span>
        </div>
        <ul class="order-item-list">
          ${order.items.map((item) => `<li><span>${escapeHtml(item.name)} × ${item.quantity}</span><strong>${formatUGX(item.lineTotalUgx)}</strong></li>`).join("")}
        </ul>
        ${order.paymentMethod === "mobile_money" && order.paymentStatus === "unpaid" ? `
          <form class="reference-form" data-order-id="${escapeHtml(order.id)}">
            <p>Payment remains unpaid until the store owner verifies your reference.</p>
            <label><span>Transaction reference</span><input name="reference" maxlength="100" required></label>
            <p class="form-message" role="alert" hidden></p>
            <button class="secondary-button" type="submit">Submit reference</button>
          </form>
        ` : ""}
      </article>
    `).join("");

    ordersContent.querySelectorAll(".reference-form").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = form.querySelector("[type=submit]");
        const message = form.querySelector(".form-message");
        button.disabled = true;
        try {
          await callFunction("submitManualPaymentReference", {
            orderId: form.dataset.orderId,
            reference: form.elements.reference.value
          });
          form.innerHTML = "<p>Reference submitted. It remains pending until verified by the store owner.</p>";
        } catch (error) {
          message.textContent = getFirebaseErrorMessage(error);
          message.hidden = false;
          button.disabled = false;
        }
      });
    });
  } catch (error) {
    console.error("Order history load failed:", error);
    ordersContent.textContent = getFirebaseErrorMessage(error);
  }
}

initialize();
