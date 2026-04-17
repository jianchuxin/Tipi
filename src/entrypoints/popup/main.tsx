import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/assets/tailwind.css";
import PopupApp from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Popup root container was not found.");
}

createRoot(container).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
);

