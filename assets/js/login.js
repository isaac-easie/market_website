import { iSaxAuth } from "./auth.js";

const auth = new iSaxAuth();
const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");

function showMessage(text, isError = true) {
  message.textContent = text;
  message.classList.toggle("is-error", isError);
  message.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector("[type=submit]");
  submitButton.disabled = true;
  message.hidden = true;
  const formData = new FormData(form);
  const result = await auth.signIn({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!result.ok) {
    showMessage(result.message);
    submitButton.disabled = false;
    return;
  }

  const requestedNext = new URLSearchParams(window.location.search).get("next");
  const allowedNextPages = new Set(["checkout.html", "orders.html", "products.html"]);
  window.location.href = allowedNextPages.has(requestedNext) ? `./${requestedNext}` : "./products.html";
});

document.querySelector("#password-reset").addEventListener("click", async () => {
  const email = form.elements.email.value;
  const result = await auth.sendPasswordReset(email);
  showMessage(result.ok ? "If this address is registered, a password reset email has been sent." : result.message, !result.ok);
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
