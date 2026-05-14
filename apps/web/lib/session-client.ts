"use client";

import { supabaseBrowser } from "./supabase-browser";

export const getAccessToken = async () => {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? null;
};

export const getCurrentUserEmail = async () => {
  const { data } = await supabaseBrowser.auth.getUser();
  return data.user?.email ?? null;
};
