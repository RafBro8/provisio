import { apiRequest } from "./client";
import type { User, UserRole } from "./types";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function register(payload: RegisterPayload): Promise<{ user: User }> {
  return apiRequest<{ user: User }>("/auth/register", { method: "POST", body: payload });
}

export function login(payload: LoginPayload): Promise<{ user: User }> {
  return apiRequest<{ user: User }>("/auth/login", { method: "POST", body: payload });
}

export function logout(): Promise<void> {
  return apiRequest<void>("/auth/logout", { method: "POST" });
}

export function getMe(): Promise<{ user: User }> {
  return apiRequest<{ user: User }>("/auth/me");
}
