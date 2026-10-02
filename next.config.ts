import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { defaultLocale } from "./src/config/i18n";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  async redirects() {
    // The public site lives under /ar and /en; "/" goes to the default language.
    return [{ source: "/", destination: `/${defaultLocale}`, permanent: false }];
  },
};

// Only wire up the Cloudflare bindings emulation for `next dev`.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default withNextIntl(nextConfig);
