"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Eye, VideoOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { videoPlaybackUrl, videoPosterUrl, resolveMedia } from "@/lib/media";
import type { PortfolioDisplayItem } from "@/lib/types/database";
import { formatDateOnly } from "@/lib/utils/format";
import { MediaImage } from "./media-image";
import { categoryLabel } from "./portfolio-gallery";

/** Lightbox for photos and on-demand player for videos (nothing is downloaded until opened). */
export function PortfolioViewer({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: PortfolioDisplayItem[];
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const item = index === null ? null : items[index];
  const [failedId, setFailedId] = useState<string | null>(null);
  const videoFailed = item !== null && failedId === item.id;

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "VIDEO") return;
      if (e.key === "ArrowRight") onIndexChange((index + 1) % items.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onIndexChange]);

  const video = item?.media_type === "video" ? resolveMedia(item.media_url) : null;

  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      title={item?.title ?? "Portfolio item"}
      hideTitle
      className="w-[min(100%-1rem,72rem)] bg-black"
    >
      {item && (
        <div>
          <div className="relative flex max-h-[75dvh] min-h-64 items-center justify-center bg-black">
            {item.media_type === "video" ? (
              video && !videoFailed ? (
                <video
                  key={item.id}
                  className="max-h-[75dvh] w-full bg-black object-contain"
                  src={videoPlaybackUrl(video.url)}
                  poster={videoPosterUrl(item.media_url, item.thumbnail_url) ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  onError={() => setFailedId(item.id)}
                >
                  Your browser cannot play this video.
                </video>
              ) : (
                <div className="flex flex-col items-center gap-3 py-24 text-muted">
                  <VideoOff className="size-8" aria-hidden />
                  <p>This video is not available right now.</p>
                </div>
              )
            ) : (
              <div className="relative h-[75dvh] w-full">
                <MediaImage src={item.media_url} alt={item.alt_text || item.title} fill sizes="100vw" className="object-contain" />
              </div>
            )}
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onIndexChange((index! - 1 + items.length) % items.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 hover:bg-black/90"
                  aria-label="Previous item"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onIndexChange((index! + 1) % items.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 hover:bg-black/90"
                  aria-label="Next item"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </>
            )}
          </div>
          <div className="space-y-2 bg-charcoal px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
              {categoryLabel(item.category)}
              {item.event_date && <span className="text-subtle"> · {formatDateOnly(item.event_date, { weekday: undefined })}</span>}
            </p>
            <h3 className="font-display text-3xl">{item.title}</h3>
            {item.description && <p className="max-w-3xl text-sm leading-relaxed text-muted">{item.description}</p>}
            {(item.views_label || item.social_url) && (
              <div className="flex flex-wrap items-center gap-4 pt-1 text-sm">
                {item.views_label && (
                  <span className="inline-flex items-center gap-1.5 text-paper">
                    <Eye className="size-4 text-gold" aria-hidden /> {item.views_label} views on Instagram
                  </span>
                )}
                {item.social_url && (
                  <a
                    href={item.social_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-gold underline-offset-4 hover:text-gold-bright hover:underline"
                  >
                    Watch on Instagram <ExternalLink className="size-3.5" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
