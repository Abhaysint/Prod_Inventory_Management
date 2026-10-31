import { apiClient } from "@/api/client";
import type { Token, UserRead } from "@/types/api";

export interface LoginCredentials {
  username: string;
  password: string;
}

export async function loginApi(credentials: LoginCredentials): Promise<Token> {
  const body = new URLSearchParams({
    username: credentials.username,
    password: credentials.password,
  });

  const { data } = await apiClient.post<Token>("/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}

export async function getMeApi(): Promise<UserRead> {
  const { data } = await apiClient.get<UserRead>("/auth/me");
  return data;
}
