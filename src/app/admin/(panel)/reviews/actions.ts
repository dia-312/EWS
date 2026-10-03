"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReviewActionResult = { error?: "failed" };

function refresh() {
  revalidatePath("/admin/reviews");
  // the product pages and cards show the ratings (they are cached for a few seconds)
  revalidatePath("/", "layout");
}

/** Approving shows the review on the product page and counts it in the average; rejecting hides it. */
export async function setReviewStatus(id: string, status: "approved" | "rejected" | "pending"): Promise<ReviewActionResult> {
  const session = await requireEditor();
  const db = await createClient();
  const { error } = await db
    .from("product_reviews")
    .update({ status, moderated_at: status === "pending" ? null : new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", session.storeId);
  if (error) return { error: "failed" };
  refresh();
  return {};
}

export async function deleteReview(id: string): Promise<ReviewActionResult> {
  const session = await requireEditor();
  const db = await createClient();
  const { error } = await db.from("product_reviews").delete().eq("id", id).eq("store_id", session.storeId);
  if (error) return { error: "failed" };
  refresh();
  return {};
}
