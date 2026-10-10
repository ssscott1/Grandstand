// Runs automatically on every verified Netlify Forms submission.
// Relays the details as an email via FormSubmit.
const LEAD_EMAIL = "info@grandstandcrossfit.com.au";
const ONBOARD_EMAIL = "shez@grandstandcrossfit.com.au";
// Same Wodify location every existing booking link on this site already
// points at (see the LocationId=2172 query param used throughout).
const WODIFY_LOCATION_ID = 2172;

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const d = (body.payload && body.payload.data) || {};
    const formName = (body.payload && body.payload.form_name) || "";

    if (formName === "onboard") {
      return await relayOnboardForm(d);
    }
    if (formName === "christmas-party") {
      return await relayChristmasPartyForm(d);
    }

    const isMeta = formName === "meta-lead" || (d.source || "") === "Meta";
    const isJoin = (d.start || "").toLowerCase().includes("get started");
    const subjectType = isMeta
      ? "META LEAD — Free Trial"
      : isJoin ? "Get Started Enquiry" : "Free Trial Enquiry";
    const isKids = /kids/i.test(d.program || "");

    // Internal lead notification — the original, proven setup: AJAX endpoint
    // + _captcha:false delivers instantly with nobody around to click a
    // captcha. Left exactly as it was before the auto-reply was added.
    const res = await fetch("https://formsubmit.co/ajax/" + LEAD_EMAIL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        "Enquiry type": subjectType,
        "Lead source": isMeta
          ? "Meta ad" + ((c => c ? " (" + c + ")" : "")([d.utm_campaign, d.utm_content].filter(Boolean).join(" / ")))
          : "Website",
        "Chosen plan": d.plan || "-",
        Name: d.name || "-",
        Mobile: d.phone || "-",
        Email: d.email || "-",
        "Interested in": d.program || "-",
        Goal: d.goal || "-",
        _subject: subjectType + " — " + (d.name || "Website"),
        _template: "table",
        _captcha: "false"
      })
    });
    const out = await res.text();
    console.log("formsubmit relay:", res.status, out.slice(0, 300));

    // Create the prospect directly in Wodify's own Leads CRM, so staff don't
    // have to re-key every website enquiry by hand. Never lets a Wodify
    // failure take down the email notification above or the auto-reply
    // below — it's strictly additive.
    await pushLeadToWodify(d);

    // Customer-facing auto-reply — every enquiry type except Kids Fitness.
    // Sent directly via Resend rather than FormSubmit: FormSubmit's
    // _autoresponse feature needs a real solved reCAPTCHA from an actual
    // browser to release an email to a third-party inbox, which a
    // server-to-server call can never provide — confirmed by two live tests
    // where the internal notification above went through but this did not.
    if (!isKids && d.email && process.env.RESEND_API_KEY) {
      const { html, text } = freeTrialAutoresponseContent(d.name);
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + process.env.RESEND_API_KEY
        },
        body: JSON.stringify({
          from: "Grandstand CrossFit <onboarding@resend.dev>",
          to: [d.email],
          reply_to: LEAD_EMAIL,
          subject: "Book your free trial at GrandStand CrossFit",
          html,
          text
        })
      });
      const emailOut = await emailRes.text();
      console.log("resend autoresponse:", emailRes.status, emailOut.slice(0, 300));
    }

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("relay failed:", e && e.message);
    return { statusCode: 200, body: "relay failed" };
  }
};

// Staff onboarding form — goes straight to Shez (gym management), never the
// general lead inbox. Deliberately its own function so a future change to
// the lead-relay logic above can't accidentally touch payroll/TFN/bank data.
async function relayOnboardForm(d) {
  const res = await fetch("https://formsubmit.co/ajax/" + ONBOARD_EMAIL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Entity: d.entity || "Go Unbroken Pty Ltd trading as Grandstand CrossFit",
      "Full name": d.full_name || "-",
      "Residential address": d.address || "-",
      "Home phone": d.phone_home || "-",
      Mobile: d.phone_mobile || "-",
      Email: d.email || "-",
      "Date of birth": d.dob || "-",
      Nationality: d.nationality || "-",
      "Marital status": d.marital_status || "-",
      "Commencement date": d.commencement_date || "-",
      Position: d.position || "-",
      "Employment status": d.employment_status || "-",
      "Driver's licence number": d.licence_number || "-",
      "Licence expiry": d.licence_expiry || "-",
      "Tax file number": d.tfn || "-",
      "Claims tax-free threshold": d.tax_free_threshold ? "Yes" : "No",
      "Has study/training support loan": d.study_loan ? "Yes" : "No",
      "Bank account name": d.bank_account_name || "-",
      BSB: d.bank_bsb || "-",
      "Account number": d.bank_account_number || "-",
      "Superannuation fund": d.super_fund || "-",
      "Super membership number": d.super_member_number || "-",
      "Super fund USI": d.super_usi || "-",
      _subject: "New Employee Onboarding Form — " + (d.full_name || "Grandstand"),
      _template: "table",
      _captcha: "false"
    })
  });
  const out = await res.text();
  console.log("onboard relay:", res.status, out.slice(0, 300));
  return { statusCode: 200, body: "ok" };
}

// Christmas Party ticket bookings — goes to the general lead inbox, with
// "Christmas Party" in the subject so it's easy to spot and action in Wodify.
async function relayChristmasPartyForm(d) {
  const tickets = parseInt(d.tickets, 10) || 1;
  const total = tickets * 80;
  const res = await fetch("https://formsubmit.co/ajax/" + LEAD_EMAIL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      Event: d.event || "2026 Christmas Party",
      Name: d.name || "-",
      Mobile: d.phone || "-",
      Email: d.email || "-",
      Tickets: tickets,
      "Total due": "$" + total + " AUD",
      Note: "Add these tickets to the member's Wodify account.",
      _subject: "Christmas Party — " + (d.name || "Website") + " (" + tickets + " ticket" + (tickets === 1 ? "" : "s") + ")",
      _template: "table",
      _captcha: "false"
    })
  });
  const out = await res.text();
  console.log("christmas-party relay:", res.status, out.slice(0, 300));
  return { statusCode: 200, body: "ok" };
}

// Pushes a website enquiry into Wodify's Leads CRM via its public API
// (POST https://api.wodify.com/v1/leads, auth via the x-api-key header).
// Best-effort only: logs the result but never throws, so a Wodify outage or
// API change can't break the email notification/auto-reply either side of
// this call.
async function pushLeadToWodify(d) {
  if (!process.env.WODIFY_API_KEY) {
    console.log("wodify lead push: skipped, WODIFY_API_KEY not set");
    return;
  }
  try {
    const { first, last } = splitName(d.name);
    const res = await fetch("https://api.wodify.com/v1/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.WODIFY_API_KEY
      },
      body: JSON.stringify({
        location_id: WODIFY_LOCATION_ID,
        first_name: first,
        last_name: last,
        email: d.email || "",
        phone_number: d.phone || ""
      })
    });
    const out = await res.text();
    console.log("wodify lead push:", res.status, out.slice(0, 300));
  } catch (e) {
    console.error("wodify lead push failed:", e && e.message);
  }
}

// Splits a submitted "name" field into first/last for Wodify's Leads API.
// Several of the site's lead forms only ask for a first name, so this
// always returns something usable even with a single-word name.
function splitName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Website", last: "Lead" };
  if (parts.length === 1) return { first: parts[0], last: "-" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

// Auto-reply sent straight to the enquirer's own inbox, telling them how to
// book their first class and sign the waiver. Not sent for Kids Fitness
// enquiries (program contains "Kids"), which get a different follow-up.
function freeTrialAutoresponseContent(name) {
  const firstName = (name || "").trim().split(/\s+/)[0] || "there";
  const bookUrl = "https://grandstandcrossfit.wodify.com/OnlineSalesPage/Main?q=Classes%7CLocationId%3D2172%26OnlineMembershipId%3D17676";
  const waiverUrl = "https://app.wodify.com/Token/SignWaiver?WaiverToken=458F773D3C305022CE1F7984B7D7CB84B7435EB8BD06DC4CB09A83D57797C3BF";

  const text = `Hi ${firstName},

Thanks for getting in touch, we're really glad you're keen to try GrandStand CrossFit.

Pick a day and time for your first trial session: ${bookUrl}

We give you 3 free trial sessions, to be completed within 7 days of your first class. You can book your second and third class when you come to the gym. Spots fill up quickly, so the sooner you book, the better your pick of times.

One quick thing before you come in. Please complete our athlete waiver before your first session — it only takes a couple of minutes: ${waiverUrl}

We will be in touch soon to follow up and make sure you're all set. In the meantime, if you have any questions, reply to this email or call me on 0411 371 661.

We can't wait to meet you!

Cheers,
Shez Lee
GrandStand CrossFit
0411 371 661`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#141314">
<p>Hi ${firstName},</p>
<p>Thanks for getting in touch, we're really glad you're keen to try GrandStand CrossFit.</p>
<p>Pick a day and time for your first trial session: <a href="${bookUrl}" style="color:#00ADEF;font-weight:bold">Book your first session</a></p>
<p>We give you 3 free trial sessions, to be completed within 7 days of your first class. You can book your second and third class when you come to the gym. Spots fill up quickly, so the sooner you book, the better your pick of times.</p>
<p>One quick thing before you come in. Please complete our athlete waiver before your first session — it only takes a couple of minutes: <a href="${waiverUrl}" style="color:#00ADEF;font-weight:bold">Sign the waiver</a></p>
<p>We will be in touch soon to follow up and make sure you're all set. In the meantime, if you have any questions, reply to this email or call me on 0411 371 661.</p>
<p>We can't wait to meet you!</p>
<p>Cheers,<br>Shez Lee<br>GrandStand CrossFit<br>0411 371 661</p>
</div>`;

  return { html, text };
}

