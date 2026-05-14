"use client";

import { authContracts, createApiClient, settingsContracts, type UserRole } from "@acme/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { setCachedAuthState } from "../../../lib/auth-state";
import { supabaseBrowser } from "../../../lib/supabase-browser";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const getApi = (accessToken?: string | null) =>
  createApiClient({
    baseUrl: apiBaseUrl,
    getAccessToken: () => accessToken ?? null,
  });

type PublicInvitation = {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: UserRole;
};

const sanitizeInviteUrl = (invitationId: string | null) => {
  if (typeof window === "undefined") return;
  const nextUrl = new URL(`${window.location.origin}/invite`);
  if (invitationId) {
    nextUrl.searchParams.set("invitation", invitationId);
  }
  window.history.replaceState({}, "", nextUrl.toString());
};

const hydrateInviteSessionFromUrl = async (invitationId: string | null) => {
  if (typeof window === "undefined") {
    return { error: null };
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
    sanitizeInviteUrl(invitationId);
    return { error: error?.message ?? null, inviteSessionCreated: true };
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error } = await supabaseBrowser.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    sanitizeInviteUrl(invitationId);
    return { error: error?.message ?? null, inviteSessionCreated: true };
  }

  const errorDescription = url.searchParams.get("error_description");
  return {
    error: errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, " ")) : null,
    inviteSessionCreated: false,
  };
};

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitation");
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!invitationId) {
        setAuthError("Invitation link is missing the invitation identifier.");
        setReady(true);
        return;
      }

      const callbackState = await hydrateInviteSessionFromUrl(invitationId);
      if (cancelled) return;
      if (callbackState.error) {
        setAuthError(callbackState.error);
      }
      setRequiresPasswordSetup(Boolean(callbackState.inviteSessionCreated));

      try {
        const publicApi = getApi();
        const invite = await publicApi.request(authContracts.invitation, {
          pathParams: { invitationId },
        });

        if (cancelled) return;
        setInvitation(invite);
      } catch (error) {
        if (cancelled) return;
        setAuthError(error instanceof Error ? error.message : "Unable to load invitation.");
      }

      const { data } = await supabaseBrowser.auth.getSession();
      if (cancelled) return;

      setSessionEmail(data.session?.user.email?.toLowerCase() ?? null);
      setReady(true);
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [invitationId]);

  const invitationMatchesSession =
    invitation?.email && sessionEmail ? invitation.email.toLowerCase() === sessionEmail.toLowerCase() : false;

  const redirectTo = useMemo(
    () => (invitationId ? `/invite?invitation=${encodeURIComponent(invitationId)}` : "/invite"),
    [invitationId],
  );

  const enterWorkspace = async (role: UserRole) => {
    const { data } = await supabaseBrowser.auth.refreshSession();
    const session = data.session;

    if (!session) {
      router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    setCachedAuthState({
      kind: "complete",
      session,
      email: session.user.email ?? null,
      role,
      checkedAt: Date.now(),
      accessToken: session.access_token,
    });

    router.replace(role === "USER" ? "/interventions" : "/dashboard");
  };

  const acceptAsExistingUser = async () => {
    if (!invitation) return;

    setLoading(true);
    setFormError(null);

    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      await getApi(session.access_token).request(settingsContracts.acceptInvitation, {
        body: { invitationId: invitation.id },
      });

      await enterWorkspace(invitation.role);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to join workspace.");
    } finally {
      setLoading(false);
    }
  };

  const acceptFromInviteSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitation) return;

    setFormError(null);
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
        return;
      }

      const { error } = await supabaseBrowser.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      await getApi(session.access_token).request(settingsContracts.acceptInvitation, {
        body: { invitationId: invitation.id },
      });

      await enterWorkspace(invitation.role);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to accept invitation.");
    } finally {
      setLoading(false);
    }
  };

  const acceptAsNewUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitation) return;

    setFormError(null);
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const publicApi = getApi();
      await publicApi.request(authContracts.acceptInvitationWithPassword, {
        pathParams: { invitationId: invitation.id },
        body: { password },
      });

      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

      if (error) {
        throw error;
      }

      await enterWorkspace(invitation.role);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to accept invitation.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="panel w-full max-w-lg rounded-[32px] p-6 sm:p-8">
          <p className="text-sm text-slate-500">Preparing your workspace invitation...</p>
        </div>
      </div>
    );
  }

  const wrongAccountSignedIn =
    Boolean(sessionEmail) && Boolean(invitation?.email) && sessionEmail !== invitation?.email.toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="panel w-full max-w-lg space-y-5 rounded-[32px] p-6 sm:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Workspace invitation</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">
            {invitation ? `Join ${invitation.organizationName}` : "Invitation unavailable"}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            {invitation
              ? "Set a password once and we’ll add you straight into the invited workspace."
              : "We couldn’t load this invitation. It may have expired or already been accepted."}
          </p>
        </div>

        {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
        {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

        {invitation ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">Invitation details</p>
              <p className="text-sm text-slate-600">
                Role: <span className="font-semibold">{invitation.role.toLowerCase()}</span>
              </p>
            </div>

            <div className="mt-4">
              <label className="block space-y-2 text-sm">
                <span>Email</span>
                <input
                  value={invitation.email}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500"
                />
              </label>
            </div>

            {wrongAccountSignedIn ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-amber-700">
                  You are signed in as <span className="font-semibold">{sessionEmail}</span>. Sign out and continue
                  with <span className="font-semibold">{invitation.email}</span>.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await supabaseBrowser.auth.signOut();
                    setSessionEmail(null);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900"
                >
                  Sign out and continue
                </button>
              </div>
            ) : invitationMatchesSession && !requiresPasswordSetup ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600">
                  You’re already authenticated with the invited email. Join the workspace directly.
                </p>
                <button
                  type="button"
                  onClick={acceptAsExistingUser}
                  disabled={loading}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                >
                  {loading ? "Joining..." : "Join workspace"}
                </button>
              </div>
            ) : invitationMatchesSession && requiresPasswordSetup ? (
              <form onSubmit={acceptFromInviteSession} className="mt-4 space-y-4">
                <label className="block space-y-2 text-sm">
                  <span>Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                >
                  {loading ? "Setting up your access..." : "Set password and join workspace"}
                </button>
              </form>
            ) : sessionEmail ? null : (
              <form onSubmit={acceptAsNewUser} className="mt-4 space-y-4">
                <label className="block space-y-2 text-sm">
                  <span>Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white"
                >
                  {loading ? "Setting up your access..." : "Set password and join workspace"}
                </button>
                <p className="text-sm text-slate-500">
                  Already have an account for this email?{" "}
                  <Link
                    href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
                    className="font-medium text-slate-900 underline"
                  >
                    Sign in instead
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
