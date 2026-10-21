const test = require("node:test");
const assert = require("node:assert/strict");
const { validateCheckoutInput } = require("../src/order-validation.js");

const validCheckout = {
  idempotencyKey: "checkout-request-000001",
  name: "Test Customer",
  address: "Kampala",
  fulfilmentMethod: "delivery",
  paymentMethod: "cash_on_delivery",
  items: [{ productId: "test_product", quantity: 2 }]
};

test("accepts bounded checkout data", () => {
  assert.deepEqual(validateCheckoutInput(validCheckout).items, validCheckout.items);
});

test("rejects client-supplied prices and totals only by ignoring them", () => {
  const input = { ...validCheckout, total: 1, items: [{ ...validCheckout.items[0], price: 1 }] };
  const result = validateCheckoutInput(input);
  assert.equal(Object.hasOwn(result, "total"), false);
  assert.equal(Object.hasOwn(result.items[0], "price"), false);
});

test("rejects invalid quantities and duplicate products", () => {
  assert.throws(() => validateCheckoutInput({ ...validCheckout, items: [{ productId: "x", quantity: 0 }] }));
  assert.throws(() => validateCheckoutInput({
    ...validCheckout,
    items: [{ productId: "x", quantity: 1 }, { productId: "x", quantity: 2 }]
  }));
});

test("requires delivery address and valid idempotency key", () => {
  assert.throws(() => validateCheckoutInput({ ...validCheckout, address: " " }));
  assert.throws(() => validateCheckoutInput({ ...validCheckout, idempotencyKey: "short" }));
});

test("requires the cash method to match the fulfilment type", () => {
  assert.throws(() => validateCheckoutInput({ ...validCheckout, paymentMethod: "cash_on_collection" }));
  assert.throws(() => validateCheckoutInput({
    ...validCheckout,
    fulfilmentMethod: "collection",
    address: "",
    paymentMethod: "cash_on_delivery"
  }));
});
