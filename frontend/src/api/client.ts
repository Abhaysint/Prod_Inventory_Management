import axios from "axios";
import { queryClient } from "@/lib/queryClient";

export const TOKEN_STORAGE_KEY = "stocksense_token";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
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
      const isLoginRequest = originalRequestUrl.includes("/auth/login");

      if (!isLoginRequest) {
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
