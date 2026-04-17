declare module "*.css";

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}

declare module "react" {
  export const StrictMode: any;

  export type ChangeEvent<T = Element> = {
    target: T;
  };

  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;

  export function useMemo<T>(
    factory: () => T,
    deps: readonly unknown[]
  ): T;

  export function useState<T>(
    initialState: T
  ): [T, (value: T | ((previous: T) => T)) => void];
}

declare module "react/jsx-runtime" {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(node: unknown): void;
  };
}

declare module "flexsearch" {
  export class Index {
    constructor(options?: Record<string, unknown>);
    add(id: number | string, value: string): void;
    clear(): void;
    search(query: string, limit?: number): Array<number | string>;
  }
}

declare module "wxt" {
  export type WxtConfigEnv = {
    browser: string;
    manifestVersion: 2 | 3;
  };

  export function defineConfig<T>(config: T): T;
}

declare module "wxt/browser" {
  export type HistoryItem = {
    url?: string;
    title?: string;
    lastVisitTime?: number;
    visitCount?: number;
    typedCount?: number;
  };

  export const browser: {
    history: {
      search(options: {
        text: string;
        startTime?: number;
        maxResults?: number;
      }): Promise<HistoryItem[]>;
    };
    runtime: {
      getURL(path: string): string;
      openOptionsPage(): Promise<void>;
      sendMessage(message: unknown): Promise<unknown>;
      onInstalled: {
        addListener(callback: () => void): void;
      };
      onStartup?: {
        addListener(callback: () => void): void;
      };
      onMessage: {
        addListener(callback: (message: any) => any): void;
      };
    };
    commands: {
      onCommand: {
        addListener(callback: (command: string) => void): void;
      };
    };
    tabs: {
      create(options: { url: string }): Promise<unknown>;
    };
  };
}

declare function defineBackground<T>(definition: T): T;
