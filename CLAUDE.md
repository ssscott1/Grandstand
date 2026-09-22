# Grandstand CrossFit — brand compliance (binding)

**Every design decision in this repo must match the Grandstand brand guideline
document until the user uploads a new one.** The source document is the 2018
"Grandstand Brand Review v1.0" PDF. Its 21 pages are archived as compressed
JPGs at `docs/brand/page01.jpg` … `page21.jpg` — read them before making any
visual change (logo, colour, type, badge/tag treatment, photo treatment,
layout mood) if you're unsure whether it's on-brand. This file is the
standing summary; the PDF pages are the source of truth if they ever
disagree with this summary.

## Colours
- Grandstand Blue `#00ADEF`
- Grandstand Charcoal `#141314`
- Off-white/paper background `#F5F4F2` (used behind the logo on light pages)
- No other brand colours exist. Don't introduce accent colours.

## Logo — wordmark
- The primary and secondary logos are both the same word, "GRANDSTAND",
  set in a bold condensed slab/grotesk display face (site uses Anton as
  the closest available web font), all caps.
- **Primary lockup**: two lines, "GRAND" / "STAND", tilted a few degrees
  counter-clockwise (~-2°), each line's baseline sits slightly offset from
  the other (a hand-cut, screen-printed feel — see `docs/brand/page04.jpg`,
  `page05.jpg`, `page15.jpg`, `page19.jpg`, `page20.jpg`).
- **Secondary lockup**: one line, "GRANDSTAND", flat baseline, same slight
  tilt (`page06.jpg`, `page07.jpg`).
- Colour: black wordmark on paper/off-white or on Grandstand Blue; white
  wordmark on Grandstand Charcoal or on a dark/duotone photo. Never
  colour the wordmark itself blue-on-blue or use a gradient.
- **The wordmark always stands alone or beside a separate tagline badge —
  never fused with another mark into one glyph.** There is no compound
  "logo + icon" lockup in the brand doc.
- The site header (`<a class="logo">` on every page) renders the tilted
  two-line wordmark alone, in an SVG sized to the text (no extra badge in
  the header — a header/nav bar is too small to show the tagline badge
  legibly, so it's reserved for larger placements, see below).

## The "GS" monogram — one narrow, specific use only
- The only place a circular blue badge with "GS" letters appears in the
  brand doc is as the **Instagram profile-picture avatar** (`page17.jpg`),
  i.e. a tiny square-app-icon context completely separate from the
  wordmark.
- **Do not** attach a "GS" monogram badge to the wordmark anywhere else
  (header, footer, hero, favicon composition next to the logo, etc.) — a
  previous version of this site incorrectly fused a "GS" circle onto the
  header logo; that has been corrected (2026-09-22) and must not
  reappear. `assets/img/favicon.svg` (a circular blue "GS" mark used only
  as the actual favicon/app icon) is the one legitimate use — leave it as
  is, don't extend that treatment elsewhere.

## The tagline badge — "A Culture Built on CrossFit"
- A separate, genuine brand element: the positioning statement set in a
  solid Grandstand Blue shape with black text, placed **beside** the
  wordmark (not fused with it) in larger applications — hero sections,
  merch, wall art (`page10.jpg`, `page11.jpg`, `page15.jpg`, `page17.jpg`,
  `page19.jpg`, `page20.jpg`, `page21.jpg`).
- Valid shapes, per `page11.jpg`: hexagon, square, or circle — all shown
  as equally acceptable. The site uses a hexagon (`.culture-badge` in
  `assets/css/styles.css`), placed on the home hero. That's the reference
  implementation for any future placement of this badge.
- Reserve this badge for a real hero-scale placement, not the compact
  header/nav — it's illegible at that size and the doc never shows it
  there.

## Texture and tone
- "Chalk scratchings": white or blue hand-drawn underlines/strikethroughs
  used to add emphasis or cross out a word for effect (see `page09.jpg`
  "the FAILS" struck out, "PBs" circled) — already implemented as
  `.chalk` in the stylesheet.
- "Torn paper" edges between dark and light sections, hand-scratched
  photo overlays, high-contrast duotone treatments on photography — all
  already implemented (`.torn`, `.duotone` in the stylesheet). Keep using
  them; don't introduce a different section-break or photo-treatment
  style.
- Photography is real gym/member photography, not stock — energetic,
  unposed, mid-rep. Never invent or fabricate photography; use real
  photos the user supplies (see `assets/img/photo-*.jpg`).

## Never
- Never recreate CrossFit LLC's own official affiliate logo artwork —
  only generic wordmark/text treatments for "CrossFit" as a word.
- Never invent a new brand colour, a new logo lockup, or a new tagline
  badge shape not shown in `docs/brand/`.
- Never fuse the wordmark with any icon/monogram into a single mark.

## When a new brand document is uploaded
Replace `docs/brand/*.jpg` with pages from the new document, rewrite this
file's rules to match it, and re-audit every page's header, hero badges,
colour tokens and photo treatments against the new source before
considering the migration done.
