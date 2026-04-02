declare global {
  // Vite define constants injected at build time via vite.config.ts
  declare const ROOT_FOLDER: string;
  declare const PROXY_API_URL: string;
  declare const ENV: string;

  // Window extensions
  declare interface Window {
    ActiveXObject?: unknown;
  }
}

export { };
