const PAYMENT_METHODS = new Set(["cash_on_delivery", "cash_on_collection", "mobile_money"]);
const FULFILMENT_METHODS = new Set(["delivery", "collection"]);

function validateCheckoutInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid checkout request.");
  }

  const idempotencyKey = typeof data.idempotencyKey === "string" ? data.idempotencyKey : "";
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(idempotencyKey)) {
    throw new Error("A valid idempotency key is required.");
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const address = typeof data.address === "string" ? data.address.trim() : "";
  const fulfilmentMethod = data.fulfilmentMethod;
  const paymentMethod = data.paymentMethod;

  if (!name || name.length > 100) throw new Error("Enter a name up to 100 characters.");
  if (!FULFILMENT_METHODS.has(fulfilmentMethod)) throw new Error("Choose a valid fulfilment method.");
  if (fulfilmentMethod === "delivery" && (!address || address.length > 500)) {
    throw new Error("Enter a delivery address up to 500 characters.");
  }
  if (fulfilmentMethod === "collection" && address.length > 500) {
    throw new Error("Collection notes must be 500 characters or fewer.");
  }
  if (!PAYMENT_METHODS.has(paymentMethod)) throw new Error("Choose a valid payment method.");
  if (paymentMethod === "cash_on_delivery" && fulfilmentMethod !== "delivery") {
    throw new Error("Cash on delivery requires delivery fulfilment.");
  }
  if (paymentMethod === "cash_on_collection" && fulfilmentMethod !== "collection") {
    throw new Error("Cash on collection requires collection fulfilment.");
  }

  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 20) {
    throw new Error("A checkout must contain between 1 and 20 distinct products.");
  }

  const seen = new Set();
  const items = data.items.map((item) => {
    const productId = typeof item?.productId === "string" ? item.productId : "";
    const quantity = item?.quantity;
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(productId)) throw new Error("Invalid product.");
    if (seen.has(productId)) throw new Error("Each product may appear only once.");
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new Error("Product quantities must be whole numbers between 1 and 20.");
    }
    seen.add(productId);
    return { productId, quantity };
  });

  return { idempotencyKey, name, address, fulfilmentMethod, paymentMethod, items };
}

module.exports = { validateCheckoutInput };
