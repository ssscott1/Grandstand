# Grandstand CrossFit — Website

Elite lead-generation rebuild of [grandstandcrossfit.com.au](https://grandstandcrossfit.com.au) —
same offerings and services, redesigned around the 2018 Grandstand brand guidelines
(Grandstand Blue `#00ADEF` / Grandstand Charcoal `#141314`, "Great Culture. Grand Outcomes.").

Pure static HTML/CSS/JS — no build step, no framework. Deploy the repo root to any
static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3).

## Pages

| Page | Target search intent |
|---|---|
| `index.html` | CrossFit Perth (primary) |
| `crossfit.html` | CrossFit classes Perth |
| `hyrox.html` | Hyrox training Perth |
| `weightlifting.html` | Olympic weightlifting Perth |
| `group-training.html` | Group fitness training Perth |
| `personal-training.html` | Personal training Perth CBD |
| `kids.html` | Kids fitness classes Perth |
| `programs.html` | hub linking all programs |
| `timetable.html`, `pricing.html`, `about.html`, `contact.html` | supporting/local |

## Lead-generation machinery

- **Free trial form** on every page (`#free-trial`), mobile sticky CTA bar, header CTA,
  click-to-call everywhere.
- Forms are plain **native Netlify Forms** POSTs (no JavaScript in the submit
  path) that land on `/thanks.html`. Every verified submission is recorded in
  the Netlify dashboard → Forms, and a `submission-created` Netlify Function
  (`netlify/functions/`) relays the details as an email to
  info@grandstandcrossfit.com.au via FormSubmit. FormSubmit needs one-time
  activation: the first relayed submission sends a confirmation email to that
  inbox (check spam) — click "Activate" once. Also enable Netlify's native
  notification (dashboard → Forms → Notifications → Add → Email) as the
  primary, zero-dependency channel.

## SEO / AI-search

- Per-page titles, meta descriptions, canonicals, Open Graph.
- JSON-LD: `ExerciseGym` (NAP, geo, hours, founders, offer catalog), `Service`,
  `FAQPage`, `BreadcrumbList` per page.
- `sitemap.xml`, `robots.txt` (14 AI crawlers explicitly allowed, llms files
  referenced), `llms.txt` (index) + `llms-full.txt` (complete timetable,
  prices, booking steps, policies) for AI/answer-engine search — update
  these whenever hours, prices or the timetable change.
- Suburb coverage baked into copy: Perth CBD, East Perth, Highgate, Northbridge,
  Mount Lawley, Leederville.

## ⚠️ Before pointing the real domain

1. **Photography**: images in `assets/img/` come from the Grandstand brand PDF
   (textures, duotones, brand artwork). Swap in real gym photos — especially
   the kids creche and coach headshots. The `.duotone` CSS class applies the
   on-brand blue treatment to any photo.
2. **Official CrossFit affiliate logo**: the footer previously carried a
   wordmark treatment (removed on request); official affiliate logo files can
   be dropped in if wanted.
3. Enable the Netlify dashboard email notification (Forms → Notifications)
   as a backup lead-email channel, and whitelist the FormSubmit sender at the
   info@ mailbox.
4. Point grandstandcrossfit.com.au at Netlify (Domain management → add custom
   domain, update DNS at the registrar; HTTPS is automatic).
