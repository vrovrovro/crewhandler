import type { FastifyInstance } from "fastify";
import { createSupabaseAdmin } from "@acme/db";
import { authContracts, settingsContracts, type UserRole } from "@acme/shared";
import { authenticateSupabaseSession, setCachedAuthUser } from "../../lib/auth.js";

const admin = createSupabaseAdmin();

const formatNameFromEmail = (email: string) =>
  (email.split("@")[0] ?? email)
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getPendingInvitationById = async (invitationId: string) => {
  const { data: invitation, error } = await admin
    .from("organization_invitations")
    .select("id, organization_id, email, role, status, organizations(name)")
    .eq("id", invitationId)
    .eq("status", "PENDING")
    .single();

  if (error || !invitation) {
    return null;
  }

  return {
    id: String(invitation.id),
    organizationId: String(invitation.organization_id),
    organizationName: String((invitation.organizations as { name?: string } | null)?.name ?? "Workspace"),
    email: String(invitation.email),
    role: invitation.role as UserRole,
  };
};

const findAuthUserByEmail = async (email: string) => {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      return found;
    }

    if (data.users.length < 200) {
      break;
    }
  }

  return null;
};

const upsertMembershipAndProfile = async ({
  userId,
  email,
  fullName,
  organizationId,
  role,
}: {
  userId: string;
  email: string;
  fullName: string;
  organizationId: string;
  role: UserRole;
}) => {
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    default_organization_id: organizationId,
    is_active: true,
  });

  if (profileError) throw profileError;

  const { error: membershipError } = await admin.from("organization_members").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      role,
    },
    { onConflict: "organization_id,user_id" },
  );

  if (membershipError) throw membershipError;

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
    app_metadata: {
      workspace_complete: true,
      default_organization_id: organizationId,
      workspace_role: role,
    },
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authUpdateError) throw authUpdateError;

  return authContracts.me.response.parse({
    id: userId,
    organizationId,
    fullName,
    email,
    role,
  });
};

export const registerAuthRoutes = async (app: FastifyInstance) => {
  app.post(
    authContracts.bootstrap.path,
    {
      preHandler: [authenticateSupabaseSession],
    },
    async (request) => {
      const payload = authContracts.bootstrap.body!.parse(request.body);
      const slug = payload.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const fullName = request.user.fullName.trim() || formatNameFromEmail(request.user.email);

      const { data: organization, error: organizationError } = await admin
        .from("organizations")
        .insert({
          name: payload.organizationName,
          slug,
        })
        .select("*")
        .single();

      if (organizationError) throw organizationError;

      return upsertMembershipAndProfile({
        userId: request.user.id,
        email: request.user.email,
        fullName,
        organizationId: organization.id,
        role: "OWNER",
      });
    },
  );

  app.get(authContracts.me.path, { preHandler: [app.authenticate] }, async (request) => {
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", request.user.id).single();

    return authContracts.me.response.parse({
      id: request.user.id,
      organizationId: request.user.organizationId,
      fullName: profile?.full_name ?? request.user.fullName,
      email: request.user.email,
      role: request.user.role,
    });
  });

  app.get(authContracts.invitation.path, async (request, reply) => {
    const { invitationId } = request.params as { invitationId: string };
    const invitation = await getPendingInvitationById(invitationId);

    if (!invitation) {
      return reply.notFound("Invitation not found");
    }

    return authContracts.invitation.response.parse(invitation);
  });

  app.post(authContracts.acceptInvitationWithPassword.path, async (request, reply) => {
    const { invitationId } = request.params as { invitationId: string };
    const payload = authContracts.acceptInvitationWithPassword.body!.parse(request.body);
    const invitation = await getPendingInvitationById(invitationId);

    if (!invitation) {
      return reply.notFound("Invitation not found");
    }

    const existingUser = await findAuthUserByEmail(invitation.email);
    const fullName =
      String(existingUser?.user_metadata?.full_name ?? existingUser?.user_metadata?.name ?? "").trim() ||
      formatNameFromEmail(invitation.email);
    const existingUserIsInviteOnly =
      Boolean((existingUser as { invited_at?: string | null } | null)?.invited_at) &&
      !existingUser?.email_confirmed_at &&
      !existingUser?.last_sign_in_at;

    let authUserId = existingUser?.id;

    if (!authUserId) {
      const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
        email: invitation.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
        app_metadata: {
          workspace_complete: true,
          default_organization_id: invitation.organizationId,
          workspace_role: invitation.role,
        },
      });

      if (createUserError || !createdUser.user) {
        return reply.badRequest(createUserError?.message ?? "Unable to create invited user");
      }

      authUserId = createdUser.user.id;
    } else {
      if (!existingUserIsInviteOnly) {
        return reply.status(409).send({
          message: "An account already exists for this email. Sign in to join the workspace.",
        });
      }

      const { error: updateUserError } = await admin.auth.admin.updateUserById(authUserId, {
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
        app_metadata: {
          workspace_complete: true,
          default_organization_id: invitation.organizationId,
          workspace_role: invitation.role,
        },
      });

      if (updateUserError) {
        return reply.badRequest(updateUserError.message);
      }
    }

    const response = await upsertMembershipAndProfile({
      userId: authUserId,
      email: invitation.email,
      fullName,
      organizationId: invitation.organizationId,
      role: invitation.role,
    });

    const { error: inviteUpdateError } = await admin
      .from("organization_invitations")
      .update({
        status: "ACCEPTED",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (inviteUpdateError) throw inviteUpdateError;

    return response;
  });

  app.get(settingsContracts.pendingAccess.path, {
    preHandler: [authenticateSupabaseSession],
  }, async (request) => {
    const { data: invitation } = await admin
      .from("organization_invitations")
      .select("id, organization_id, email, role, organizations(name)")
      .eq("email", request.user.email)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invitation) {
      return settingsContracts.pendingAccess.response.parse({ invitation: null });
    }

    return settingsContracts.pendingAccess.response.parse({
      invitation: {
        id: String(invitation.id),
        organizationId: String(invitation.organization_id),
        organizationName: String((invitation.organizations as { name?: string } | null)?.name ?? "Workspace"),
        email: String(invitation.email),
        role: invitation.role,
      },
    });
  });

  app.post(settingsContracts.acceptInvitation.path, {
    preHandler: [authenticateSupabaseSession],
  }, async (request, reply) => {
    const payload = settingsContracts.acceptInvitation.body!.parse(request.body);

    const invitation = await getPendingInvitationById(payload.invitationId);
    if (!invitation || invitation.email.toLowerCase() !== request.user.email.toLowerCase()) {
      return reply.notFound("Invitation not found");
    }

    const response = await upsertMembershipAndProfile({
      userId: request.user.id,
      email: request.user.email,
      fullName: request.user.fullName.trim() || formatNameFromEmail(request.user.email),
      organizationId: invitation.organizationId,
      role: invitation.role,
    });

    const { error: inviteUpdateError } = await admin
      .from("organization_invitations")
      .update({
        status: "ACCEPTED",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (inviteUpdateError) throw inviteUpdateError;

    return settingsContracts.pendingAccess.response.parse({ invitation: null });
  });

  app.get(authContracts.workspaces.path, { preHandler: [app.authenticate] }, async (request) => {
    const { data: profile } = await admin
      .from("profiles")
      .select("default_organization_id")
      .eq("id", request.user.id)
      .single();

    const { data: memberships, error } = await admin
      .from("organization_members")
      .select("organization_id, role, organizations(name)")
      .eq("user_id", request.user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return authContracts.workspaces.response.parse({
      workspaces: (memberships ?? []).map((membership) => ({
        organizationId: String(membership.organization_id),
        organizationName: String((membership.organizations as { name?: string } | null)?.name ?? "Workspace"),
        role: membership.role,
        isDefault: membership.organization_id === profile?.default_organization_id,
      })),
    });
  });

  app.post(authContracts.switchWorkspace.path, { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = authContracts.switchWorkspace.body!.parse(request.body);
    const { data: membership, error } = await admin
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", request.user.id)
      .eq("organization_id", payload.organizationId)
      .single();

    if (error || !membership) {
      return reply.notFound("Workspace membership not found");
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        default_organization_id: payload.organizationId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.user.id);

    if (profileError) throw profileError;

    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", request.user.id).single();

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(request.user.id, {
      app_metadata: {
        workspace_complete: true,
        default_organization_id: payload.organizationId,
        workspace_role: membership.role,
      },
    });

    if (authUpdateError) throw authUpdateError;

    const response = authContracts.switchWorkspace.response.parse({
      id: request.user.id,
      organizationId: payload.organizationId,
      fullName: profile?.full_name ?? request.user.fullName,
      email: request.user.email,
      role: membership.role as UserRole,
    });

    const accessToken = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (accessToken) {
      setCachedAuthUser(accessToken, {
        id: response.id,
        organizationId: response.organizationId,
        email: response.email,
        fullName: response.fullName,
        role: response.role,
      });
    }

    return response;
  });
};
