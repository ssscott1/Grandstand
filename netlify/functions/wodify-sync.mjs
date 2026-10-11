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
//   NETLIFY_API_TOKEN  — Netlify personal access token (reads form submissions)
//   WODIFY_API_KEY     — already set, used by wodify-lead
// Optional:
//   WODIFY_LOCATION_ID, WODIFY_LEAD_STATUS_ID — already set, used by wodify-lead
//   NETLIFY_SITE_ID    — only needed if Netlify stops providing SITE_ID at runtime

export const config = { schedule: "*/5 * * * *" };

// Forms that should produce a Wodify lead. The onboard and christmas-party
// forms deliberately stay out of this — they are not enquiries.
const LEAD_FORMS = ["free-trial", "meta-lead"];

// How far back to look each run. Generous on purpose: the run is cheap, and a
// wide window means a short Netlify or Wodify outage self-heals on the next
// pass instead of losing the lead.
const WINDOW_MS = 2 * 60 * 60 * 1000;

export default async function () {
  const netlifyToken = process.env.NETLIFY_API_TOKEN;
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

    const status = await createLead(apiKey, locationId, d, submission.form_name);
    if (status >= 200 && status < 300) {
      created++;
      if (email) known.add(email); // guard against two submissions in one run
      console.log("wodify-sync: created lead for", submission.form_name, email || "(no email)");
    } else {
      console.error("wodify-sync: create failed", status, email || "(no email)");
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
    if (!res.ok) {
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
  const m = text.match(/"id"\s*:\s*(\d+)/);
  return res.ok && m ? m[1] : null;
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

  const res = await fetch("https://api.wodify.com/v1/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(body)
      .replace('"__LOCATION__"', locationId)
      .replace('"__STATUS__"', process.env.WODIFY_LEAD_STATUS_ID || "null")
  });
  if (!res.ok) console.error("wodify-sync: wodify said", res.status, (await res.text()).slice(0, 200));
  return res.status;
}
