// Reads `supabase status -o json` from stdin and appends the local stack's URL
// and keys to $GITHUB_ENV for the following steps. Key names differ between
// CLI versions (ANON_KEY / PUBLISHABLE_KEY, SERVICE_ROLE_KEY / SECRET_KEY).
import { appendFileSync } from "node:fs";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const status = JSON.parse(raw.slice(raw.indexOf("{")));

const pick = (...names) => names.map((name) => status[name]).find(Boolean);
const values = {
  SUPABASE_URL: pick("API_URL"),
  SUPABASE_ANON_KEY: pick("ANON_KEY", "PUBLISHABLE_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: pick("SERVICE_ROLE_KEY", "SECRET_KEY"),
};

for (const [name, value] of Object.entries(values)) {
  if (!value) {
    console.error(`::error title=supabase status::missing ${name}; keys: ${Object.keys(status).join(", ")}`);
    process.exit(1);
  }
  console.log(`::add-mask::${value}`);
  appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`);
}
console.log("Local Supabase environment exported.");
