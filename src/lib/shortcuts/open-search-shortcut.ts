import { browser } from "wxt/browser";

const OPEN_SEARCH_COMMAND = "tipi.open-search";
type CommandInfo = {
  name?: string;
  shortcut?: string;
};

function getDefaultShortcut() {
  const platform = globalThis.navigator?.platform?.toLowerCase() ?? "";
  return platform.includes("mac") ? "Option+K" : "Alt+K";
}

export function formatShortcutLabel(shortcut: string) {
  return shortcut.replace(/\+/g, " + ");
}

export async function readOpenSearchShortcutLabelFromCommands() {
  const commandsApi = (
    browser as typeof browser & {
      commands?: {
        getAll: () => Promise<CommandInfo[]>;
      };
    }
  ).commands;

  if (!commandsApi?.getAll) {
    return null;
  }

  const commands = await commandsApi.getAll();
  const openSearchCommand = commands.find(
    (command) => command.name === OPEN_SEARCH_COMMAND
  );

  if (!openSearchCommand?.shortcut) {
    return null;
  }

  return formatShortcutLabel(openSearchCommand.shortcut);
}

function isShortcutResponse(value: unknown): value is { shortcut: string } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).shortcut === "string"
  );
}

export async function getOpenSearchShortcutLabel() {
  try {
    const response = await browser.runtime.sendMessage({
      type: "tipi.get-open-search-shortcut"
    });

    if (isShortcutResponse(response)) {
      return response.shortcut;
    }
  } catch (error) {
    console.warn("[Tipi] failed to ask background for keyboard shortcut", error);
  }

  try {
    const shortcut = await readOpenSearchShortcutLabelFromCommands();

    if (shortcut) {
      return shortcut;
    }
  } catch (error) {
    console.warn("[Tipi] failed to read keyboard shortcut", error);
  }

  return formatShortcutLabel(getDefaultShortcut());
}
