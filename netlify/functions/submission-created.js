// Runs automatically on every verified Netlify Forms submission.
// Relays the details as an email via FormSubmit.
const LEAD_EMAIL = "info@grandstandcrossfit.com.au";
const ONBOARD_EMAIL = "shez@grandstandcrossfit.com.au";

exports.handler = async function (event) {
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
    const params = new URLSearchParams({
      "Enquiry type": subjectType,
      "Lead source": isMeta
        ? "Meta ad" + ((c => c ? " (" + c + ")" : "")([d.utm_campaign, d.utm_content].filter(Boolean).join(" / ")))
        : "Website",
      "Chosen plan": d.plan || "-",
      Name: d.name || "-",
      Mobile: d.phone || "-",
      Email: d.email || "-",
      email: d.email || "-",
      "Interested in": d.program || "-",
      Goal: d.goal || "-",
      _subject: subjectType + " — " + (d.name || "Website"),
      _template: "table",
      _captcha: "false"
    });
    // Every enquiry type gets the "book your first session" auto-reply except
    // Kids Fitness enquiries, which are handled by a separate follow-up.
    if (!isKids && d.email) {
      params.set("_autoresponse", freeTrialAutoresponseEmail(d.name));
    }
    // Plain (non-ajax) endpoint is required here: FormSubmit's _autoresponse
    // feature is documented to not fire on the JSON /ajax/ endpoint.
    const res = await fetch("https://formsubmit.co/" + LEAD_EMAIL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    const out = await res.text();
    console.log("formsubmit relay:", res.status, out.slice(0, 300));
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

// Auto-reply sent straight to the enquirer's own inbox, telling them how to
// book their first class and sign the waiver. Not sent for Kids Fitness
// enquiries (program contains "Kids"), which get a different follow-up.
function freeTrialAutoresponseEmail(name) {
  const firstName = (name || "").trim().split(/\s+/)[0] || "there";
  return `Hi ${firstName},

Thanks for getting in touch, we're really glad you're keen to try GrandStand CrossFit.

Pick a day and time for your first trial session: <a href="https://grandstandcrossfit.wodify.com/OnlineSalesPage/Main?q=Classes%7CLocationId%3D2172%26OnlineMembershipId%3D17676">Book your first session</a>

We give you 3 free trial sessions, to be completed within 7 days of your first class. You can book your second and third class when you come to the gym. Spots fill up quickly, so the sooner you book, the better your pick of times.

One quick thing before you come in. Please complete our athlete waiver before your first session — it only takes a couple of minutes: <a href="https://app.wodify.com/Token/SignWaiver?WaiverToken=458F773D3C305022CE1F7984B7D7CB84B7435EB8BD06DC4CB09A83D57797C3BF">Sign the waiver</a>

We will be in touch soon to follow up and make sure you're all set. In the meantime, if you have any questions, reply to this email or call me on 0411 371 661.

We can't wait to meet you!

Cheers,
Shez Lee
GrandStand CrossFit
0411 371 661`;
}
