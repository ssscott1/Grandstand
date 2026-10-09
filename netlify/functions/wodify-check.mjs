// TEMPORARY diagnostic - checks the Wodify API key works. Safe to delete.
// Does not reveal the key. Everything is locked behind a secret word: the
// request must include ?secret=<WODIFY_CHECK_SECRET>, a Netlify variable.
// Add &create=yes to also try creating ONE clearly labelled test lead.
export async function handler(event) {
  const reply = (o, statusCode = 200) => ({
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(o, null, 2)
  });
  const q = (event && event.queryStringParameters) || {};
  const expected = process.env.WODIFY_CHECK_SECRET;
  if (!expected || q.secret !== expected) {
    return reply({ error: "not found" }, 404);
  }
  const key = process.env.WODIFY_API_KEY;
  if (!key) return reply({ keySet: false });
  try {
    const res = await fetch("https://api.wodify.com/v1/customers/locations", {
      headers: { "x-api-key": key }
    });
    const text = await res.text();
    const out = {
      keySet: true,
      wodifyStatus: res.status,
      ok: res.ok,
      locationsFound: (text.match(/"id"/g) || []).length
    };
    if (res.ok && q.create === "yes") {
      const m = text.match(/"id"\s*:\s*(\d+)/);
      const nm = (q.name || "Claude Test Lead (delete me)").trim();
      const sp = nm.indexOf(" ");
      const body = JSON.stringify({
        location_id: "__LOC__",
        first_name: sp === -1 ? nm : nm.slice(0, sp),
        last_name: sp === -1 ? "" : nm.slice(sp + 1),
        email: q.email || "claude-test@example.com",
        phone_number: q.phone || undefined,
        notes: "Diagnostic test lead - safe to delete"
      }).replace('"__LOC__"', m[1]);
      const r2 = await fetch("https://api.wodify.com/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key },
        body
      });
      out.createStatus = r2.status;
      out.createResponse = (await r2.text()).slice(0, 500);
    }
    return reply(out);
  } catch (e) {
    return reply({ keySet: true, failed: String(e && e.message) });
  }
}
