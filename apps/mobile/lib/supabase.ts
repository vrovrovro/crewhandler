import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

export const supabaseMobile = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);
