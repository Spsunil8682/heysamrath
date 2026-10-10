"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { HeroClip } from "@/lib/data/local-media";
import { cn } from "@/lib/utils/cn";

const CROSSFADE_SECONDS = 1.2;

function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null, // unknown on the server: render nothing, the still image shows instead
  );
}

function useSaveData(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData),
    () => true,
  );
}

/**
 * Background showreel: plays the hero clips in order with a crossfade. Phones play only the clips
 * marked "heroMobile" in local-media.json (all clips if none are marked); larger screens play all.
 * A clip whose orientation matches the screen fills it; otherwise (e.g. a vertical reel on a
 * desktop) it is shown whole over a blurred, enlarged copy of its poster, so nothing is cropped away.
 * Only the current and next clip are downloaded. Skipped for reduced motion / data saver, where the
 * still hero image underneath is shown instead.
 */
export function HeroVideoRotator({ clips: allClips }: { clips: HeroClip[] }) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const portraitScreen = useMediaQuery("(orientation: portrait)");
  const phone = useMediaQuery("(max-width: 767px)");
  const clips = useMemo(() => {
    const mobileClips = allClips.filter((c) => c.mobile);
    return phone && mobileClips.length ? mobileClips : allClips;
  }, [allClips, phone]);
  const saveData = useSaveData();

  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  const advancing = useRef(false);

  const count = clips.length;
  const current = count ? active % count : 0;
  const next = count ? (current + 1) % count : 0;

  const advance = useCallback(() => {
    if (advancing.current || count < 2) return;
    advancing.current = true;
    setActive((a) => (a + 1) % count);
  }, [count]);

  // Start the active clip from the beginning whenever it changes.
  useEffect(() => {
    const video = refs.current[current];
    if (!video) return;
    advancing.current = false;
    video.currentTime = 0;
    video.play().catch(() => {
      // Autoplay blocked (e.g. low-power mode): the still image stays visible.
    });
  }, [current, clips, portraitScreen, reducedMotion, saveData]);

  if (reducedMotion !== false || saveData || portraitScreen === null || phone === null || count === 0) return null;

  return (
    <div className={cn("absolute inset-0 transition-opacity duration-1000", visible ? "opacity-100" : "opacity-0")} aria-hidden>
      {clips.map((clip, i) => {
        const nearby = i === current || i === next;
        const letterbox = clip.landscape === portraitScreen; // orientation differs from the screen
        return (
          <div
            key={clip.src}
            className={cn("absolute inset-0 overflow-hidden bg-ink transition-opacity ease-linear", i === current ? "opacity-100" : "opacity-0")}
            style={{ transitionDuration: `${CROSSFADE_SECONDS}s` }}
          >
            {letterbox && nearby && (
              // eslint-disable-next-line @next/next/no-img-element -- decorative blurred backdrop, already a small JPEG
              <img src={clip.poster} alt="" className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-2xl" />
            )}
            <video
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={cn("absolute inset-0 size-full", letterbox ? "object-contain" : "object-cover")}
              src={clip.src}
              poster={nearby ? clip.poster : undefined}
              muted
              playsInline
              loop={count === 1}
              preload={nearby ? "auto" : "none"}
              disablePictureInPicture
              tabIndex={-1}
              onPlaying={() => i === current && setVisible(true)}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                // Begin the next clip slightly early so the two overlap during the crossfade.
                if (i === current && v.duration && v.duration - v.currentTime <= CROSSFADE_SECONDS) advance();
              }}
              onEnded={() => i === current && advance()}
              onError={() => i === current && advance()}
            />
          </div>
        );
      })}
    </div>
  );
}
