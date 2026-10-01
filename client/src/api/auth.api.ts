import type { AuthAdmin, LoginResponse } from "../types/auth.types.js";
import { apiFetch } from "./client.js";

// Learn: auth.api owns the two auth endpoints. Components call these
// small functions instead of writing fetch + headers + URLs themselves.

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
};

export const getMe = async (): Promise<AuthAdmin> => {
  return apiFetch<AuthAdmin>("/api/auth/me");
};
