# Moving media to Cloudinary

The site stores **media URLs**, not files, in Supabase (`portfolio_items.media_url`, `thumbnail_url`, `services.cover_image_url`, `business_settings.logo_url`). The UI resolves every URL through `src/lib/media.ts`, so local paths and Cloudinary URLs can be mixed. Entries can be migrated one at a time without breaking anything.

## What already works with no configuration

Paste a Cloudinary delivery URL into any media field in the admin and it works:

- **Images** go through `next/image`; `res.cloudinary.com` is already in `images.remotePatterns`.
- **Videos** are served with `f_auto,q_auto` added automatically, so each browser gets the best format.
- **Missing poster on a Cloudinary video:** a frame is generated automatically (`so_2,f_jpg`).

Only `https://res.cloudinary.com/<cloud>/(image|video)/upload/…` is accepted. The database `CHECK` constraint and the Zod schema both reject other hosts.

## 1. Create the account

1. Sign up at <https://cloudinary.com>.
2. In **Settings → API Keys**, note:
   - the **Cloud name**;
   - the **API key**;
   - the **API secret**. It is **secret**: never commit it or put it in a `NEXT_PUBLIC_` variable.
3. Know the free-plan limits (checked October 2026; re-check before relying on them):
   - 25 credits a month in total, where 1 credit is 1 GB of storage, 1 GB of bandwidth or 1,000 transformations;
   - **maximum video upload: 100 MB**;
   - every play of a video uses bandwidth credits.

## 2. Upload existing local media (manual and safe)

1. In **Media Library**, create a folder called `portfolio`.
2. Upload the files from `public/media/videos`, `public/media/thumbnails` and `public/media/images`.
3. Copy each asset's delivery URL, e.g. `https://res.cloudinary.com/<cloud>/video/upload/v1730000000/portfolio/dj-night.mp4`.

## 3. Point the database at Cloudinary

**Option A: one entry at a time.** Edit the entry in `/admin/portfolio`, paste the new URLs and save. The public pages update immediately.

**Option B: in bulk (SQL Editor).** Example for files uploaded with the same names into `portfolio/`:

```sql
-- Preview first
select id, media_url, thumbnail_url from public.portfolio_items where media_url like '/media/%';

-- Then update (replace <cloud> and the version segment you were given)
begin;
update public.portfolio_items
set media_url = replace(media_url, '/media/videos/', 'https://res.cloudinary.com/<cloud>/video/upload/v1730000000/portfolio/')
where media_url like '/media/videos/%';

update public.portfolio_items
set thumbnail_url = replace(thumbnail_url, '/media/thumbnails/', 'https://res.cloudinary.com/<cloud>/image/upload/v1730000000/portfolio/')
where thumbnail_url like '/media/thumbnails/%';
-- Check the result, then:
commit;   -- or: rollback;
```

The `CHECK` constraints reject any malformed URL, so a bad replace fails instead of saving broken data.

**Cached pages:** the public site caches portfolio data for up to an hour. Editing through the admin refreshes it instantly. After a bulk SQL update, either wait for the cache to expire or save any one portfolio item in the admin to clear it.

## 4. Remove the local copies (optional)

When nothing in the database references a local file any more, check with:

```sql
select media_url from public.portfolio_items where media_url like '/media/%'
union all
select thumbnail_url from public.portfolio_items where thumbnail_url like '/media/%';
```

Then delete the files from `public/media/` and redeploy. Keep `public/media/images/hero-temple-gate.jpg` and the portraits used by `src/lib/config/site.ts`, or change those paths to Cloudinary URLs too.

## 5. Uploads from the admin (when you want them)

Uploading must go **browser → Cloudinary** directly. Serverless hosts limit request sizes (a few MB) and do not keep files written to disk.

The server half is already implemented:

- `POST /api/admin/cloudinary-signature` is **admin-only**. It returns a signed `{ timestamp, folder, signature, apiKey, cloudName }`.
- The API secret never leaves the server. The folder is fixed by the server, so the browser can't sign arbitrary parameters.

To enable it, set these in `.env.local` and in your host:

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
```

Then add an upload button to `src/components/admin/portfolio-form.tsx` that does the following:

```ts
const sig = await fetch("/api/admin/cloudinary-signature", { method: "POST" }).then((r) => r.json());
const form = new FormData();
form.append("file", file);
form.append("api_key", sig.data.apiKey);
form.append("timestamp", String(sig.data.timestamp));
form.append("folder", sig.data.folder);
form.append("signature", sig.data.signature);
const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.data.cloudName}/auto/upload`, { method: "POST", body: form });
const uploaded = await res.json();   // uploaded.secure_url → put into the Media URL field
```

You could use an **unsigned upload preset** instead. Only do that with a preset restricted to one folder, allowed formats and a maximum file size, because anyone who finds the preset name can upload to your account.
