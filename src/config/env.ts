import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

// Next.js inlines NEXT_PUBLIC_* only for literal `process.env.NAME` accesses,
// so each variable is referenced explicitly here.
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

/** Slug of the store this deployment serves (stores.slug). Server-side only. */
export function getStoreSlug(): string {
  const slug = process.env.STORE_SLUG;
  if (!slug) throw new Error("STORE_SLUG is not set");
  return slug;
}
