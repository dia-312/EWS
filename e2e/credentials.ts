/**
 * Throwaway accounts for the end-to-end tests. They exist only in the ephemeral
 * local Supabase stack that CI starts (auth.setup.ts creates them there and
 * refuses to run against any other URL). They are not valid anywhere else.
 */
export const TEST_ADMIN = {
  email: "e2e-admin@example.test",
  password: "e2e-only-Admin#2026",
  displayName: "E2E Admin",
};

export const TEST_VIEWER = {
  email: "e2e-viewer@example.test",
  password: "e2e-only-Viewer#2026",
};

/** A signed-in account that is not an admin of the store. */
export const TEST_STRANGER = {
  email: "e2e-stranger@example.test",
  password: "e2e-only-Stranger#2026",
};
