// Supabase key diagnostic. Reads .env.local, checks NAMES/shape, and pings the
// REST API with the publishable and secret keys separately. NEVER prints key
// values - only lengths, prefixes, and HTTP status codes.
import fs from "node:fs";

const raw = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const sec = env.SUPABASE_SECRET_KEY;

const shape = (v) => (v ? `len=${v.length}, prefix=${v.slice(0, 12)}…, hasWhitespace=${/\s/.test(v)}` : "MISSING");
console.log("NEXT_PUBLIC_SUPABASE_URL present:", Boolean(url), url ? `(host=${(() => { try { return new URL(url).host; } catch { return "INVALID_URL"; } })()})` : "");
console.log("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:", shape(pub), pub ? `startsOk=${pub.startsWith("sb_publishable_")}` : "");
console.log("SUPABASE_SECRET_KEY:", shape(sec), sec ? `startsOk=${sec.startsWith("sb_secret_")}` : "");

async function ping(label, key) {
  if (!url || !key) return console.log(`${label}: skipped (missing)`);
  try {
    const r = await fetch(`${url}/rest/v1/leads?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    let body = "";
    try { body = JSON.stringify(await r.json()).slice(0, 120); } catch {}
    console.log(`${label}: HTTP ${r.status} ${r.statusText} | body=${body}`);
  } catch (e) {
    console.log(`${label}: network error ${String(e).slice(0, 80)}`);
  }
}

await ping("PING publishable key", pub);
await ping("PING secret key", sec);
