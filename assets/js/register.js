import { iSaxAuth } from "./auth.js";

const auth = new iSaxAuth();
const form = document.querySelector("#register-form");
const message = document.querySelector("#register-message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("[type=submit]");
  button.disabled = true;
  message.hidden = true;
  const formData = new FormData(form);
  const result = await auth.signUp({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!result.ok) {
    message.textContent = result.message;
    message.classList.add("is-error");
    message.hidden = false;
    button.disabled = false;
    return;
  }

  window.location.href = "./products.html";
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
