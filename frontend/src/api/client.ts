import axios from "axios";
import { queryClient } from "@/lib/queryClient";
import { ENV } from "@/lib/env";
import { API_ENDPOINTS } from "@/api/endpoints";

export const TOKEN_STORAGE_KEY = "stocksense_token";

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401, clear token, clear query cache, redirect to /login
// Guard against redirect loops when the failing request is the login call
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const originalRequestUrl = error.config?.url || "";
      const isLoginRequest = originalRequestUrl.includes(API_ENDPOINTS.auth.login);

      if (!isLoginRequest) {
        unauthorizedHandler?.();
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        queryClient.clear();

        // Redirect to /login if not already on the login page
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          const currentPath = window.location.pathname + window.location.search;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);
