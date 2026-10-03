import type { TrackPayload } from "@/lib/validations/track";

const SESSION_KEY = "ews-session";

/** Random id that lives only as long as the browser tab; used to count visitors, not to identify them. */
function sessionId(): string | undefined {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

/** Visitors who ask not to be tracked are not tracked. */
function allowed(): boolean {
  return navigator.doNotTrack !== "1";
}

/** Fire-and-forget; never throws and never blocks the page. */
export function track(event: TrackPayload): void {
  if (typeof window === "undefined" || !allowed()) return;
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...event, sessionId: sessionId() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
