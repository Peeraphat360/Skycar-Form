import { apiFetch, API_URL } from "./client";

export interface AuthUser {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string | null;
  email?: string | null;
}

// Calls GET /api/auth/me. Returns null when not logged in (401) instead of throwing.
export async function getMe(): Promise<AuthUser | null> {
  try {
    const res = await apiFetch<{ success: boolean; user: AuthUser }>("/api/auth/me");
    return res.user ?? null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}

// LINE login is a server-side OAuth redirect, so the browser must navigate
// to the backend (an XHR/fetch can't follow the cross-origin OAuth handshake).
export function lineLoginUrl(): string {
  return `${API_URL}/api/auth/line`;
}
