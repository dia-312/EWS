import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/admin/login/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";
import { getCurrentStore } from "@/lib/store";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({
  children,
}: LayoutProps<"/admin">) {
  const [session, store, t] = await Promise.all([
    requireAdmin(),
    getCurrentStore(),
    getTranslations("admin"),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-baseline gap-3">
            <span className="font-bold">{store.name}</span>
            <span className="text-sm text-muted">{t("title")}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin/account" className="hidden text-muted underline-offset-2 hover:underline sm:inline" dir="ltr">
              {session.email}
            </Link>
            <Link href="/admin/account" className="underline underline-offset-2 sm:hidden">
              {t("account.title")}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
              >
                {t("signOut")}
              </button>
            </form>
          </div>
        </div>
      </header>
      <AdminNav isOwner={session.role === "owner"} />
      <div className="mx-auto w-full max-w-6xl flex-1 p-4 sm:py-8">
        {children}
      </div>
    </div>
  );
}
