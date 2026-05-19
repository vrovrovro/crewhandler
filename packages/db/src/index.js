import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const createSupabaseAdmin = () => createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
export const createSupabaseUserClient = (accessToken) => createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
    global: {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    },
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
