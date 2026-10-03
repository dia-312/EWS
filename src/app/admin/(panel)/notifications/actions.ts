"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type NotificationActionResult = { error?: "failed" };

/** The owner has contacted this person; the request moves to "answered". */
export async function markNotified(id: string): Promise<NotificationActionResult> {
  const session = await requireEditor();
  const db = await createClient();
  const { error } = await db
    .from("notification_subscriptions")
    .update({ status: "notified", notified_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", session.storeId);
  if (error) return { error: "failed" };
  revalidatePath("/admin/notifications");
  return {};
}

/** Removes a request together with the contact details in it. */
export async function deleteNotification(id: string): Promise<NotificationActionResult> {
  const session = await requireEditor();
  const db = await createClient();
  const { error } = await db.from("notification_subscriptions").delete().eq("id", id).eq("store_id", session.storeId);
  if (error) return { error: "failed" };
  revalidatePath("/admin/notifications");
  return {};
}
