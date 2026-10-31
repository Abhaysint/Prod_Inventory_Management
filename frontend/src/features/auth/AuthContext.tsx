import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getMeApi, loginApi } from "@/api/auth";
import type { LoginCredentials } from "@/api/auth";
import { TOKEN_STORAGE_KEY, setUnauthorizedHandler } from "@/api/client";
import { queryClient } from "@/lib/queryClient";
import type { UserRead } from "@/types/api";
import { AuthContext } from "./auth-context";
import type { AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [user, setUser] = useState<UserRead | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    () => localStorage.getItem(TOKEN_STORAGE_KEY) !== null
  );
  const fetchedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      fetchedTokenRef.current = null;
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (fetchedTokenRef.current === token) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getMeApi()
      .then((me) => {
        fetchedTokenRef.current = token;
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        fetchedTokenRef.current = null;
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const { access_token } = await loginApi(credentials);
      localStorage.setItem(TOKEN_STORAGE_KEY, access_token);
      const me = await getMeApi();
      fetchedTokenRef.current = access_token;
      setUser(me);
      setToken(access_token);
      setIsLoading(false);
    } catch (error) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    queryClient.clear();
    fetchedTokenRef.current = null;
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value: AuthContextValue = {
    token,
    user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
