import type { Metadata } from "next";
import { SessionRefresh } from "@/components/admin/session-refresh";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminRefreshPage() {
  return <SessionRefresh />;
}
