"use client";

import { CheckCircle2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/** Cloudinary's free plan rejects videos over 100 MB (images: 10 MB). */
const MAX_BYTES = { video: 100 * 1024 * 1024, image: 10 * 1024 * 1024 };

export type UploadResult = { mediaType: "video" | "image"; mediaUrl: string; posterUrl: string | null };

type Signature = { timestamp: number; folder: string; signature: string; apiKey: string; cloudName: string };

/**
 * Uploads a file straight from the browser to Cloudinary (the server only signs the request, so the
 * API secret never reaches the browser and large files never pass through the website's server).
 * Hidden unless NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is set.
 */
export function CloudinaryUpload({ onUploaded }: { onUploaded: (r: UploadResult) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) return null;

  const upload = async (file: File) => {
    setError(null);
    setDone(null);
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!kind) return setError("Choose a video or photo file.");
    if (file.size > MAX_BYTES[kind]) {
      return setError(
        kind === "video"
          ? "This video is over 100 MB, Cloudinary's free limit. Export it smaller (e.g. 1080p) and try again."
          : "This photo is over 10 MB. Please choose a smaller one.",
      );
    }

    setProgress(0);
    try {
      const sigRes = await fetch("/api/admin/cloudinary-signature", { method: "POST" });
      const sig = (await sigRes.json().catch(() => null)) as { ok: boolean; data?: Signature; message?: string } | null;
      if (!sigRes.ok || !sig?.ok || !sig.data) throw new Error(sig?.message ?? "Could not start the upload.");

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.data.apiKey);
      form.append("timestamp", String(sig.data.timestamp));
      form.append("folder", sig.data.folder);
      form.append("signature", sig.data.signature);

      // XMLHttpRequest (not fetch) so we can show upload progress for large videos.
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.data!.cloudName}/${kind}/upload`);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
          const body = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) resolve(body);
          else reject(new Error(body?.error?.message ?? `Upload failed (${xhr.status}).`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload. Check your connection and try again."));
        xhr.send(form);
      });

      // Cloudinary serves a frame of any video as a JPEG when the extension is changed to .jpg.
      const posterUrl = kind === "video" ? result.secure_url.replace(/\.[A-Za-z0-9]+$/, ".jpg") : null;
      // iPhone HEIC photos: store the .jpg version, which every browser can show.
      const mediaUrl = kind === "image" ? result.secure_url.replace(/\.(heic|heif|tiff?)$/i, ".jpg") : result.secure_url;
      onUploaded({ mediaType: kind, mediaUrl, posterUrl });
      setDone(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };

  const uploading = progress !== null;

  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-panel/60 p-5">
      <input
        ref={input}
        type="file"
        accept="video/*,image/*"
        className="sr-only"
        id="cloudinary-file"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor="cloudinary-file" className={cn(buttonClass("primary"), "cursor-pointer", uploading && "pointer-events-none opacity-60")}>
          <UploadCloud className="size-4" aria-hidden />
          {uploading ? "Uploading…" : "Upload video or photo"}
        </label>
        <p className="text-sm text-muted">Uploads to Cloudinary and fills in the links below automatically. Videos up to 100 MB.</p>
      </div>
      {uploading && (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-gold transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {progress < 100 ? `${progress}% uploaded. Keep this page open.` : "Processing on Cloudinary…"}
          </p>
        </div>
      )}
      {done && (
        <p className="mt-3 flex items-center gap-2 text-sm text-success" role="status">
          <CheckCircle2 className="size-4" aria-hidden /> Uploaded {done}. Add a title and click Save.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
