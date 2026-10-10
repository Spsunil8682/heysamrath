"use client";

import { ImageOff } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { resolveMedia } from "@/lib/media";
import { cn } from "@/lib/utils/cn";

/**
 * next/image wrapper that accepts any stored media URL (local or Cloudinary), refuses unapproved
 * URLs, and degrades to a placeholder when the file is missing.
 */
export function MediaImage({
  src,
  alt,
  className,
  ...props
}: Omit<ImageProps, "src"> & { src: string | null | undefined }) {
  const [failed, setFailed] = useState(false);
  const media = resolveMedia(src);
  if (!media || failed) {
    return (
      <div
        role="img"
        aria-label={alt ? `${alt} (image unavailable)` : "Image unavailable"}
        className={cn("flex size-full items-center justify-center bg-panel-2 text-subtle", className)}
      >
        <ImageOff className="size-8" aria-hidden />
      </div>
    );
  }
  return <Image src={media.url} alt={alt} className={className} onError={() => setFailed(true)} {...props} />;
}
