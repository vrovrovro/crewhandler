import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const createSupabaseAdmin = () =>
  createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

export const createSupabaseUserClient = (accessToken: string) =>
  createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
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

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "OWNER" | "ADMIN" | "USER";
          created_at: string;
        };
      };
      organization_invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: "ADMIN" | "USER";
          status: "PENDING" | "ACCEPTED" | "REVOKED";
          invited_by: string;
          accepted_at: string | null;
          created_at: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          default_organization_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      clients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      interventions: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          assigned_technician_id: string | null;
          title: string;
          description: string | null;
          status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
          priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
          scheduled_at: string | null;
          due_date: string | null;
          location: string | null;
          notes: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}
