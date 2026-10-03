import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

export type AdminRole = "owner" | "manager" | "editor" | "viewer";

export type AdminSession =
  | { status: "anonymous" }
  | { status: "forbidden"; email: string | undefined }
  | {
      status: "admin";
      userId: string;
      email: string | undefined;
      storeId: string;
      role: AdminRole;
      displayName: string | null;
    };

/**
 * Resolves who is calling, on the server. `getUser()` validates the token with
 * the Supabase Auth server (unlike `getSession()`, which only reads cookies),
 * so this is safe to base authorization on. An admin must also belong to the
 * store this deployment serves.
 */
export const getAdminSession = cache(async (): Promise<AdminSession> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "anonymous" };

  const [{ data: profile }, store] = await Promise.all([
    supabase
      .from("admin_profiles")
      .select("store_id, role, display_name")
      .eq("id", user.id)
      .maybeSingle(),
    getCurrentStore(),
  ]);

  if (!profile || profile.store_id !== store.id) {
    return { status: "forbidden", email: user.email };
  }

  return {
    status: "admin",
    userId: user.id,
    email: user.email,
    storeId: profile.store_id,
    role: profile.role as AdminRole,
    displayName: profile.display_name,
  };
});

/**
 * Guard for admin pages and actions. Anonymous visitors go through the session
 * refresh page first (an expired access token looks anonymous on the server,
 * and only the browser can refresh it); signed-in non-admins go to login.
 */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (session.status === "anonymous") redirect("/admin/refresh");
  if (session.status === "forbidden") redirect("/admin/login?error=forbidden");
  return session;
}

/** Pages only the owner may open (managing the team). */
export async function requireOwner() {
  const session = await requireAdmin();
  if (session.role !== "owner") redirect("/admin?error=owner_only");
  return session;
}

const EDIT_ROLES: AdminRole[] = ["owner", "manager", "editor"];

/** Like requireAdmin(), but for writes: read-only `viewer` accounts are refused. */
export async function requireEditor() {
  const session = await requireAdmin();
  if (!EDIT_ROLES.includes(session.role)) redirect("/admin?error=read_only");
  return session;
}
