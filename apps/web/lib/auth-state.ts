"use client";

import type { Session } from "@supabase/supabase-js";
import { authContracts, createApiClient, type UserRole } from "@acme/shared";
import { supabaseBrowser } from "./supabase-browser";

type AuthState =
  | {
      kind: "guest";
      session: null;
      email: null;
      role: null;
      checkedAt: number;
      accessToken: null;
    }
  | {
      kind: "complete" | "incomplete";
      session: Session;
      email: string | null;
      role: UserRole | null;
      checkedAt: number;
      accessToken: string;
    };

const AUTH_STATE_TTL_MS = 300_000;
const STORAGE_KEY = "auth-state-cache";

let cachedAuthState: AuthState | null = null;

const createAuthedApi = (accessToken: string) =>
  createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    getAccessToken: () => accessToken,
  });

export const invalidateAuthState = () => {
  cachedAuthState = null;
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
};

export const peekAuthState = () => cachedAuthState;

export const setCachedAuthState = (state: AuthState) => {
  cachedAuthState = state;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        kind: state.kind,
        email: state.email,
        role: state.role,
        checkedAt: state.checkedAt,
        accessToken: state.accessToken,
      }),
    );
  }
};

const readStoredAuthState = (accessToken: string): AuthState | null => {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      kind: AuthState["kind"];
      email: string | null;
      role: UserRole | null;
      checkedAt: number;
      accessToken: string | null;
    };

    if (
      parsed.accessToken !== accessToken ||
      Date.now() - parsed.checkedAt >= AUTH_STATE_TTL_MS ||
      parsed.kind === "guest"
    ) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      kind: parsed.kind === "complete" ? "complete" : "incomplete",
      session: null as never,
      email: parsed.email,
      role: parsed.role,
      checkedAt: parsed.checkedAt,
      accessToken,
    } as AuthState;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const inferAuthStateFromSession = (session: Session): AuthState | null => {
  const workspaceComplete = session.user.app_metadata?.workspace_complete === true;
  const workspaceRole =
    (session.user.app_metadata?.workspace_role as UserRole | undefined) ??
    (workspaceComplete ? "ADMIN" : null);
  if (workspaceComplete) {
    return {
      kind: "complete",
      session,
      email: session.user.email ?? null,
      role: workspaceRole,
      checkedAt: Date.now(),
      accessToken: session.access_token,
    };
  }

  if (session.user.app_metadata?.workspace_complete === false) {
    return {
      kind: "incomplete",
      session,
      email: session.user.email ?? null,
      role: workspaceRole,
      checkedAt: Date.now(),
      accessToken: session.access_token,
    };
  }

  return null;
};

export const resolveAuthState = async (force = false): Promise<AuthState> => {
  const { data } = await supabaseBrowser.auth.getSession();
  const session = data.session;

  if (!session) {
    const guestState: AuthState = {
      kind: "guest",
      session: null,
      email: null,
      role: null,
      checkedAt: Date.now(),
      accessToken: null,
    };
    setCachedAuthState(guestState);
    return guestState;
  }

  const storedState = readStoredAuthState(session.access_token);
  if (storedState?.kind === "complete") {
    const hydratedState = { ...storedState, session } as AuthState;
    cachedAuthState = hydratedState;
    return hydratedState;
  }

  if (
    !force &&
    cachedAuthState?.kind === "complete" &&
    cachedAuthState.accessToken === session.access_token &&
    Date.now() - cachedAuthState.checkedAt < AUTH_STATE_TTL_MS
  ) {
    return cachedAuthState;
  }

  const inferredState = inferAuthStateFromSession(session);
  if (inferredState) {
    setCachedAuthState(inferredState);
    return inferredState;
  }

  if (storedState) {
    const hydratedState = { ...storedState, session } as AuthState;
    cachedAuthState = hydratedState;
    return hydratedState;
  }

  if (
    !force &&
    cachedAuthState &&
    cachedAuthState.accessToken === session.access_token &&
    Date.now() - cachedAuthState.checkedAt < AUTH_STATE_TTL_MS
  ) {
    return cachedAuthState;
  }

  const api = createAuthedApi(session.access_token);

  try {
    await api.request(authContracts.me);
    const completeState: AuthState = {
      kind: "complete",
      session,
      email: session.user.email ?? null,
      role: ((session.user.app_metadata?.workspace_role as UserRole | undefined) ?? "ADMIN"),
      checkedAt: Date.now(),
      accessToken: session.access_token,
    };
    setCachedAuthState(completeState);
    return completeState;
  } catch {
    const incompleteState: AuthState = {
      kind: "incomplete",
      session,
      email: session.user.email ?? null,
      role: ((session.user.app_metadata?.workspace_role as UserRole | undefined) ?? null),
      checkedAt: Date.now(),
      accessToken: session.access_token,
    };
    setCachedAuthState(incompleteState);
    return incompleteState;
  }
};
