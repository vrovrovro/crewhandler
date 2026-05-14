import type { FastifyReply, FastifyRequest } from "fastify";
import { createSupabaseAdmin } from "@acme/db";
import { hasPermission, type Permission, type UserRole } from "@acme/shared";

export interface AuthUser {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

const admin = createSupabaseAdmin();
const AUTH_CACHE_TTL_MS = 60_000;
const authCache = new Map<
  string,
  {
    user: AuthUser;
    checkedAt: number;
  }
>();

export const setCachedAuthUser = (accessToken: string, user: AuthUser) => {
  authCache.set(accessToken, {
    user,
    checkedAt: Date.now(),
  });
};

export const clearCachedAuthUser = (accessToken: string) => {
  authCache.delete(accessToken);
};

export const authenticateSupabaseSession = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const authHeader = request.headers.authorization;
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return reply.unauthorized("Missing access token");
  }

  const { data: authData, error: authError } = await admin.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return reply.unauthorized("Invalid Supabase session");
  }

  request.user = {
    id: authData.user.id,
    organizationId: "",
    email: authData.user.email ?? "",
    fullName: String(
      authData.user.user_metadata?.full_name ??
        authData.user.user_metadata?.name ??
        authData.user.user_metadata?.display_name ??
        "",
    ),
    role: "OWNER",
  };

  return authData.user;
};

export const authenticateRequest = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return reply.unauthorized("Missing access token");
  }

  const cached = authCache.get(accessToken);
  if (cached && Date.now() - cached.checkedAt < AUTH_CACHE_TTL_MS) {
    request.user = cached.user;
    return;
  }

  const user = await authenticateSupabaseSession(request, reply);
  if (!user) {
    return;
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, default_organization_id, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    return reply.forbidden("Inactive or missing profile");
  }

  const memberQuery = admin
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const { data: memberships, error: membershipError } = await memberQuery;
  if (membershipError || !memberships?.length) {
    return reply.forbidden("No organization membership found");
  }

  const selectedMembership =
    memberships.find((membership) => membership.organization_id === profile.default_organization_id) ??
    memberships[0];

  if (!selectedMembership) {
    return reply.forbidden("No organization membership found");
  }

  const resolvedUser = {
    id: user.id,
    organizationId: selectedMembership.organization_id,
    email: user.email ?? "",
    fullName: profile.full_name,
    role: selectedMembership.role as UserRole,
  };

  request.user = resolvedUser;
  authCache.set(accessToken, {
    user: resolvedUser,
    checkedAt: Date.now(),
  });
};

export const requirePermission =
  (permission: Permission) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthUser | undefined;

    if (!user || !hasPermission(user.role, permission)) {
      return reply.forbidden("You do not have permission to perform this action.");
    }
  };
