// Centralized fetch wrapper — the equivalent of an axios interceptor.
// Responsibilities:
//   • always send the session cookie (credentials: "include")
//   • set JSON headers
//   • on 401, broadcast an event so AuthContext can clear the local session
//   • normalize errors into ApiError

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Dispatched on any 401 response. AuthContext listens and clears `user`.
export const UNAUTHORIZED_EVENT = "skycar:unauthorized";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    // Send/receive the skycar.sid session cookie cross-origin.
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    // Let the app know the session is gone (interceptor-style side effect).
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      body?.error || body?.message || res.statusText || "Request failed";
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export { API_URL };
