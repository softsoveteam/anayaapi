import { User } from "./types";

function resolveApiUrl() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
  try {
    const url = new URL(raw);
    if (url.hostname === "api-v1-anaya.softsove.life" && !url.pathname.includes("index.php")) {
      return `${url.origin}/index.php/api`;
    }
  } catch {
    // keep raw
  }
  return raw;
}

const API_URL = resolveApiUrl();
const TOKEN_KEY = "anaya_token";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function firstError(data: unknown, fallback = "Request failed") {
  if (data && typeof data === "object") {
    const obj = data as { message?: string; errors?: Record<string, string[]> };
    const first = obj.errors && Object.values(obj.errors)[0]?.[0];
    return first || obj.message || fallback;
  }
  return fallback;
}

export function errorMessage(err: unknown, fallback = "Request failed") {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message;
  return firstError(err, fallback);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !path.includes("/auth/login")) {
    setToken(null);
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    throw new ApiError(firstError(data), res.status, data);
  }

  return data as T;
}

export async function downloadFile(path: string, filename: string) {
  const token = getToken();
  const headers: Record<string, string> = { Accept: "application/pdf" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(firstError(data, "Download failed"), res.status, data);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const authApi = {
  login: (unique_id: string, password: string) =>
    api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ unique_id, password }),
    }),
  me: () => api<{ user: User }>("/auth/me"),
  logout: () => api<{ message: string }>("/auth/logout", { method: "POST" }),
  password: (payload: { current_password: string; password: string; password_confirmation: string }) =>
    api<{ message: string }>("/auth/password", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  profile: (payload: { name?: string; current_password: string }) =>
    api<{ message: string; user: User }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
