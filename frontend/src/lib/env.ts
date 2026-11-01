/**
 * Centralized environment configuration and validation.
 *
 * Rules:
 * 1. Strips any trailing slashes to prevent double-slash URL bugs (e.g. `//products`).
 * 2. In development, defaults to `http://localhost:8000` if unset for frictionless local DX.
 * 3. In production, warns and falls back to window.location.origin if completely unset.
 */

function sanitizeBaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl || !rawUrl.trim()) {
    if (import.meta.env.DEV) {
      return "http://localhost:8000";
    }
    // In production without an explicit API base URL, use empty string for relative proxying
    // or log a diagnostic warning for host misconfigurations.
    if (typeof window !== "undefined") {
      console.warn(
        "[StockSense ENV] VITE_API_BASE_URL is not defined in production. Requests will be relative to host."
      );
    }
    return "";
  }

  // Trim whitespace and remove trailing slashes (e.g. "https://api.example.com/" -> "https://api.example.com")
  return rawUrl.trim().replace(/\/+$/, "");
}

export const ENV = {
  API_BASE_URL: sanitizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  IS_PROD: import.meta.env.PROD,
  IS_DEV: import.meta.env.DEV,
  MODE: import.meta.env.MODE,
} as const;

