# Nxt Rep Basketball website: rules for anyone (human or AI) editing this repo

Live site: https://nxtrepbasketball.com.au · Hosted on Vercel, deployed from `main`.
Owner: Yianni (Nxt Rep Basketball). Spelling: British/Australian English.

## How changes ship
- **Never push to `main`.** It is protected: every change goes on a branch and through a pull request, which Yianni reviews and merges.
- Vercel posts a preview link on every pull request. Check it before merging.
- The "Site checks" GitHub Action must pass (green tick) before merging. Run it locally with `python3 .github/scripts/check_site.py`.
- If a merge breaks the live site: Vercel → Deployments → last good deployment → Instant Rollback.
- The "Lint and security scan" workflow must also pass: HTMLHint (`.htmlhintrc`), ESLint (`eslint.config.mjs`, bans `innerHTML`/`eval`/`document.write`), Stylelint (`.stylelintrc.json`) and CodeQL. Fix the code, don't loosen the rules, unless Yianni agrees.
- **No inline code:** no `<script>` blocks, `on…=` handlers, `<style>` blocks or `style=""`. JavaScript goes in `/assets/*.js` (`defer`), styles in `style.css`. The site checks fail otherwise. The Content-Security-Policy in `vercel.json` is strict (no `'unsafe-inline'`), so browsers refuse to run inline code on the live site. Don't add `'unsafe-inline'` back.

## Stack
- Plain HTML + one `style.css`. No framework, no build step, no npm.
- Fonts: Bebas Neue (display) + DM Sans (body), loaded from Google Fonts in `style.css`.
- Palette: black `#0a0a0a`, off-white `#f5f5f0`, grey `#1a1a1a`, red `#e63329`. Use the CSS variables in `:root`.
- Every page must work at phone width (390px) with no sideways scrolling. Parents mostly visit on phones.

## URLs
- `vercel.json` has `"cleanUrls": true`. Internal links use clean paths: `/`, `/about`, `/programs`, `/partnerships`, `/contact`, `/assessment`. **Never** link to `something.html`.
- Asset paths are absolute (`/assets/...`).
- New page → add it to `sitemap.xml` (clean URL) and to the header, mobile nav and footer where relevant.

## Forms
- Both forms post to FormSubmit: `https://formsubmit.co/ajax/info@nxtrepbasketball.com.au` (already activated).
- `/assessment` is the main booking path (free first-session assessment). "Book Now" buttons and parent-facing CTAs go there.
- `/contact` stays for schools, clubs, partnerships and general enquiries. It nudges private-training enquiries to `/assessment`.
- The marketing-consent checkbox on `/assessment` must stay **optional** (consent can't be a condition of the free assessment).

## Branding
- Logo files in `/assets`: `logo-light.png` (off-white ink, for the dark site), `logo-dark.png` (black ink, for light backgrounds/print), `logo-mark-light.png` (emblem only, header). All transparent.
- Favicons: `favicon.ico` (root), `assets/icon-*-32/192/512.png`, `apple-touch-icon.png`. Light/dark tab icons switch via `prefers-color-scheme`.
- `assets/playfitkids_*.png` are leftovers from the old PlayFit Kids brand and are unused. PlayFit Kids is a separate business; don't mix it into this site.

## Content decisions (do not undo)
- **Shooting stats** (38% from three, 3.7 threes per game, two seasons among the Waratah League's best three-point shooters) appear **only** in the Shooting Coaching section, `/programs#shooting`. Not on the homepage, About page or elsewhere.
- "Shooting coach" / "shooting specialist" branding is fine anywhere.
- **Never claim "top scorer".** Accurate: finished 5th in Waratah League scoring (2026 season).
- Homepage stats bar: 5+ years coaching · 8+ years basketball experience · 2 years overseas pro · NSW based. Leave as is.
- Maccabi: "Coaching Director, Maccabi Basketball NSW" is a current contract (invoiced through Nxt Rep). Keep it to the About page and the Team Coaching card. Don't add it to headlines or the homepage.
- Pricing wording: "$100/hr at a court near you. Most families choose indoor, with court hire added at cost. Small groups from $30 per player." Group rates are per player: 2 = $50, 3 = $40, 4+ = $30.
- Don't invent credentials, stats, testimonials or reviews. Only use what Yianni has confirmed.

## Secrets
- None in this repo, and none should ever be. Anything in HTML/JS is public.
- If a server-side feature is added (Vercel function), secrets go in Vercel environment variables and a local `.env` (git-ignored). Never in code.
