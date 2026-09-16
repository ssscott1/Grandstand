# Grandstand CrossFit — Website

Elite lead-generation rebuild of [grandstandcrossfit.com.au](https://www.grandstandcrossfit.com.au) —
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
- `sitemap.xml`, `robots.txt` (AI crawlers explicitly allowed), `llms.txt` for
  AI/answer-engine search.
- Suburb coverage baked into copy: Perth CBD, East Perth, Highgate, Northbridge,
  Mount Lawley, Leederville.

## ⚠️ Verify before launch

1. **Class times** in `timetable.html` are representative (built from known opening
   hours) — replace with the live booking-system timetable.
2. **Membership prices** in `pricing.html` are deliberately value-framed without
   dollar figures (only the $80 visitor week is published). Insert current rates
   in the `.amount` elements if you want visible pricing (it converts well).
3. **Photography**: this sandbox could not reach the live site, so images in
   `assets/img/` come from the Grandstand brand PDF (textures, duotones, brand
   artwork). Swap in real gym photos with the same filenames — or add new ones —
   and the design picks them up. The `.duotone` CSS class applies the on-brand
   blue treatment to any photo.
4. Coach cards in `about.html` use placeholder imagery — drop in real headshots.
5. Confirm phone (0411 371 661 / 08 9328 3134), socials and hours.
