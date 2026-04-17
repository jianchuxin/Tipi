import { defineConfig, type WxtConfigEnv } from "wxt";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: ({ browser, manifestVersion }: WxtConfigEnv) => ({
    name: "Tipi",
    description: "Quickly find and jump back to websites from browser history.",
    permissions: ["history", "storage", "tabs"],
    action: {
      default_title: "Open Tipi"
    },
    commands: {
      "tipi.open-search": {
        suggested_key:
          manifestVersion === 3
            ? {
                default: "Ctrl+Shift+K",
                mac: "Command+Shift+K"
              }
            : undefined,
        description: "Open Tipi search"
      }
    },
    browser_specific_settings:
      browser === "firefox"
        ? {
            gecko: {
              id: "tipi@example.local"
            }
          }
        : undefined
  })
});
