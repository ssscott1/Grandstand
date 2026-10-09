// TEMPORARY diagnostic - checks the Wodify API key works. Safe to delete.
// Does not reveal the key and does not create any leads.
export async function handler() {
  const key = process.env.WODIFY_API_KEY;
  const reply = (o) => ({
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(o, null, 2)
  });
  if (!key) return reply({ keySet: false });
  try {
    const res = await fetch("https://api.wodify.com/v1/customers/locations", {
      headers: { "x-api-key": key }
    });
    const text = await res.text();
    return reply({
      keySet: true,
      keyHasStrayWhitespace: key !== key.trim(),
      wodifyStatus: res.status,
      ok: res.ok,
      locationsFound: (text.match(/"id"/g) || []).length,
      error: res.ok ? undefined : text.slice(0, 300)
    });
  } catch (e) {
    return reply({ keySet: true, failed: String(e && e.message) });
  }
}
