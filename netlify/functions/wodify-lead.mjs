// Receives a Netlify Forms outgoing webhook and creates the lead in Wodify.
// Locked behind a secret word: the webhook URL must end with
// ?secret=<WODIFY_WEBHOOK_SECRET> (a Netlify environment variable).
// Needs WODIFY_API_KEY. Optional: WODIFY_LOCATION_ID, WODIFY_LEAD_STATUS_ID.
// Wodify IDs are huge numbers, so they are kept as text, never as numbers.
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
    const formName = sub.form_name || "free-trial";

    let locationId = process.env.WODIFY_LOCATION_ID;
    if (!locationId) {
      const locRes = await fetch("https://api.wodify.com/v1/customers/locations", {
        headers: { "x-api-key": apiKey }
      });
      const locText = await locRes.text();
      const m = locText.match(/"id"\s*:\s*(\d+)/);
      if (!locRes.ok || !m) return reply(502, "location lookup failed: " + locRes.status);
      locationId = m[1];
    }

    const fullName = (d.name || "").trim();
    const space = fullName.indexOf(" ");
    const body = {
      location_id: "__LOCATION__",
      first_name: space === -1 ? fullName : fullName.slice(0, space),
      last_name: space === -1 ? "" : fullName.slice(space + 1).trim(),
      email: d.email || undefined,
      phone_number: d.phone || undefined,
      notes: [
        "Source: website form (" + formName + ")",
        d.program && "Program: " + d.program,
        d.goal && "Goal: " + d.goal,
        d.start && "Preferred start: " + d.start,
        d.plan && "Plan interest: " + d.plan
      ].filter(Boolean).join("\n")
    };
    if (process.env.WODIFY_LEAD_STATUS_ID) body.lead_status_id = "__STATUS__";

    const res = await fetch("https://api.wodify.com/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body)
        .replace('"__LOCATION__"', locationId)
        .replace('"__STATUS__"', process.env.WODIFY_LEAD_STATUS_ID || "null")
    });
    const out = await res.text();
    console.log("wodify lead:", res.status, out.slice(0, 200));
    return reply(res.ok ? 200 : 502, "wodify " + res.status);
  } catch (e) {
    console.error("wodify-lead failed:", e && e.message);
    return reply(500, "failed");
  }
}
