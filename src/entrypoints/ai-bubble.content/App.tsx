import { useState } from "react";
import { browser } from "wxt/browser";

export default function BubbleApp() {
  const [isHovered, setIsHovered] = useState(false);

  async function handleClick() {
    try {
      await browser.runtime.sendMessage({ type: "tipi.open-side-panel" });
    } catch (error) {
      console.warn("[Tipi AI] failed to open side panel", error);
    }
  }

  return (
    <div
      className="pointer-events-auto"
      style={{
        position: "fixed",
        right: "24px",
        bottom: "80px",
        zIndex: 2147483646,
      }}
    >
      <button
        aria-label="Open Tipi AI Assistant"
        onClick={() => void handleClick()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: "var(--color-surface, #f5f3ed)",
          color: "var(--color-primary, #8a9a5b)",
          boxShadow: isHovered
            ? "0 4px 16px rgba(0,0,0,0.15)"
            : "0 2px 8px rgba(0,0,0,0.1)",
          transform: isHovered ? "scale(1.05)" : "scale(1)",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
        type="button"
      >
        <svg
          fill="none"
          height="22"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="22"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
          <path d="M8 9.5c.8-.8 3.2-2 5.5.5" />
          <path d="M8 13c.8.5 2.6 1 4-.5" />
          <circle cx="9" cy="9" fill="currentColor" r="1.2" stroke="none" />
          <circle cx="15" cy="9" fill="currentColor" r="1.2" stroke="none" />
        </svg>
      </button>
    </div>
  );
}
