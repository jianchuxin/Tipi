import { createRoot } from "react-dom/client";
import "@/assets/tailwind.css";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import OverlayApp from "./App";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "tipi-overlay",
      position: "inline",
      anchor: () => document.documentElement,
      append: "last",
      isolateEvents: true,
      onMount(container) {
        container.style.setProperty("all", "initial");
        container.style.display = "block";
        container.style.fontSize = "16px";
        container.style.lineHeight = "1.5";
        container.style.fontFamily =
          '"Work Sans", "Avenir Next", "Segoe UI", sans-serif';
        container.style.color = "#1b1c19";
        container.style.webkitTextSizeAdjust = "100%";
        container.style.setProperty("text-size-adjust", "100%");

        const app = document.createElement("div");
        app.className = "tipi-shadow-app";
        container.append(app);

        const root = createRoot(app);
        root.render(<OverlayApp />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      }
    });

    ui.mount();
  }
});
