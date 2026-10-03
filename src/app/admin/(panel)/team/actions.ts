"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, isTeamRole } from "@/lib/team";

export type TeamResult =
  | "ok"
  | "not_owner"
  | "bad_role"
  | "user_not_found"
  | "belongs_elsewhere"
  | "self"
  | "not_found"
  | "invalid_email"
  | "failed";

const KNOWN: readonly string[] = ["ok", "not_owner", "bad_role", "user_not_found", "belongs_elsewhere", "self", "not_found"];

function toResult(value: unknown, error: unknown): TeamResult {
  if (error) return "failed";
  return typeof value === "string" && KNOWN.includes(value) ? (value as TeamResult) : "failed";
}

/** Gives an existing login access to this store's admin (the login is created in the Supabase dashboard). */
export async function addTeamMember(email: string, role: string, name: string): Promise<TeamResult> {
  await requireOwner();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return "invalid_email";
  if (!isTeamRole(role)) return "bad_role";

  const db = await createClient();
  const { data, error } = await db.rpc("add_team_member", { p_email: parsed.data, p_role: role, p_name: name.trim().slice(0, 80) });
  revalidatePath("/admin/team");
  return toResult(data, error);
}

export async function changeTeamRole(userId: string, role: string): Promise<TeamResult> {
  await requireOwner();
  if (!isTeamRole(role)) return "bad_role";
  const db = await createClient();
  const { data, error } = await db.rpc("set_team_role", { p_user: userId, p_role: role });
  revalidatePath("/admin/team");
  return toResult(data, error);
}

/** Takes admin access away. The person's login stays in Supabase; it just no longer opens this admin. */
export async function removeTeamMember(userId: string): Promise<TeamResult> {
  await requireOwner();
  const db = await createClient();
  const { data, error } = await db.rpc("remove_team_member", { p_user: userId });
  revalidatePath("/admin/team");
  return toResult(data, error);
}
