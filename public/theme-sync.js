(() => {
  let theme = localStorage.getItem("worth-flow-theme");

  try {
    theme = JSON.parse(theme);
  } catch {
  }

  document.documentElement.setAttribute(
    "data-theme",
    theme || "light"
  );

  // Fill copyright year (inline scripts are blocked by CSP script-src 'self').
  document.addEventListener("DOMContentLoaded", () => {
    const year = String(new Date().getFullYear());
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = year;
    });
  });
})();
