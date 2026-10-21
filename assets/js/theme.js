const themeToggle = document.querySelector(".theme-toggle");

function updateBagCount() {
  const bagCountNodes = document.querySelectorAll(".bag-count");
  const items = JSON.parse(window.localStorage.getItem("isax-cart") || "[]");
  const count = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  bagCountNodes.forEach((node) => {
    node.textContent = String(count);
    node.setAttribute("aria-label", `${count} items`);
  });
}

function applyTheme() {
  const saved = window.localStorage.getItem("isax-theme");
  if (saved === "dark") {
    document.body.classList.add("dark-theme");
    if (themeToggle) {
      themeToggle.setAttribute("aria-label", "Switch to light theme");
    }
  }
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-theme");
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    try {
      window.localStorage.setItem("isax-theme", isDark ? "dark" : "light");
    } catch {
      // Ignore storage errors.
    }
  });
}

applyTheme();
updateBagCount();
