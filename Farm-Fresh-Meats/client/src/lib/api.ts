import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function getAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (session?.access_token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || "Request failed");
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || "Request failed");
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || "Request failed");
  }
  return res.json();
}

export type AppUser = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

export async function fetchUsers(): Promise<AppUser[]> {
  return apiGet<AppUser[]>("/api/users");
}

export async function inviteUser(body: {
  email: string;
  role?: string;
  temporaryPassword?: string;
}): Promise<{ user: AppUser; message: string; temporaryPassword?: string }> {
  return apiPost("/api/users/invite", body);
}

export async function updateUserRole(
  id: string,
  role: string
): Promise<{ id: string; email: string; role: string }> {
  return apiPatch(`/api/users/${id}`, { role });
}

export async function mfaDisable(): Promise<{ ok: boolean; mfaDisabled: true }> {
  return apiPost("/api/me/mfa-disable", {});
}

export async function mfaEnable(): Promise<{ ok: boolean; mfaDisabled: false }> {
  return apiPost("/api/me/mfa-enable", {});
}
