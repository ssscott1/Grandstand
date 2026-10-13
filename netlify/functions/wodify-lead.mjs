// Receives a Netlify Forms outgoing webhook and creates the lead in Wodify.
// Locked behind a secret word: the webhook URL must end with
// ?secret=<WODIFY_WEBHOOK_SECRET> (a Netlify environment variable).
// Needs WODIFY_API_KEY. Optional: WODIFY_LOCATION_ID, WODIFY_LEAD_STATUS_ID.
// Wodify IDs are huge numbers, so they are kept as text, never as numbers.
//
// WODIFY_LOCATION_ID is set to 2172, confirmed correct 13 Oct 2026 via a
// real successful lead create (Wodify's own response echoed back
// location_id:2172, location:"Grandstand CrossFit"). This is also the same
// id already used throughout this site's Wodify booking links
// (LocationId=2172). Wodify support had earlier given us 2023 as our
// "Tenant ID", which turned out to be a different field (customer_id,
// visible in the /v1/customers/locations response) — not the location_id
// the Leads API wants.
//
// IMPORTANT: Wodify's API returns HTTP 200 even for request-level errors —
// the real outcome is in the JSON body ({"HTTPCode":422,...} etc). Always
// check wodifyOk(), never res.ok alone, or failures look like successes.
function wodifyOk(status, text) {
  if (status < 200 || status >= 300) return false;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (typeof parsed.HTTPCode === "number" && (parsed.HTTPCode < 200 || parsed.HTTPCode >= 300)) return false;
      if (parsed.ErrorCode) return false;
    }
  } catch (e) {
    // Not JSON (or not an object) — nothing more to check, HTTP status stands.
  }
  return true;
}

export async function handler(event) {
  const reply = (statusCode, text) => ({ statusCode, body: text });
  try {
    const q = (event && event.queryStringParameters) || {};
    const expected = process.env.WODIFY_WEBHOOK_SECRET;
    if (!expected || q.secret !== expected) return reply(404, "not found");
    if (event.httpMethod && event.httpMethod !== "POST") return reply(405, "POST only");

    const apiKey = process.env.WODIFY_API_KEY;
    if (!apiKey) return reply(500, "WODIFY_API_KEY not set");

    const parsed = JSON.parse(event.body || "{}");
    const sub = parsed.payload || parsed;
    const d = sub.data || {};
    const email = d.email || sub.email;
    const dbg = "Webhook fields: " + Object.keys(sub).join(",") + " | data fields: " + Object.keys(d).join(",");
    const formName = sub.form_name || "free-trial";

    let locationId = process.env.WODIFY_LOCATION_ID;
    if (!locationId) {
      const locRes = await fetch("https://api.wodify.com/v1/customers/locations", {
        headers: { "x-api-key": apiKey }
      });
      const locText = await locRes.text();
      console.log("wodify-lead: locations lookup", locRes.status, locText.slice(0, 1000));
      const m = locText.match(/"id"\s*:\s*(\d+)/);
      if (!wodifyOk(locRes.status, locText) || !m) return reply(502, "location lookup failed: " + locRes.status);
      locationId = m[1];
    }

    const fullName = (d.name || sub.name || "Unknown (website form)").trim();
    const space = fullName.indexOf(" ");
    const body = {
      location_id: "__LOCATION__",
      first_name: space === -1 ? fullName : fullName.slice(0, space),
      last_name: space === -1 ? "" : fullName.slice(space + 1).trim(),
      email: email || undefined,
      phone_number: d.phone || undefined,
      notes: [
        "Source: website form (" + formName + ")",
        dbg,
        d.program && "Program: " + d.program,
        d.goal && "Goal: " + d.goal,
        d.start && "Preferred start: " + d.start,
        d.plan && "Plan interest: " + d.plan
      ].filter(Boolean).join("\n")
    };
    if (process.env.WODIFY_LEAD_STATUS_ID) body.lead_status_id = "__STATUS__";

    const sentBody = JSON.stringify(body)
      .replace('"__LOCATION__"', locationId)
      .replace('"__STATUS__"', process.env.WODIFY_LEAD_STATUS_ID || "null");
    const res = await fetch("https://api.wodify.com/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: sentBody
    });
    const out = await res.text();
    console.log("wodify-lead: sent", sentBody);
    console.log("wodify-lead: wodify replied", res.status, out.slice(0, 500));
    return reply(wodifyOk(res.status, out) ? 200 : 502, "wodify " + res.status);
  } catch (e) {
    console.error("wodify-lead failed:", e && e.message);
    return reply(500, "failed");
  }
}
