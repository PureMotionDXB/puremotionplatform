import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Cookie-backed client (not localStorage) so proxy.ts can read the
// session server-side to gate /admin/*.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
