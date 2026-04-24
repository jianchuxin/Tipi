import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: ({ browser }) => ({
    ...((browser !== "firefox"
      ? {
          web_accessible_resources: [
            {
              resources: ["_favicon/*"],
              matches: ["<all_urls>"]
            }
          ]
        }
      : {}) as object),
    name: "Tipi",
    description: "Quickly find and jump back to websites from browser history.",
    icons: {
      16: "/icon.png",
      32: "/icon.png",
      48: "/icon.png",
      128: "/icon.png"
    },
    permissions:
      browser !== "firefox"
        ? ["history", "storage", "tabs", "windows", "favicon"]
        : ["history", "storage", "tabs", "windows"],
    action: {
      default_title: "Open Tipi",
      default_icon: {
        16: "/icon.png",
        32: "/icon.png",
        48: "/icon.png",
        128: "/icon.png"
      }
    },
    commands: {
      "tipi.open-search": {
        suggested_key: {
          default: "Alt+K",
          mac: "Option+K"
        },
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
