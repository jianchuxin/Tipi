import { createRoot } from "react-dom/client";
import "@/assets/tailwind.css";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import BubbleApp from "./App";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "tipi-ai-bubble",
      position: "inline",
      anchor: () => document.body ?? document.documentElement,
      append: "last",
      isolateEvents: true,
      onMount(_uiContainer, shadow) {
        const reset = document.createElement("style");
        reset.textContent = `
          :host{all:initial !important;background:transparent !important;
                width:0 !important;height:0 !important;
                pointer-events:none !important;overflow:visible !important}
          :host html,:host body{
                background:transparent !important;
                min-height:0 !important;min-width:0 !important;
                margin:0 !important;padding:0 !important}
        `;
        shadow.appendChild(reset);

        const app = document.createElement("div");
        app.className = "tipi-ai-bubble-app";
        _uiContainer.append(app);

        const root = createRoot(app);
        root.render(<BubbleApp />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
