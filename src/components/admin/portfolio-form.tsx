"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { savePortfolioItem } from "@/app/admin/_actions/portfolio";
import { FormStatus } from "@/components/admin/form-status";
import { MediaImage } from "@/components/portfolio/media-image";
import { Button, buttonClass } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { initialActionState } from "@/lib/admin/action-state";
import { portfolioCategories } from "@/lib/config/site";
import { isAllowedMediaUrl, tileImageUrl } from "@/lib/media";
import type { PortfolioItem } from "@/lib/types/database";

const mediaHint = (
  <>
    Local: <code>/media/videos/name.mp4</code> (file in <code>public/media/…</code>, needs a redeploy) · Cloudinary:{" "}
    <code>https://res.cloudinary.com/&lt;cloud&gt;/video/upload/…</code>
  </>
);

export function PortfolioForm({ item }: { item?: PortfolioItem }) {
  const [state, action, pending] = useActionState(savePortfolioItem, initialActionState);
  const [mediaType, setMediaType] = useState(item?.media_type ?? "video");
  const [mediaUrl, setMediaUrl] = useState(item?.media_url ?? "");
  const [thumb, setThumb] = useState(item?.thumbnail_url ?? "");
  const fe = state.fieldErrors ?? {};
  const preview = tileImageUrl({ media_type: mediaType, media_url: mediaUrl, thumbnail_url: thumb || null });

  return (
    <form action={action} className="grid gap-8 xl:grid-cols-[1fr_20rem]">
      <div className="space-y-5">
        {item && <input type="hidden" name="id" value={item.id} />}
        <Field id="title" label="Title" required error={fe.title}>
          <Input id="title" name="title" defaultValue={item?.title} required maxLength={140} />
        </Field>
        <Field id="description" label="Description" error={fe.description}>
          <Textarea id="description" name="description" defaultValue={item?.description} maxLength={4000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="category" label="Category" error={fe.category}>
            <Select id="category" name="category" defaultValue={item?.category ?? "events"}>
              {portfolioCategories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="mediaType" label="Media type" error={fe.mediaType}>
            <Select id="mediaType" name="mediaType" value={mediaType} onChange={(e) => setMediaType(e.target.value as "image" | "video")}>
              <option value="video">Video</option>
              <option value="image">Photo</option>
            </Select>
          </Field>
          <Field id="eventDate" label="Event date (optional)" error={fe.eventDate}>
            <Input id="eventDate" name="eventDate" type="date" defaultValue={item?.event_date ?? ""} />
          </Field>
        </div>
        <Field id="mediaUrl" label={mediaType === "video" ? "Video URL" : "Image URL"} required error={fe.mediaUrl} hint={mediaHint}>
          <Input id="mediaUrl" name="mediaUrl" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} required aria-invalid={!!mediaUrl && !isAllowedMediaUrl(mediaUrl)} />
        </Field>
        <Field
          id="thumbnailUrl"
          label={mediaType === "video" ? "Poster / thumbnail URL" : "Thumbnail URL (optional)"}
          required={mediaType === "video"}
          error={fe.thumbnailUrl}
          hint="A still image shown in the grid so the video never loads until someone plays it."
        >
          <Input id="thumbnailUrl" name="thumbnailUrl" value={thumb} onChange={(e) => setThumb(e.target.value)} />
        </Field>
        <Field id="altText" label="Alt text" error={fe.altText} hint="Describe the image for people using screen readers.">
          <Input id="altText" name="altText" defaultValue={item?.alt_text} maxLength={300} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="displayOrder" label="Display order" error={fe.displayOrder} hint="Lower shows first">
            <Input id="displayOrder" name="displayOrder" type="number" defaultValue={item?.display_order ?? 100} />
          </Field>
          <div className="flex flex-col justify-center gap-3 sm:col-span-2">
            <Checkbox name="published" defaultChecked={item?.published ?? false} label="Published (visible on the website)" />
            <Checkbox name="featured" defaultChecked={item?.featured ?? false} label="Featured on the home page" />
          </div>
        </div>
        <FormStatus state={state} />
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Link href="/admin/portfolio" className={buttonClass("ghost")}>
            Cancel
          </Link>
        </div>
      </div>
      <aside>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Preview</p>
        <div className="relative mt-2 aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-panel">
          {preview ? (
            <MediaImage key={preview} src={preview} alt="" fill sizes="20rem" className="object-cover" />
          ) : (
            <p className="p-6 text-sm text-subtle">Enter a valid media URL to preview.</p>
          )}
        </div>
      </aside>
    </form>
  );
}
