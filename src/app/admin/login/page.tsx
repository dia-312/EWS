import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const [session, t, params] = await Promise.all([
    getAdminSession(),
    getTranslations("admin.login"),
    searchParams,
  ]);
  if (session.status === "admin") redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mb-6 mt-1 text-sm text-muted">{t("subtitle")}</p>
        <LoginForm
          initialError={params.error === "forbidden" ? "forbidden" : undefined}
        />
      </div>
    </main>
  );
}
