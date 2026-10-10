# Hey Samrath: videography booking website

A full-stack website for a videographer and video editor:

- **Public site:** cinematic home page, portfolio with video player and photo lightbox, services, a live availability calendar, booking requests and a contact form.
- **Admin dashboard** (`/admin`): manage bookings, the calendar, portfolio, services and business settings.

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS 4, Lucide icons, Cormorant Garamond + Manrope via `next/font` |
| Data / auth | Supabase Postgres + Supabase Auth, Row Level Security, SQL functions |
| Forms | React Hook Form + Zod (the same schemas validate on the server) |
| Dates | `date-fns` + `@date-fns/tz`; scheduling maths happens in Postgres |
| Tests | Vitest, PGlite (Postgres in WASM), embedded-postgres for real concurrency tests |

The site name is "Hey Samrath". Change it in `/admin/settings`, which updates the site at runtime, and in `src/lib/config/site.ts`, which holds the build-time defaults and metadata.

---

## 1. Quick start (local)

Requirements: Node.js 20.9+ (tested on Node 24) and a free Supabase project.

```bash
cd website
npm install
cp .env.example .env.local      # then fill in the two Supabase values (section 2)
npm run dev                     # http://localhost:3000
```

Without the Supabase values, pages still render. They show honest "unavailable" states instead of fake data.

## 2. Supabase setup

1. **Create a project** at <https://supabase.com/dashboard>. Choose a region close to your customers (e.g. Mumbai `ap-south-1`).
2. **Run the migrations.** In **SQL Editor**, paste and run each file from `supabase/migrations/` in filename order:
   1. `20261010000001_schema.sql`: tables, constraints, indexes
   2. `20261010000002_booking_logic.sql`: booking rules, conflict prevention, RPCs, triggers
   3. `20261010000003_security.sql`: grants and Row Level Security policies

   Alternatively, with the [Supabase CLI](https://supabase.com/docs/guides/cli): `npx supabase link --project-ref <ref>` and then `npx supabase db push`.
3. **Load the starter content (optional):** run `supabase/seed.sql`. This adds six services with no prices ("Price on request") and the four portfolio videos in `public/media`.
4. **Copy the API values** from **Project Settings → API Keys** into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: the project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the **publishable** key (`sb_publishable_…`).
   - The app **never needs the secret / service-role key.** Don't add it anywhere.
5. **Lock down sign-ups:** **Authentication → Sign In / Providers → Email**, turn off **Allow new users to sign up**. Only you need an account.

### Create the first administrator (one time)

Admin rights live in `public.profiles.role`. No API path can change them. Users cannot promote themselves; the database tests verify this.

1. **Authentication → Users → Add user → Create new user.** Enter your email and a strong password, and tick **Auto Confirm User**.
2. In **SQL Editor** (which runs as the database owner), run:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   -- Expect: UPDATE 1
   ```

3. Sign in at `/admin/login`.

To remove an admin, run the same statement with `role = 'customer'`. To add another admin, repeat both steps.

### Recommended Supabase settings

- **Auth → URL Configuration:** set the Site URL to your production URL.
- **Auth → Rate Limits:** keep the defaults. The login form also throttles attempts per IP.
- Turn on **MFA** for your own account if your plan allows it.

## 3. Environment variables

| Variable | Required | Where it is used |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | browser and server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | browser and server. Safe to expose because RLS protects every table. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works. |
| `NEXT_PUBLIC_SITE_URL` | recommended | sitemap, robots, Open Graph links |
| `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFICATION_EMAIL` | optional | server only: emails you about new requests and messages |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | optional, later | server only, except the cloud name. See [docs/CLOUDINARY.md](docs/CLOUDINARY.md). |

`src/lib/env.ts` validates configuration and prints actionable errors. It refuses to start if a `sb_secret_…` key is placed in a public variable. `.env*` files are git-ignored except `.env.example`.

## 4. How bookings work

```
Visitor ──POST /api/bookings──▶ Zod validation, honeypot, timing check, IP throttle
                                 │
                                 ▼
                    create_booking_request()  (SECURITY DEFINER SQL function)
                    • service active? date not past / within window / min notice?
                    • inside working hours? not on a blocked range?
                    • not overlapping a CONFIRMED booking (+ buffer)? day limit OK?
                    • per-contact + global rate limits, duplicate-request guard
                    • inserts status = 'pending', returns reference BK-XXXXXXXX
```

- **Pending requests never hold the calendar.** Only confirmed bookings do, so there are no holds that need to expire.
- **Confirming** (`/admin/bookings/<id>`) is an `UPDATE … status = 'confirmed'`. A `BEFORE` trigger, in the same transaction:
  - takes a calendar-wide advisory lock;
  - re-checks blocks, overlaps (including the buffer) and the per-day limit;
  - then sets `occupied` (a `tstzrange`).
- **Hard guarantee:** the `EXCLUDE USING gist (occupied WITH &&)` constraint makes two overlapping confirmed bookings impossible. This holds even if application code is bypassed or two admins click at the same moment. The test suite proves it with two real Postgres connections.
- **Moving a confirmed booking** re-runs the same checks.
- **Blocking time** is refused if it overlaps a confirmed booking.
- **Lowering the per-day limit** is refused if upcoming dates already exceed it.
- **Changing the time zone** is refused while upcoming bookings exist.
- **Changing working hours** never drops confirmed bookings. The settings page lists any that now fall outside the hours.
- **Calendar per service:** a service can be marked as *not occupying the shoot calendar* (default for "Professional Video Editing"). Remote work can then overlap shoots. This is the explicit resource rule; all other services share one calendar, because there is one videographer.
- **Time zones:** event dates and times are stored as local wall-clock values (`date` + `time`) in the business time zone. Instants (`starts_at`, `ends_at`, audit timestamps) are `timestamptz`, computed by Postgres. Postgres applies daylight-saving rules for each date.

Status flow: `pending → confirmed | rejected | cancelled`, `confirmed → cancelled | completed`, and `rejected / cancelled → pending` (reopen). `completed` is only allowed after the event starts. Every change is recorded in `booking_events`.

### Database tables

`profiles`, `business_settings` (single row), `services`, `portfolio_items`, `bookings`, `availability_blocks`, `booking_events` (audit), `contact_messages`.

Beyond the requested fields, these columns support the rules above:

- `bookings`: `starts_at`/`ends_at`/`occupied` (derived), `consent_at`, `status_changed_at`, `confirmed_at`, `rejected_at`, `cancelled_at`, `completed_at`
- `services`: `booking_mode` (`timed` | `full_day`), `blocks_calendar`, `price_is_starting`
- `portfolio_items`: `alt_text`, `event_date`
- `availability_blocks`: `blocked` (derived range), `created_by`
- `business_settings`: `buffer_minutes`, `min_notice_hours`, `max_advance_days`, `allow_multiple_per_day`, `max_bookings_per_day`

## 5. Security model

- RLS is enabled on every table. Privileges are revoked and then granted explicitly. This matters because Supabase stopped exposing new tables to the Data API by default during 2026.
- **Public (`anon`) can:**
  - read active services, published portfolio items and business settings;
  - call `get_availability` (busy time ranges only: no names, references or block reasons);
  - call `create_booking_request` and `submit_contact_message`.
- **Public cannot** read or modify bookings, admin notes, blocks, messages, profiles or the audit log.
- **Admins** are checked by `is_admin()`, which reads `profiles.role` in the database (never JWT metadata). Every Server Action re-checks the session and role (`src/lib/admin/with-admin.ts`), and RLS enforces it again in Postgres.
- `profiles` has no INSERT or UPDATE grant for API roles, plus a trigger that blocks role changes from them. New auth users always get `customer`.
- Media URLs are allow-listed in both Zod and a database `CHECK`: only `/media/…` and `https://res.cloudinary.com/…`.
- **Other protections:**
  - security headers in `next.config.ts`;
  - `noindex` on the admin area;
  - Origin checks on POST endpoints;
  - generic error messages (database internals are never shown).

## 6. Media: local first

### Adding videos (the easy way)

1. Copy new clips into the footage folder next to this project: `samrath/video/`. Phone `.MOV` files are fine.
2. Run:

   ```bash
   npm run media:import
   ```

   For each new video this creates:
   - `public/media/videos/<name>.<hash>.mp4`: H.264 720p that plays in every browser (phone footage is often HEVC, which Chrome and Android can't play);
   - `public/media/thumbnails/<name>.<hash>.jpg`: a poster frame;
   - `public/media/hero/<name>.<hash>.mp4`: a 6-second clip for the rotating home-page background;
   - an entry in `src/lib/config/local-media.json`.

   Videos already imported are skipped. The `<hash>` part of each name changes whenever a file is re-encoded, so visitors never see a stale cached copy. The script uses ffmpeg (a copy is bundled as a dev dependency), so it also handles footage macOS can't decode, such as 4K 120 fps clips.
3. Open `src/lib/config/local-media.json` and adjust each entry:
   - `title`, `description`, `altText`;
   - `category`: one of `weddings`, `pre_wedding`, `events`, `commercial`, `social_reels`, `video_editing`, `photography`;
   - `featured` shows it on the home page;
   - `published: false` hides it;
   - `hero: false` keeps it out of the home-page background;
   - `posterAt` (seconds) chooses a different poster frame;
   - `instagramUrl` and `views` (e.g. `"1M"`) add a "Watch on Instagram" link and a views badge. Videos with either appear in the home page's Instagram spotlight.

   The order of entries in the file is the order on the site and in the hero showreel.

   Re-running the import keeps your edits.
4. **If a clip shows up sideways** (some exports are stored rotated), add `"rotate": 270` (or `90` / `180`, degrees clockwise) to its entry and run `npm run media:import` again. That clip is re-encoded upright. `couple`, `outdoor shot` and `kids` already have this set.
5. Reload the dev site, or commit and redeploy for production.

The portfolio shows these local videos **with or without Supabase**. When the database is connected, entries added in `/admin/portfolio` (e.g. Cloudinary videos) are shown alongside them. A database entry with the same video URL replaces the local one. `/admin/portfolio` also lists the local library read-only.

### Home-page background

The hero plays a crossfading showreel of the hero clips:
- every clip with `hero: true`, in manifest order, on every device. A clip that doesn't match the screen's orientation (e.g. a vertical reel on a laptop) is shown whole over a blurred backdrop instead of being cropped;
- only the current and next clip download (about 1 MB each);
- skipped for visitors with *reduced motion* or *data saver* turned on, who see the still image instead.

Switch it off with `heroBackground: "image"` in `src/lib/config/site.ts`.

### How local media behaves

```
public/media/
  videos/      MP4 (H.264 + AAC), full portfolio videos
  hero/        short muted background clips
  thumbnails/  video poster frames
  images/      photos (JPG/WebP)
  logos/       logo files
```

- **Videos are never preloaded in the portfolio.** Tiles show the poster image; the MP4 loads only when someone opens it.
- **Missing files** show a placeholder instead of a broken image.
- **Local files ship with the deployment.** Adding or changing files needs a new commit and deploy. Files can't be uploaded to the server at runtime, because serverless hosts don't keep written files.
- **Size limits:** GitHub rejects files over 100 MB; the importer warns before that happens. The current library is about 110 MB. Hosting it all locally works, but every view costs your host bandwidth, and the repository will keep growing. Past a few dozen videos, move to Cloudinary ([docs/CLOUDINARY.md](docs/CLOUDINARY.md)); the UI doesn't change, because `src/lib/media.ts` handles both.

## 7. Scripts and tests

```bash
npm run dev         # development server
npm run build       # production build (works without Supabase variables)
npm run start       # serve the production build
npm run typecheck   # tsc
npm run lint        # eslint
npm test            # all tests (unit + database + concurrency)
npm run check       # typecheck + lint + tests
npm run media:import  # import new videos from ../video (section 6)
```

The database tests run the real migrations:
- `tests/db/booking.test.ts` uses **PGlite** with a small stand-in for Supabase's `auth` schema and API roles.
- `tests/db/concurrency.test.ts` uses **embedded-postgres**, which downloads a Postgres binary on install, so it can open several real connections.

**Covered:**
- valid and invalid requests;
- past dates and dates outside the booking window or notice period;
- closed days and working hours;
- blocked dates, fully booked days and buffer overlaps;
- the exclusion-constraint backstop;
- simultaneous confirmations, and a block racing a confirmation;
- status-machine rules;
- unauthorised reads and writes as `anon` and as a signed-in non-admin;
- self-promotion attempts;
- leakage of private data through the availability API;
- media URL allow-list, settings guards and rate limits;
- validation schemas, slot calculation, Cloudinary signatures, and error mapping (database errors never leak).

## 8. Deployment

### Hosting: what is actually free (checked October 2026)

| Service | Free tier and commercial use | Notes |
| --- | --- | --- |
| **Vercel Hobby** | **Not allowed for commercial use.** The Fair Use Guidelines limit Hobby to "non-commercial personal use only"; advertising a paid service counts as commercial. | Use **Vercel Pro ($20 per seat per month)** for this site. Free `*.vercel.app` subdomain with HTTPS. |
| **Netlify Free** | No commercial restriction in its terms (Netlify staff have confirmed commercial use is fine). | 300 credits a month, hard cap: about 15 GB of bandwidth, or fewer if you deploy often (15 credits per production deploy). Personal plan is $9/month. Next.js supported via OpenNext. Free `*.netlify.app` subdomain with HTTPS. |
| **Cloudflare Workers Free** (OpenNext) | No restriction found in the docs. | 100k requests a day, **10 ms CPU per request** and a **3 MiB compressed** Worker-size cap. Both are tight for this app. Paid plan is $5/month. |
| **Supabase Free** | No commercial restriction stated. | 500 MB database, 5 GB egress, 2 projects, **no backups**, and **paused after 7 days without activity** (a quiet booking site can go offline). Pro is $25/month (no pausing, daily backups). |
| **Cloudinary Free** | Commercial use not addressed on the pricing pages. | 25 credits a month (1 credit = 1 GB storage, 1 GB bandwidth or 1,000 transformations). **Maximum video upload: 100 MB.** |
| **Resend Free** | No restriction found. | 3,000 emails a month, 100 a day. |

Limits change. Re-check the pricing and terms pages before launch. **None of this can be promised free forever.** A realistic always-on setup costs about:
- **$0–9/month:** Netlify Free or Personal with Supabase Free, accepting pausing and no backups; or
- **$45/month:** Vercel Pro with Supabase Pro.

Video bandwidth is the cost to watch: every play of a 30 MB local video is 30 MB of transfer from your host.

### Steps (Vercel or Netlify)

1. Push the `website/` folder to a GitHub repository:

   ```bash
   cd website
   git add -A && git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

2. **Import the repository:**
   - **Vercel:** New Project, then Import. The framework is detected automatically.
   - **Netlify:** Add new site, then Import from Git. The Next.js runtime is applied automatically.
   - If the repository root is not `website/`, set **Root Directory** to `website`.
3. **Add environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL` (your production URL);
   - the optional email variables.
4. **Deploy.** HTTPS is automatic on the free subdomain and on custom domains.
5. In Supabase **Auth → URL Configuration**, set the Site URL to the production URL.
6. **Smoke-test:**
   - make a booking from a phone;
   - confirm it in `/admin`;
   - check that the date shows as booked on `/availability`.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| Pages say "unavailable" and the logs show `Missing environment variable(s)` | Set the Supabase variables in the host, then **redeploy**. `NEXT_PUBLIC_*` values are compiled in at build time. |
| `permission denied for table …` | Migration 3 (`…_security.sql`) wasn't run, or ran before migration 1. Re-run all three in order. |
| Login says "does not have administrator access" | Run the `update public.profiles set role = 'admin'` statement for that email. |
| Booking fails with `CLOSED_DAY` / `OUTSIDE_HOURS` | Check working hours in `/admin/settings`. |
| Site stopped working after a quiet week | The Supabase Free project was paused. Restore it in the dashboard, or upgrade. |
| Video doesn't play in Chrome or Android | The file is probably HEVC. Re-export as H.264 MP4. |
| `git push` rejected: file over 100 MB | Compress the video (section 6) or move it to Cloudinary. |
| Images from Cloudinary don't show | The URL must start with `https://res.cloudinary.com/`. Other hosts are rejected on purpose. |

## 9. Project structure

```
website/
├─ src/app/(site)/…           public pages (home, portfolio, services, booking, availability, contact, privacy)
├─ src/app/admin/…            login, dashboard, bookings, calendar, portfolio, services, messages, settings, Server Actions
├─ src/app/api/…              bookings, availability, contact, admin/cloudinary-signature
├─ src/components/…           ui, layout, home, portfolio, booking, calendar, admin
├─ src/lib/config/site.ts     brand config (name, tagline, images, budget ranges, testimonials)
├─ src/lib/media.ts           local / Cloudinary media abstraction
├─ src/lib/validation/…       Zod schemas shared by client and server
├─ src/lib/supabase/…         public, server and proxy clients
├─ src/proxy.ts               session refresh and optimistic admin redirect
├─ supabase/migrations/…      versioned SQL
├─ supabase/seed.sql          starter content
└─ tests/{unit,db}            Vitest suites
```

## 10. Things to fill in before launch

- **Real details:** business name, contact details, WhatsApp, socials and working hours (`/admin/settings`).
- **Services:** real prices in `/admin/services`. They show "Price on request" until set.
- **About text:** edit the About copy in `src/app/(site)/page.tsx` in your own words.
- **Testimonials:** add real ones, with permission, to `testimonials` in `src/lib/config/site.ts`. The section stays hidden while the list is empty.
- **Privacy:** review `/privacy` against local law (e.g. India's DPDP Act).
- **Budget ranges:** `budgetRanges` in `src/lib/config/site.ts` is in ₹. Change it if you use another currency.
