import { apiEvents } from "@/lib/apiEvents";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Patch global fetch to always send credentials (cookie-based auth)
// and strip stale Authorization headers from localStorage
if (typeof window !== 'undefined') {
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    init = { ...init, credentials: 'include' };
    if (init.headers) {
      const h = init.headers as Record<string, string>;
      if (h['Authorization']?.includes('null') || h['authorization']?.includes('null')) {
        delete h['Authorization'];
        delete h['authorization'];
      }
    }
    return origFetch(input, init);
  };
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T = unknown>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem("seum_user");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Session expired. Please log in again.", [], 401);
  }

  const data = await res.json();

  if (!data.success) {
    const errMsg = data.error?.message || data.message || "Request failed";
    apiEvents.emitError({ message: errMsg, status: res.status, details: data.error?.details || data.errors });
    throw new ApiError(
      errMsg,
      data.error?.details || data.errors,
      res.status
    );
  }

  return data.data as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public details?: unknown[],
    public status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: "POST", body }),
  patch: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: "PATCH", body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};

export { API_URL };
