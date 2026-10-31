import { createContext } from "react";
import type { LoginCredentials } from "@/api/auth";
import type { UserRead } from "@/types/api";

export interface AuthContextValue {
  token: string | null;
  user: UserRead | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
