import { z } from "zod";

/** Who can do what in the admin. Viewers only look; the rest can edit; only owners manage the team. */
export const TEAM_ROLES = ["owner", "manager", "editor", "viewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && (TEAM_ROLES as readonly string[]).includes(value);
}

export const emailSchema = z.string().trim().max(200).toLowerCase().pipe(z.email());

/** The shortest password the account page accepts. */
export const MIN_PASSWORD_LENGTH = 10;

export type PasswordProblem = "too_short" | "mismatch" | "same_as_email";

/** What is wrong with a new password, if anything. */
export function checkNewPassword(password: string, confirmation: string, email: string | undefined): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "too_short";
  if (password !== confirmation) return "mismatch";
  if (email && password.toLowerCase() === email.toLowerCase()) return "same_as_email";
  return null;
}
