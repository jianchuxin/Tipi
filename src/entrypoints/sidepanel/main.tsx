import { createRoot } from "react-dom/client";
import "@/assets/tailwind.css";
import SidePanelApp from "./App";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<SidePanelApp />);
}
