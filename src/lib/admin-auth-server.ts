import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type StaffAuthResult =
  | { ok: true; supabase: ReturnType<typeof createServerClient>; userId: string }
  | { ok: false; status: number; error: string };

// Identifies the caller from their own session cookies and confirms
// they're staff admin/owner — same pattern as create-session/route.ts,
// never trusting a client-supplied role. Used by the new admin
// package-management API routes, the first admin screens in this
// codebase that call out to an external API (Stripe) from the server.
export async function requireStaffAdmin(): Promise<StaffAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, status: 501, error: "Not configured" };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Not signed in" };

  const { data: staff, error } = await supabase
    .from("staff")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!staff || (staff.role !== "admin" && staff.role !== "owner")) {
    return { ok: false, status: 403, error: "Not authorized" };
  }

  return { ok: true, supabase, userId: user.id };
}
