// Centralized fetch wrapper — the equivalent of an axios interceptor.
// Responsibilities:
//   • always send the session cookie (credentials: "include")
//   • set JSON headers
//   • on 401, broadcast an event so AuthContext can clear the local session
//   • normalize errors into ApiError with timeout protection
//   • support HTTP keepalive and custom timeout (default 12s)

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

export interface ApiOptions extends RequestInit {
  timeout?: number;
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { timeout = 12000, ...fetchOptions } = options;

  // Setup abort controller with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // If the caller provided a signal, link it
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      // Send/receive the skycar.sid session cookie cross-origin.
      credentials: "include",
      keepalive: true,
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
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
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new ApiError("การเชื่อมต่อหมดเวลา (Request timed out)", 408);
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || "Network error", 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

export { API_URL };
