// Safety net for Wodify leads.
//
// Netlify's form notifications (the outgoing webhook to wodify-lead, and the
// submission-created event function) both stopped firing on 9 Oct 2026, so
// enquiries were landing in Netlify Forms and going no further. This function
// does not rely on either of them: every 5 minutes it reads recent submissions
// straight from the Netlify Forms API and makes sure each one exists as a lead
// in Wodify.
//
// It is safe to leave running even if Netlify's webhook starts working again —
// before creating anything it checks the most recent Wodify leads and skips any
// email that is already there.
//
// Environment variables needed:
//   FORMS_READ_TOKEN   — Netlify personal access token (reads form submissions).
//                        Named this instead of NETLIFY_API_TOKEN /
//                        NETLIFY_*: Netlify silently refuses to persist any
//                        env var starting with NETLIFY_ when it's marked
//                        secret — the write API reports success but the
//                        value never actually saves. Confirmed 13 Oct 2026
//                        after three different NETLIFY_*-prefixed names all
//                        failed the same way; a non-prefixed name saved
//                        immediately.
//   WODIFY_API_KEY     — already set, used by wodify-lead
// Optional:
//   WODIFY_LOCATION_ID — NOT currently set. Wodify support said 2023 was our
//                        "Tenant ID" (13 Oct 2026), but the Leads API
//                        rejected it: {"HTTPCode":422,"MoreInfo":"Location
//                        with Id 2023 not found or inactive."} — Tenant ID
//                        and location_id are apparently different things.
//                        Left unset so the code falls back to looking up
//                        real locations below; check the logs for what that
//                        returns before setting this again.
//   WODIFY_LEAD_STATUS_ID — already set, used by wodify-lead
//   NETLIFY_SITE_ID    — only needed if Netlify stops providing SITE_ID at runtime
//
// IMPORTANT: Wodify's API returns HTTP 200 even for request-level errors —
// the real outcome is in the JSON body ({"HTTPCode":422,...} etc). Every
// response from Wodify must be checked with wodifyOk() below, never res.ok
// alone, or failures get silently logged and counted as successes.

export const config = { schedule: "*/5 * * * *" };

// Wodify wraps real errors in an HTTP 200, e.g.
// {"HTTPCode":422,"ErrorCode":"422","MoreInfo":"Location with Id 2023 not
// found or inactive."} — so a 2xx transport status alone does not mean the
// request succeeded. This checks both.
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

// Forms that should produce a Wodify lead. The onboard and christmas-party
// forms deliberately stay out of this — they are not enquiries.
const LEAD_FORMS = ["free-trial", "meta-lead"];

// How far back to look each run. Generous on purpose: the run is cheap, and a
// wide window means a short Netlify or Wodify outage self-heals on the next
// pass instead of losing the lead.
const WINDOW_MS = 2 * 60 * 60 * 1000;

export default async function () {
  const netlifyToken = process.env.FORMS_READ_TOKEN;
  const apiKey = process.env.WODIFY_API_KEY;
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;

  if (!netlifyToken || !apiKey || !siteId) {
    console.error("wodify-sync: missing config", {
      netlifyToken: Boolean(netlifyToken),
      wodifyKey: Boolean(apiKey),
      siteId: Boolean(siteId)
    });
    return new Response("missing config", { status: 500 });
  }

  // 1. Recent submissions, newest first.
  const subsRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${siteId}/submissions?per_page=50`,
    { headers: { Authorization: `Bearer ${netlifyToken}` } }
  );
  if (!subsRes.ok) {
    console.error("wodify-sync: netlify forms read failed", subsRes.status);
    return new Response("forms read failed", { status: 502 });
  }
  const submissions = await subsRes.json();

  const cutoff = Date.now() - WINDOW_MS;
  const recent = submissions.filter((s) => {
    const name = s.form_name || "";
    const when = Date.parse(s.created_at || "");
    return LEAD_FORMS.includes(name) && Number.isFinite(when) && when >= cutoff;
  });

  if (recent.length === 0) {
    console.log("wodify-sync: no submissions in window");
    return new Response("ok");
  }

  // 2. Emails already in Wodify, so a lead is never created twice. If this
  // lookup fails we stop rather than risk duplicating leads for the staff.
  const known = await recentLeadEmails(apiKey);
  if (!known) {
    console.error("wodify-sync: could not read existing leads, skipping run");
    return new Response("lead read failed", { status: 502 });
  }

  // 3. Resolve the location once per run, same rule as wodify-lead.
  let locationId = process.env.WODIFY_LOCATION_ID;
  if (!locationId) {
    locationId = await lookupLocationId(apiKey);
    if (!locationId) {
      console.error("wodify-sync: location lookup failed");
      return new Response("location lookup failed", { status: 502 });
    }
  }

  let created = 0;
  let skipped = 0;

  for (const submission of recent) {
    const d = submission.data || {};
    const email = (d.email || "").trim().toLowerCase();

    if (email && known.has(email)) {
      skipped++;
      continue;
    }

    const result = await createLead(apiKey, locationId, d, submission.form_name);
    if (result.ok) {
      created++;
      if (email) known.add(email); // guard against two submissions in one run
      console.log("wodify-sync: created lead for", submission.form_name, email || "(no email)");
    } else {
      console.error("wodify-sync: create failed", result.status, result.text.slice(0, 300), email || "(no email)");
    }
  }

  console.log(`wodify-sync: ${recent.length} in window, ${created} created, ${skipped} already there`);
  return new Response("ok");
}

// The 100 most recently created leads, as a Set of lowercased emails.
// Returns null if the list could not be read at all.
async function recentLeadEmails(apiKey) {
  try {
    const res = await fetch("https://api.wodify.com/v1/leads?sort=desc_id&page_size=100", {
      headers: { "x-api-key": apiKey }
    });
    const text = await res.text();
    if (!wodifyOk(res.status, text)) {
      console.error("wodify-sync: leads list", res.status, text.slice(0, 200));
      return null;
    }
    // Pull emails out of the response without assuming its exact shape.
    const emails = text.match(/"email"\s*:\s*"([^"]+)"/g) || [];
    return new Set(
      emails.map((m) => m.replace(/.*"email"\s*:\s*"/, "").replace(/"$/, "").trim().toLowerCase())
    );
  } catch (e) {
    console.error("wodify-sync: leads list threw", e && e.message);
    return null;
  }
}

async function lookupLocationId(apiKey) {
  const res = await fetch("https://api.wodify.com/v1/customers/locations", {
    headers: { "x-api-key": apiKey }
  });
  const text = await res.text();
  // Always logged, success or not — this is how we find the real location_id
  // now that the "Tenant ID" Wodify gave us (2023) turned out to be wrong.
  console.log("wodify-sync: locations lookup", res.status, text.slice(0, 1000));
  if (!wodifyOk(res.status, text)) return null;
  const m = text.match(/"id"\s*:\s*(\d+)/);
  return m ? m[1] : null;
}

// Mirrors wodify-lead.mjs so a lead looks the same however it got here.
// Wodify IDs are huge numbers, so they go in as text and are swapped in after
// JSON.stringify rather than being parsed as numbers.
async function createLead(apiKey, locationId, d, formName) {
  const fullName = (d.name || "Unknown (website form)").trim();
  const space = fullName.indexOf(" ");

  const body = {
    location_id: "__LOCATION__",
    first_name: space === -1 ? fullName : fullName.slice(0, space),
    last_name: space === -1 ? "" : fullName.slice(space + 1).trim(),
    email: d.email || undefined,
    phone_number: d.phone || undefined,
    notes: [
      "Source: website form (" + (formName || "free-trial") + ")",
      "Added by the 5-minute Wodify sync",
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
  const resText = await res.text();
  // Logged either way — Wodify returns HTTP 200 even for rejected requests,
  // so the body is the only place the real outcome shows up.
  console.log("wodify-sync: sent", sentBody);
  console.log("wodify-sync: wodify replied", res.status, resText.slice(0, 500));
  return { ok: wodifyOk(res.status, resText), status: res.status, text: resText };
}
