// Runs automatically on every verified Netlify Forms submission.
// Relays the details as an email to the gym inbox via FormSubmit.
const LEAD_EMAIL = "info@grandstandcrossfit.com.au";

exports.handler = async function (event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const d = (body.payload && body.payload.data) || {};
    const res = await fetch("https://formsubmit.co/ajax/" + LEAD_EMAIL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        "How they want to start": d.start || "-",
        "Chosen plan": d.plan || "-",
        Name: d.name || "-",
        Mobile: d.phone || "-",
        Email: d.email || "-",
        "Interested in": d.program || "-",
        Goal: d.goal || "-",
        _subject: "Free Trial Enquiry — " + (d.name || "Website"),
        _template: "table",
        _captcha: "false"
      })
    });
    const out = await res.text();
    console.log("formsubmit relay:", res.status, out.slice(0, 300));
    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("relay failed:", e && e.message);
    return { statusCode: 200, body: "relay failed" };
  }
};
