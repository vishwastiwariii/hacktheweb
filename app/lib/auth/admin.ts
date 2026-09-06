import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";

// For route handlers / server actions: throws, caller maps to a status code.
export async function requireAdmin() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized User")
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, github_username, is_admin")
        .eq("id", user.id)
        .maybeSingle()

    if (profileError) {
        throw new Error("Profile not found")
    }

    if (!profile?.is_admin) {
        throw new Error("Not an Admin")
    }

    return { supabase, user, profile }
}

// For pages / layouts: redirects instead of throwing. `/admin/*` is gated by
// app/admin/layout.tsx, but pages call this too so each is self-guarding.
// A missing profile row should not happen (see the profiles_auto_provision
// migration) but is treated as "not an admin".
export async function requireAdminPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle()

    if (!profile?.is_admin) {
        redirect("/dashboard")
    }

    return { supabase, user }
}
