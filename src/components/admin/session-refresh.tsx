"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const ATTEMPT_KEY = "ews-admin-refresh-attempt";
const RETRY_WINDOW_MS = 10_000;

/**
 * Landing point when the server saw no valid session. An expired access token
 * can only be refreshed by the browser client (it holds the refresh token), so
 * try that once and go back to the dashboard, otherwise to the login page.
 * The timestamp guard prevents a redirect loop if the server keeps rejecting.
 */
export function SessionRefresh() {
  const t = useTranslations("admin.refresh");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const lastAttempt = Number(sessionStorage.getItem(ATTEMPT_KEY) ?? 0);
      const tooSoon = Date.now() - lastAttempt < RETRY_WINDOW_MS;
      sessionStorage.setItem(ATTEMPT_KEY, String(Date.now()));

      let signedIn = false;
      if (!tooSoon) {
        // getUser() makes the client refresh an expired token, then validates it.
        const { data } = await createClient().auth.getUser();
        signedIn = Boolean(data.user);
      }
      if (cancelled) return;
      router.replace(signedIn ? "/admin" : "/admin/login");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center bg-surface p-4">
      <p className="text-muted" role="status">
        {t("message")}
      </p>
    </main>
  );
}
