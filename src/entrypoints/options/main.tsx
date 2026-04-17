import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/assets/tailwind.css";
import OptionsApp from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Options root container was not found.");
}

createRoot(container).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>
);

