"use client";

import { Eye, Play } from "lucide-react";
import { useState } from "react";
import { portfolioCategories } from "@/lib/config/site";
import { tileImageUrl } from "@/lib/media";
import type { PortfolioDisplayItem } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { MediaImage } from "./media-image";
import { PortfolioViewer } from "./portfolio-viewer";

export const categoryLabel = (value: string) => portfolioCategories.find((c) => c.value === value)?.label ?? value;

/**
 * layout="feature": the first tile is tall (spans two rows), which suits vertical reels and fills
 * a 3-column grid exactly with 5 items (or 2 columns with 5 items on tablets).
 */
export function PortfolioGallery({
  items,
  layout = "grid",
  columns = 3,
}: {
  items: PortfolioDisplayItem[];
  layout?: "grid" | "feature";
  columns?: 2 | 3;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <>
      <ul className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3")}>
        {items.map((item, i) => (
          <li key={item.id} className={cn(layout === "feature" && i === 0 && "sm:row-span-2")}>
            <button
              type="button"
              onClick={() => setActiveIndex(i)}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-panel text-left sm:aspect-auto sm:h-full sm:min-h-80"
              aria-label={`${item.media_type === "video" ? "Play video" : "View photo"}: ${item.title}`}
            >
              <MediaImage
                src={tileImageUrl(item)}
                alt={item.alt_text || item.title}
                fill
                sizes={columns === 2 ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
                className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-cinematic)] group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" aria-hidden />
              {item.views_label && (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-paper backdrop-blur-sm">
                  <Eye className="size-3.5 text-gold" aria-hidden />
                  {item.views_label} views
                </span>
              )}
              {item.media_type === "video" && (
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-black/30 backdrop-blur-sm transition-all duration-500 group-hover:scale-110 group-hover:border-gold group-hover:bg-gold/90 group-hover:text-ink"
                >
                  <Play className="ml-1 size-6" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 p-5">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
                  {categoryLabel(item.category)}
                </span>
                <span className="mt-1 block font-display text-2xl leading-tight text-paper">{item.title}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <PortfolioViewer
        items={items}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        onClose={() => setActiveIndex(null)}
      />
    </>
  );
}
