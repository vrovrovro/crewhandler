"use client";

import { authContracts, createApiClient } from "@acme/shared";
import { supabaseBrowser } from "./supabase-browser";
import { peekAuthState, resolveAuthState } from "./auth-state";
import { getAccessToken } from "./session-client";

export type WorkspaceRole = "OWNER" | "ADMIN" | "USER";

export interface ActiveWorkspaceContext {
  userId: string;
  organizationId: string;
  role: WorkspaceRole;
}

const createAuthedApi = async () => {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("No active session");
  }

  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    getAccessToken: () => accessToken,
  });
};

export const getActiveWorkspaceContext = async (): Promise<ActiveWorkspaceContext> => {
  try {
    const api = await createAuthedApi();
    const me = await api.request(authContracts.me);

    return {
      userId: me.id,
      organizationId: me.organizationId,
      role: me.role as WorkspaceRole,
    };
  } catch {
    // Fall back to session/profile resolution when the API context is unavailable.
  }

  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  const cachedAuthState = peekAuthState();

  if (session?.user) {
    const metadataOrganizationId =
      typeof session.user.app_metadata?.default_organization_id === "string"
        ? session.user.app_metadata.default_organization_id
        : null;
    const metadataRole =
      session.user.app_metadata?.workspace_role === "OWNER" ||
      session.user.app_metadata?.workspace_role === "ADMIN" ||
      session.user.app_metadata?.workspace_role === "USER"
        ? session.user.app_metadata.workspace_role
        : null;

    if (metadataOrganizationId && metadataRole) {
      return {
        userId: session.user.id,
        organizationId: metadataOrganizationId,
        role: metadataRole,
      };
    }
  }

  const resolvedAuthState = await resolveAuthState();

  if (session?.user && resolvedAuthState.kind !== "guest" && resolvedAuthState.role) {
    const metadataOrganizationId =
      typeof session.user.app_metadata?.default_organization_id === "string"
        ? session.user.app_metadata.default_organization_id
        : null;

    if (metadataOrganizationId) {
      return {
        userId: session.user.id,
        organizationId: metadataOrganizationId,
        role: resolvedAuthState.role,
      };
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseBrowser.auth.getUser();

  if (userError || !user) {
    throw new Error("No active session");
  }

  const fallbackOrganizationId =
    typeof user.app_metadata?.default_organization_id === "string"
      ? user.app_metadata.default_organization_id
      : null;
  const fallbackRole =
    user.app_metadata?.workspace_role === "OWNER" ||
    user.app_metadata?.workspace_role === "ADMIN" ||
    user.app_metadata?.workspace_role === "USER"
      ? user.app_metadata.workspace_role
      : cachedAuthState?.role ?? null;

  if (fallbackOrganizationId && fallbackRole) {
    return {
      userId: user.id,
      organizationId: fallbackOrganizationId,
      role: fallbackRole,
    };
  }

  const { data: profile, error: profileError } = await supabaseBrowser
    .from("profiles")
    .select("default_organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.default_organization_id) {
    throw new Error("No active workspace selected");
  }

  const { data: membership, error: membershipError } = await supabaseBrowser
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", profile.default_organization_id)
    .single();

  if (membershipError || !membership?.role) {
    throw new Error("Workspace membership not found");
  }

  return {
    userId: user.id,
    organizationId: profile.default_organization_id,
    role: membership.role as WorkspaceRole,
  };
};
