const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { createHash } = require("node:crypto");
const { validateCheckoutInput } = require("./order-validation");

initializeApp();
const db = getFirestore();

function requireUser(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
  return request.auth;
}

function requireOwner(request) {
  const auth = requireUser(request);
  if (auth.token.admin !== true) throw new HttpsError("permission-denied", "Owner access is required.");
  return auth;
}

function callableOptions() {
  return { enforceAppCheck: true, region: "europe-west1" };
}

exports.createOrder = onCall(callableOptions(), async (request) => {
  const auth = requireUser(request);
  let input;
  try {
    input = validateCheckoutInput(request.data);
  } catch (error) {
    throw new HttpsError("invalid-argument", error.message);
  }

  const settingsRef = db.doc("settings/public");
  const settingsSnapshot = await settingsRef.get();
  const settings = settingsSnapshot.data();
  if (!settings || settings.checkoutEnabled !== true) {
    throw new HttpsError("failed-precondition", "Checkout is not enabled by the store owner.");
  }
  if (!Array.isArray(settings.allowedPaymentMethods)
      || !settings.allowedPaymentMethods.includes(input.paymentMethod)) {
    throw new HttpsError("failed-precondition", "That payment method is not currently available.");
  }
  if (input.fulfilmentMethod === "delivery"
      && (!Number.isSafeInteger(settings.deliveryFeeUgx) || settings.deliveryFeeUgx < 0)) {
    throw new HttpsError("failed-precondition", "Delivery pricing has not been configured.");
  }

  const requestRef = db.doc(`checkoutRequests/${auth.uid}_${input.idempotencyKey}`);
  const orderRef = db.collection("orders").doc();
  const productRefs = input.items.map(({ productId }) => db.doc(`products/${productId}`));

  const orderSummary = await db.runTransaction(async (transaction) => {
    const priorRequest = await transaction.get(requestRef);
    if (priorRequest.exists) {
      const priorOrder = await transaction.get(db.doc(`orders/${priorRequest.get("orderId")}`));
      if (!priorOrder.exists) throw new HttpsError("internal", "The prior checkout record is inconsistent.");
      const saved = priorOrder.data();
      return {
        orderId: priorOrder.id,
        subtotalUgx: saved.subtotalUgx,
        deliveryFeeUgx: saved.deliveryFeeUgx,
        totalUgx: saved.totalUgx,
        orderStatus: saved.orderStatus,
        paymentStatus: saved.paymentStatus
      };
    }

    const productSnapshots = [];
    for (const productRef of productRefs) {
      productSnapshots.push(await transaction.get(productRef));
    }

    let subtotalUgx = 0;
    const items = input.items.map((item, index) => {
      const productSnapshot = productSnapshots[index];
      if (!productSnapshot.exists) throw new HttpsError("not-found", "A selected product is no longer available.");
      const product = productSnapshot.data();
      if (product.isActive !== true) throw new HttpsError("failed-precondition", "A selected product is inactive.");
      if (!Number.isSafeInteger(product.priceUgx) || product.priceUgx < 0) {
        throw new HttpsError("failed-precondition", "A product has invalid price configuration.");
      }
      if (!Number.isSafeInteger(product.stock) || product.stock < item.quantity) {
        throw new HttpsError("failed-precondition", "A selected product has insufficient stock.");
      }

      const lineTotalUgx = product.priceUgx * item.quantity;
      if (!Number.isSafeInteger(lineTotalUgx)) throw new HttpsError("invalid-argument", "Order amount is too large.");
      subtotalUgx += lineTotalUgx;
      if (!Number.isSafeInteger(subtotalUgx)) throw new HttpsError("invalid-argument", "Order amount is too large.");
      return {
        productId: productSnapshot.id,
        name: String(product.name || ""),
        sku: String(product.sku || ""),
        priceUgx: product.priceUgx,
        quantity: item.quantity,
        lineTotalUgx
      };
    });

    const deliveryFeeUgx = input.fulfilmentMethod === "delivery" ? settings.deliveryFeeUgx : 0;
    const totalUgx = subtotalUgx + deliveryFeeUgx;
    if (!Number.isSafeInteger(totalUgx)) throw new HttpsError("invalid-argument", "Order amount is too large.");
    for (let index = 0; index < productRefs.length; index += 1) {
      transaction.update(productRefs[index], { stock: productSnapshots[index].get("stock") - input.items[index].quantity });
    }
    transaction.create(orderRef, {
      customerUid: auth.uid,
      customerEmail: auth.token.email || "",
      customerName: input.name,
      deliveryAddress: input.fulfilmentMethod === "delivery" ? input.address : "",
      fulfilmentMethod: input.fulfilmentMethod,
      paymentMethod: input.paymentMethod,
      items,
      subtotalUgx,
      deliveryFeeUgx,
      totalUgx,
      currency: "UGX",
      orderStatus: "pending_confirmation",
      paymentStatus: "unpaid",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    transaction.create(requestRef, {
      orderId: orderRef.id,
      createdAt: FieldValue.serverTimestamp()
    });

    return { orderId: orderRef.id, subtotalUgx, deliveryFeeUgx, totalUgx, orderStatus: "pending_confirmation", paymentStatus: "unpaid" };
  });

  return orderSummary;
});

exports.submitManualPaymentReference = onCall(callableOptions(), async (request) => {
  const auth = requireUser(request);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId : "";
  const reference = typeof request.data?.reference === "string" ? request.data.reference.trim() : "";
  if (!/^[A-Za-z0-9-]{4,80}$/.test(orderId) || !/^[A-Za-z0-9-]{4,100}$/.test(reference)) {
    throw new HttpsError("invalid-argument", "Enter a valid order ID and transaction reference.");
  }

  const orderRef = db.doc(`orders/${orderId}`);
  const paymentRef = db.doc(`payments/${orderId}`);
  const referenceHash = createHash("sha256").update(reference.toUpperCase()).digest("hex");
  const referenceIndexRef = db.doc(`paymentReferences/${referenceHash}`);
  await db.runTransaction(async (transaction) => {
    const [orderSnapshot, referenceIndexSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(referenceIndexRef)
    ]);
    if (!orderSnapshot.exists || orderSnapshot.get("customerUid") !== auth.uid) {
      throw new HttpsError("not-found", "Order not found.");
    }
    if (orderSnapshot.get("paymentMethod") !== "mobile_money") {
      throw new HttpsError("failed-precondition", "This order does not use mobile money.");
    }
    if (orderSnapshot.get("paymentStatus") !== "unpaid") {
      throw new HttpsError("failed-precondition", "A payment reference has already been submitted or reviewed.");
    }
    if (referenceIndexSnapshot.exists) {
      throw new HttpsError("already-exists", "That transaction reference has already been submitted.");
    }
    transaction.create(paymentRef, {
      orderId,
      customerUid: auth.uid,
      reference,
      status: "pending_verification",
      createdAt: FieldValue.serverTimestamp()
    });
    transaction.create(referenceIndexRef, {
      orderId,
      createdAt: FieldValue.serverTimestamp()
    });
    transaction.update(orderRef, {
      paymentStatus: "pending_verification",
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  return { ok: true, status: "pending_verification" };
});

exports.verifyManualPayment = onCall(callableOptions(), async (request) => {
  const auth = requireOwner(request);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId : "";
  const verified = request.data?.verified;
  if (!/^[A-Za-z0-9-]{4,80}$/.test(orderId) || typeof verified !== "boolean") {
    throw new HttpsError("invalid-argument", "A valid order ID and verification decision are required.");
  }

  const orderRef = db.doc(`orders/${orderId}`);
  const paymentRef = db.doc(`payments/${orderId}`);
  const auditRef = db.collection("auditLogs").doc();
  await db.runTransaction(async (transaction) => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef)
    ]);
    if (!orderSnapshot.exists || !paymentSnapshot.exists) throw new HttpsError("not-found", "Payment record not found.");
    if (orderSnapshot.get("paymentStatus") !== "pending_verification") {
      throw new HttpsError("failed-precondition", "This payment has already been reviewed.");
    }
    const paymentStatus = verified ? "paid" : "failed";
    transaction.update(orderRef, {
      paymentStatus,
      paymentVerifiedBy: auth.uid,
      paymentVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    transaction.update(paymentRef, {
      status: paymentStatus,
      reviewedBy: auth.uid,
      reviewedAt: FieldValue.serverTimestamp()
    });
    transaction.create(auditRef, {
      actorUid: auth.uid,
      action: verified ? "manual_payment_verified" : "manual_payment_rejected",
      orderId,
      createdAt: FieldValue.serverTimestamp()
    });
  });
  return { ok: true, paymentStatus: verified ? "paid" : "failed" };
});

exports.updateOrderStatus = onCall(callableOptions(), async (request) => {
  const auth = requireOwner(request);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId : "";
  const nextStatus = request.data?.status;
  const transitions = {
    pending_confirmation: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["ready_for_collection", "out_for_delivery", "cancelled"],
    ready_for_collection: ["completed"],
    out_for_delivery: ["completed"],
    completed: [],
    cancelled: []
  };
  if (!/^[A-Za-z0-9-]{4,80}$/.test(orderId) || !Object.hasOwn(transitions, nextStatus)) {
    throw new HttpsError("invalid-argument", "Invalid order status update.");
  }

  const orderRef = db.doc(`orders/${orderId}`);
  const auditRef = db.collection("auditLogs").doc();
  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) throw new HttpsError("not-found", "Order not found.");
    const currentStatus = orderSnapshot.get("orderStatus");
    if (!transitions[currentStatus]?.includes(nextStatus)) {
      throw new HttpsError("failed-precondition", "That order status transition is not allowed.");
    }

    let productRefs = [];
    let productSnapshots = [];
    if (nextStatus === "cancelled") {
      productRefs = (orderSnapshot.get("items") || []).map((item) => db.doc(`products/${item.productId}`));
      for (const productRef of productRefs) productSnapshots.push(await transaction.get(productRef));
      productSnapshots.forEach((snapshot) => {
        if (!snapshot.exists || !Number.isSafeInteger(snapshot.get("stock")) || snapshot.get("stock") < 0) {
          throw new HttpsError("failed-precondition", "Cannot cancel because an inventory item is missing or invalid.");
        }
      });
      productSnapshots.forEach((snapshot, index) => {
        const quantity = orderSnapshot.get("items")[index].quantity;
        transaction.update(productRefs[index], { stock: snapshot.get("stock") + quantity });
      });
    }
    transaction.update(orderRef, {
      orderStatus: nextStatus,
      updatedAt: FieldValue.serverTimestamp()
    });
    transaction.create(auditRef, {
      actorUid: auth.uid,
      action: "order_status_changed",
      orderId,
      from: currentStatus,
      to: nextStatus,
      createdAt: FieldValue.serverTimestamp()
    });
  });
  return { ok: true, status: nextStatus };
});
