import type { FastifyInstance } from "fastify";
import { createSupabaseAdmin } from "@acme/db";
import { settingsContracts } from "@acme/shared";
import { env } from "../../lib/env.js";
import { requirePermission } from "../../lib/auth.js";

const admin = createSupabaseAdmin();

const sendInviteEmail = async (invitationId: string, email: string, role: "ADMIN" | "USER") => {
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${env.WEB_APP_URL}/invite?invitation=${encodeURIComponent(invitationId)}`,
    data: {
      workspace_role: role,
      invitation_id: invitationId,
    },
  });

  return error;
};

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "workspace";

const formatUsageLabel = (value: number) => value.toLocaleString("en-US");

const buildSecurityRecommendations = (authUser: {
  email_confirmed_at?: string | null;
  identities?: Array<{ provider?: string }> | null;
}) => {
  const providers = new Set((authUser.identities ?? []).map((identity) => identity.provider).filter(Boolean));
  const recommendations: string[] = [];

  if (!authUser.email_confirmed_at) {
    recommendations.push("Verify your email address to reduce account recovery friction.");
  }

  if (!providers.has("google")) {
    recommendations.push("Connect Google sign-in as a backup login method for your workspace.");
  }

  if (!recommendations.length) {
    recommendations.push("Your workspace authentication posture looks healthy.");
  }

  return recommendations;
};

const hydrateMember = async (member: {
  id: string;
  user_id: string;
  role: "OWNER" | "ADMIN" | "USER";
  created_at: string;
}) => {
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    admin.from("profiles").select("full_name, is_active").eq("id", member.user_id).single(),
    admin.auth.admin.getUserById(member.user_id),
  ]);

  return {
    id: String(member.id),
    userId: String(member.user_id),
    email: authUser.user?.email ?? "",
    fullName: profile?.full_name ?? authUser.user?.user_metadata?.full_name ?? "Team member",
    role: member.role,
    isActive: profile?.is_active ?? true,
    createdAt: String(member.created_at),
  };
};

const buildOverview = async (user: {
  id: string;
  organizationId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "USER";
}) => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [
    { data: organization },
    { data: profile },
    { data: members },
    { data: invitations },
    { count: jobsThisMonth = 0 },
    { count: attachmentCount = 0 },
    { count: activityCount = 0 },
    { data: authUserData },
  ] = await Promise.all([
    admin.from("organizations").select("id, name").eq("id", user.organizationId).single(),
    admin.from("profiles").select("full_name, phone").eq("id", user.id).single(),
    admin
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("organization_id", user.organizationId)
      .order("created_at", { ascending: true }),
    admin
      .from("organization_invitations")
      .select("*")
      .eq("organization_id", user.organizationId)
      .order("created_at", { ascending: false }),
    admin
      .from("interventions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", user.organizationId)
      .gte("created_at", monthStart),
    admin
      .from("job_attachments")
      .select("id", { count: "exact", head: true })
      .in(
        "intervention_id",
        (
          await admin
            .from("interventions")
            .select("id")
            .eq("organization_id", user.organizationId)
        ).data?.map((item) => item.id) ?? ["00000000-0000-0000-0000-000000000000"],
      ),
    admin
      .from("activity_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", user.organizationId)
      .gte("created_at", monthStart),
    admin.auth.admin.getUserById(user.id),
  ]);

  const resolvedJobsThisMonth = jobsThisMonth ?? 0;
  const resolvedAttachmentCount = attachmentCount ?? 0;
  const resolvedActivityCount = activityCount ?? 0;
  const approxStorageGb = resolvedAttachmentCount > 0 ? resolvedAttachmentCount * 0.015 : 0;
  const authUser = authUserData.user;
  const providers = new Set((authUser?.identities ?? []).map((identity) => identity.provider).filter(Boolean));

  return settingsContracts.overview.response.parse({
    organization: {
      id: String(organization?.id ?? user.organizationId),
      name: String(organization?.name ?? "Workspace"),
      plan: {
        name: "Growth",
        description: "Unlimited jobs and team collaboration with 100 GB of storage included.",
      },
      usage: {
        jobsThisMonth: {
          used: resolvedJobsThisMonth,
          usedLabel: formatUsageLabel(resolvedJobsThisMonth),
          limitLabel: "Unlimited",
        },
        teamMembers: {
          used: members?.length ?? 0,
          usedLabel: formatUsageLabel(members?.length ?? 0),
          limitLabel: "Unlimited",
        },
        storageUsed: {
          used: approxStorageGb,
          usedLabel: `${approxStorageGb.toFixed(1)} GB`,
          limitLabel: "100 GB",
        },
        apiCalls: {
          used: resolvedActivityCount,
          usedLabel: formatUsageLabel(resolvedActivityCount),
          limitLabel: "50,000",
        },
      },
      notifications: {
        email: {
          enabled: true,
          label: "Email notifications",
          description: "Important activity summaries, invitation emails, and billing notices are sent by email.",
        },
        sms: {
          enabled: false,
          label: "SMS notifications",
          description: "SMS and Twilio-based alerts are planned but not configured for this workspace yet.",
        },
      },
      integrations: [
        {
          name: "Supabase Storage",
          status: "CONNECTED",
          description: "Job photos and attachments are stored in your workspace bucket.",
        },
        {
          name: "Twilio",
          status: "AVAILABLE",
          description: "Configure SMS reminders and technician messaging once Twilio credentials are added.",
        },
        {
          name: "Google Calendar",
          status: "COMING_SOON",
          description: "Calendar sync is planned for dispatch and technician scheduling workflows.",
        },
      ],
      security: {
        emailVerified: Boolean(authUser?.email_confirmed_at),
        oauthEnabled: providers.has("google"),
        passwordEnabled: providers.has("email"),
        recommendedActions: buildSecurityRecommendations({
          email_confirmed_at: authUser?.email_confirmed_at,
          identities: authUser?.identities ?? null,
        }),
      },
    },
    profile: {
      fullName:
        profile?.full_name ??
        authUser?.user_metadata?.full_name ??
        authUser?.user_metadata?.name ??
        user.email.split("@")[0],
      email: user.email,
      phone: profile?.phone ?? null,
    },
    members:
      user.role === "USER"
        ? []
        : await Promise.all((members ?? []).map(hydrateMember)),
    invitations:
      user.role === "USER"
        ? []
        : (invitations ?? []).map((invite) => ({
            id: String(invite.id),
            email: String(invite.email),
            role: invite.role,
            status: invite.status,
            createdAt: String(invite.created_at),
            acceptedAt: invite.accepted_at ? String(invite.accepted_at) : null,
          })),
  });
};

export const registerSettingsRoutes = async (app: FastifyInstance) => {
  app.get(
    settingsContracts.overview.path,
    { preHandler: [app.authenticate, requirePermission("settings:read")] },
    async (request) => buildOverview(request.user),
  );

  app.post(
    settingsContracts.invite.path,
    { preHandler: [app.authenticate, requirePermission("settings:invite")] },
    async (request, reply) => {
      const payload = settingsContracts.invite.body!.parse(request.body);

      if (request.user.role === "ADMIN" && payload.role !== "USER") {
        return reply.forbidden("Admins can only invite common users.");
      }

      const { data: existingPending } = await admin
        .from("organization_invitations")
        .select("*")
        .eq("organization_id", request.user.organizationId)
        .eq("email", payload.email)
        .eq("status", "PENDING")
        .maybeSingle();

      if (existingPending) {
        const resendError = await sendInviteEmail(String(existingPending.id), payload.email, existingPending.role);
        if (resendError) {
          request.log.warn(
            { email: payload.email, error: resendError.message },
            "Invite email resend failed; using existing pending invitation instead",
          );
        }

        return settingsContracts.invite.response.parse({
          id: String(existingPending.id),
          email: String(existingPending.email),
          role: existingPending.role,
          status: existingPending.status,
          createdAt: String(existingPending.created_at),
          acceptedAt: existingPending.accepted_at ? String(existingPending.accepted_at) : null,
        });
      }

      const { data, error } = await admin
        .from("organization_invitations")
        .insert({
          organization_id: request.user.organizationId,
          email: payload.email,
          role: payload.role,
          invited_by: request.user.id,
          status: "PENDING",
        })
        .select("*")
        .single();

      if (error) throw error;

      const inviteError = await sendInviteEmail(String(data.id), payload.email, payload.role);
      if (inviteError) {
        request.log.warn(
          { invitationId: data.id, email: payload.email, error: inviteError.message },
          "Invite email delivery failed; keeping invitation active for link-based acceptance",
        );
      }

      return settingsContracts.invite.response.parse({
        id: String(data.id),
        email: String(data.email),
        role: data.role,
        status: data.status,
        createdAt: String(data.created_at),
        acceptedAt: data.accepted_at ? String(data.accepted_at) : null,
      });
    },
  );

  app.patch(
    settingsContracts.updateMemberRole.path,
    { preHandler: [app.authenticate, requirePermission("settings:updateRoles")] },
    async (request, reply) => {
      const payload = settingsContracts.updateMemberRole.body!.parse(request.body);
      const { memberId } = request.params as { memberId: string };

      const { data: existingMember, error: memberError } = await admin
        .from("organization_members")
        .select("*")
        .eq("id", memberId)
        .eq("organization_id", request.user.organizationId)
        .single();

      if (memberError || !existingMember) {
        return reply.notFound("Member not found");
      }

      if (existingMember.role === "OWNER") {
        return reply.forbidden("Owner role cannot be changed.");
      }

      if (request.user.role === "ADMIN" && payload.role !== "USER") {
        return reply.forbidden("Admins can only assign the user role.");
      }

      const { data, error } = await admin
        .from("organization_members")
        .update({ role: payload.role })
        .eq("id", memberId)
        .eq("organization_id", request.user.organizationId)
        .select("*")
        .single();

      if (error || !data) {
        return reply.notFound("Member not found");
      }

      await admin.auth.admin
        .updateUserById(String(data.user_id), {
          app_metadata: {
            workspace_complete: true,
            default_organization_id: request.user.organizationId,
            workspace_role: payload.role,
          },
        })
        .catch(() => undefined);

      return settingsContracts.updateMemberRole.response.parse(await hydrateMember(data));
    },
  );

  app.patch(
    settingsContracts.updateWorkspace.path,
    { preHandler: [app.authenticate, requirePermission("settings:updateWorkspace")] },
    async (request, reply) => {
      if (request.user.role !== "OWNER" && request.user.role !== "ADMIN") {
        return reply.forbidden("Only owners and admins can update workspace details.");
      }

      const payload = settingsContracts.updateWorkspace.body!.parse(request.body);
      const { data, error } = await admin
        .from("organizations")
        .update({
          name: payload.name,
          slug: normalizeSlug(payload.name),
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.user.organizationId)
        .select("id, name")
        .single();

      if (error || !data) {
        return reply.notFound("Workspace not found");
      }

      const overview = await buildOverview(request.user);
      return settingsContracts.updateWorkspace.response.parse(overview.organization);
    },
  );

  app.patch(
    settingsContracts.updateProfile.path,
    { preHandler: [app.authenticate, requirePermission("settings:updateProfile")] },
    async (request, reply) => {
      const payload = settingsContracts.updateProfile.body!.parse(request.body);
      const { data, error } = await admin
        .from("profiles")
        .update({
          full_name: payload.fullName,
          phone: payload.phone ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.user.id)
        .select("full_name, phone")
        .single();

      if (error || !data) {
        return reply.notFound("Profile not found");
      }

      await admin.auth.admin
        .updateUserById(request.user.id, {
          user_metadata: {
            full_name: payload.fullName,
          },
        })
        .catch(() => undefined);

      return settingsContracts.updateProfile.response.parse({
        fullName: data.full_name,
        email: request.user.email,
        phone: data.phone,
      });
    },
  );

  app.delete(
    "/settings/members/:memberId",
    { preHandler: [app.authenticate, requirePermission("settings:removeMembers")] },
    async (request, reply) => {
      const { memberId } = request.params as { memberId: string };

      const { data: member, error } = await admin
        .from("organization_members")
        .select("id, user_id, role, created_at")
        .eq("id", memberId)
        .eq("organization_id", request.user.organizationId)
        .single();

      if (error || !member) {
        return reply.notFound("Member not found");
      }

      if (member.role === "OWNER") {
        return reply.forbidden("Owners cannot be removed from the workspace.");
      }

      if (request.user.role === "ADMIN" && member.role !== "USER") {
        return reply.forbidden("Admins can only remove common users.");
      }

      const hydrated = await hydrateMember(member);

      const { error: deleteError } = await admin
        .from("organization_members")
        .delete()
        .eq("id", memberId)
        .eq("organization_id", request.user.organizationId);

      if (deleteError) throw deleteError;

      return settingsContracts.removeMember.response.parse(hydrated);
    },
  );

  app.delete(
    "/settings/invitations/:invitationId",
    { preHandler: [app.authenticate, requirePermission("settings:revokeInvitations")] },
    async (request, reply) => {
      const { invitationId } = request.params as { invitationId: string };

      const { data: invite, error } = await admin
        .from("organization_invitations")
        .update({ status: "REVOKED" })
        .eq("id", invitationId)
        .eq("organization_id", request.user.organizationId)
        .eq("status", "PENDING")
        .select("*")
        .single();

      if (error || !invite) {
        return reply.notFound("Invitation not found");
      }

      return settingsContracts.revokeInvitation.response.parse({
        id: String(invite.id),
        email: String(invite.email),
        role: invite.role,
        status: invite.status,
        createdAt: String(invite.created_at),
        acceptedAt: invite.accepted_at ? String(invite.accepted_at) : null,
      });
    },
  );

  app.delete(
    "/settings/workspace",
    { preHandler: [app.authenticate, requirePermission("settings:deleteWorkspace")] },
    async (request, reply) => {
      const payload = settingsContracts.deleteWorkspace.body!.parse(request.body);

      if (request.user.role !== "OWNER") {
        return reply.forbidden("Only the owner can delete the workspace.");
      }

      const { data: organization } = await admin
        .from("organizations")
        .select("id, name")
        .eq("id", request.user.organizationId)
        .single();

      if (!organization) {
        return reply.notFound("Workspace not found");
      }

      if (payload.confirmation.trim() !== String(organization.name)) {
        return reply.badRequest("Confirmation text must match the workspace name.");
      }

      const overview = await buildOverview(request.user);

      const { error } = await admin
        .from("organizations")
        .delete()
        .eq("id", request.user.organizationId);

      if (error) throw error;

      return settingsContracts.deleteWorkspace.response.parse(overview.organization);
    },
  );
};
