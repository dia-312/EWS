import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache override yet: pages are rendered per request.
// Revisit (R2 cache) if the free-plan CPU limit becomes a problem.
export default defineCloudflareConfig({});
