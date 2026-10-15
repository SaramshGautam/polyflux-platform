import React, { useState } from "react";
import "./CollapsibleSection.css";

// A section heading that toggles its own content open/closed. Collapse
// state is remembered per storageKey (e.g. per classroom+project+section)
// so a teacher who hides "Teams" while focused on Materials sees it stay
// hidden next time they open the page.
export default function CollapsibleSection({
  title,
  storageKey,
  count,
  rightContent,
  children,
  defaultCollapsed = false,
  className = "",
}) {
  const [collapsed, setCollapsed] = useState(() => {
    if (!storageKey) return defaultCollapsed;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? defaultCollapsed : stored === "1";
    } catch {
      return defaultCollapsed;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, next ? "1" : "0");
        } catch {
          // ignore — collapse state just won't persist across visits
        }
      }
      return next;
    });
  };

  return (
    <section className={`cs-section ${className}`}>
      <div className="cs-header">
        <button
          type="button"
          className="cs-toggle"
          onClick={toggle}
          aria-expanded={!collapsed}
        >
          <i
            className={`bi bi-chevron-right cs-chevron ${
              collapsed ? "" : "cs-chevron--open"
            }`}
            aria-hidden="true"
          />
          <h2>
            {title}
            {typeof count === "number" && count > 0 ? ` (${count})` : ""}
          </h2>
        </button>
        {!collapsed && rightContent}
      </div>
      {!collapsed && children}
    </section>
  );
}
