// Light/dark theme switch for PolyFlux. Pairs with the --pf-* tokens defined
// in src/style.css ( :root = light, :root[data-theme="dark"] = dark ).
const STORAGE_KEY = "pf-theme";

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme) {
  // Light is the default :root — only set the attribute for dark, so the
  // CSS stays simple ( :root[data-theme="dark"] ) and light needs nothing.
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function initTheme() {
  applyTheme(getStoredTheme());
}

export function toggleTheme() {
  const next = getStoredTheme() === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore — theme just won't persist across reloads
  }
  applyTheme(next);
  return next;
}
