#!/usr/bin/env node
/**
 * Imports videos from your raw footage folder into the website.
 *
 *   npm run media:import                 # uses ../video (or MEDIA_SOURCE_DIR)
 *   npm run media:import -- --source "/path/to/folder"
 *   npm run media:import -- --force      # re-encode everything
 *
 * For every .mov/.mp4/.m4v in the source folder it creates (only if missing):
 *   public/media/videos/<slug>.<hash>.mp4      H.264/AAC 720p, plays in every browser (phone .MOV is often HEVC)
 *   public/media/thumbnails/<slug>.<hash>.jpg  poster frame, so the gallery never downloads the video for a tile
 *   public/media/hero/<slug>.<hash>.mp4        6-second 540p clip for the rotating home-page background
 * The content hash in each name means a re-encoded file gets a new URL, so browsers and the image
 * optimizer never keep showing an old version. Superseded files are deleted.
 * and adds an entry to src/lib/config/local-media.json. Edit titles, categories and the
 * featured / published / hero flags in that file; re-running the import keeps your edits.
 * To pick a different poster frame, set "posterAt": <seconds> on the entry and re-run.
 * If a clip shows up sideways, set "rotate": 90, 180 or 270 (degrees clockwise) on its entry and
 * re-run; that video is re-encoded upright.
 *
 * Encoder: ffmpeg (a system install, else the copy bundled via the @ffmpeg-installer dev dependency).
 * ffmpeg decodes footage macOS can't, such as 4K 120 fps H.264. macOS's `avconvert` is the last resort.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const sourceDir = resolve(root, option("source") ?? process.env.MEDIA_SOURCE_DIR ?? "../video");
const force = flag("force");
const manifestPath = join(root, "src/lib/config/local-media.json");
const out = {
  videos: join(root, "public/media/videos"),
  thumbnails: join(root, "public/media/thumbnails"),
  hero: join(root, "public/media/hero"),
};
const HERO_SECONDS = 6;
const CATEGORIES = new Set(["weddings", "pre_wedding", "events", "commercial", "social_reels", "video_editing", "photography"]);

// ---------------------------------------------------------------------------
// Encoder backends
// ---------------------------------------------------------------------------
const has = (cmd) => spawnSync("which", [cmd], { encoding: "utf8" }).status === 0;
function bundled(pkg) {
  try {
    const path = createRequire(join(root, "package.json"))(pkg).path;
    return existsSync(path) ? path : null;
  } catch {
    return null;
  }
}
const FFMPEG = has("ffmpeg") ? "ffmpeg" : bundled("@ffmpeg-installer/ffmpeg");
const FFPROBE = has("ffprobe") ? "ffprobe" : bundled("@ffprobe-installer/ffprobe");
const useFfmpeg = Boolean(FFMPEG && FFPROBE);
const useMac = !useFfmpeg && process.platform === "darwin" && has("avconvert") && has("swiftc");
if (!useFfmpeg && !useMac) {
  console.error("No video encoder found. Run `npm install` (bundles ffmpeg) or install ffmpeg from https://ffmpeg.org.");
  process.exit(1);
}

let frameTool;
function macFrameTool() {
  if (frameTool) return frameTool;
  const src = join(root, "scripts/media/frame.swift");
  frameTool = join(root, "node_modules/.cache/media/frame");
  const stale = !existsSync(frameTool) || statSync(frameTool).mtimeMs < statSync(src).mtimeMs;
  if (stale) {
    mkdirSync(dirname(frameTool), { recursive: true });
    console.log("Compiling media helper (one time)…");
    execFileSync("swiftc", ["-O", src, "-o", frameTool], { stdio: ["ignore", "ignore", "inherit"] });
  }
  return frameTool;
}

function probe(file) {
  if (useFfmpeg) {
    const json = JSON.parse(
      execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v:0", "-show_streams", "-show_format", "-of", "json", file], {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      }),
    );
    const s = json.streams[0];
    const rotation = Number(s.tags?.rotate ?? s.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0);
    const quarter = Math.abs(rotation) % 180 === 90;
    const [num, den] = String(s.r_frame_rate ?? "30/1").split("/").map(Number);
    return {
      width: quarter ? s.height : s.width,
      height: quarter ? s.width : s.height,
      duration: Number(json.format.duration),
      fps: den ? num / den : 30,
    };
  }
  return { fps: 30, ...JSON.parse(execFileSync(macFrameTool(), ["probe", file], { encoding: "utf8" })) };
}

function transcode(input, output, { maxHeight, start, duration, rotate = 0, fps = 30 }) {
  if (useFfmpeg) {
    const turn = { 90: "transpose=1,", 180: "hflip,vflip,", 270: "transpose=2," }[rotate] ?? "";
    const rate = fps > 31 ? "fps=30," : ""; // high-frame-rate footage (60/120 fps) → 30 fps for the web
    const args = ["-y", "-v", "error"];
    if (start !== undefined) args.push("-ss", String(start));
    args.push("-i", input);
    if (duration !== undefined) args.push("-t", String(duration));
    args.push(
      "-vf", `${rate}${turn}scale='if(gt(iw,ih),-2,min(${maxHeight},iw))':'if(gt(iw,ih),min(${maxHeight},ih),-2)'`,
      "-c:v", "libx264", "-preset", "medium", "-crf", maxHeight > 600 ? "23" : "27", "-pix_fmt", "yuv420p",
      "-profile:v", "high", "-movflags", "+faststart", "-map_metadata", "-1",
    );
    if (duration !== undefined) args.push("-an");
    else args.push("-c:a", "aac", "-b:a", "128k", "-ac", "2");
    args.push(output);
    execFileSync(FFMPEG, args, { stdio: ["ignore", "ignore", "inherit"] });
    return;
  }
  if (rotate) {
    // avconvert cannot rotate; AVFoundation re-renders the frames upright (long edge 1280 or 960).
    execFileSync(macFrameTool(), ["export", input, output, maxHeight > 600 ? "1280" : "960", String(rotate),
      start === undefined ? "-" : String(start), duration === undefined ? "-" : String(duration), duration === undefined ? "1" : "0"],
      { stdio: ["ignore", "ignore", "inherit"] });
    return;
  }
  const args = ["--source", input, "--preset", maxHeight > 600 ? "Preset1280x720" : "Preset960x540", "--output", output, "--replace"];
  if (start !== undefined) args.push("--start", String(start));
  if (duration !== undefined) args.push("--duration", String(duration));
  // avconvert strips location metadata by default. It reports success on stderr, so only show output on failure.
  const res = spawnSync("avconvert", args, { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`avconvert failed for ${input}:\n${res.stderr || res.stdout}`);
}

function poster(input, output, atSeconds, rotate = 0) {
  if (useFfmpeg) {
    const turn = { 90: "transpose=1,", 180: "hflip,vflip,", 270: "transpose=2," }[rotate] ?? "";
    execFileSync(FFMPEG, ["-y", "-v", "error", "-ss", String(atSeconds), "-i", input, "-frames:v", "1",
      "-vf", `${turn}scale='min(1280,iw)':-2`, "-q:v", "3", "-map_metadata", "-1", output], { stdio: "inherit" });
    return;
  }
  execFileSync(macFrameTool(), ["poster", input, output, "1280", String(atSeconds), String(rotate)], { stdio: "inherit" });
}

// ---------------------------------------------------------------------------
// Output files: written to a temp name, then renamed to <slug>.<content-hash>.<ext>
// ---------------------------------------------------------------------------
const publicDir = join(root, "public");
const toUrl = (abs) => abs.slice(publicDir.length).split("\\").join("/");
const toPath = (url) => (url ? join(publicDir, url) : null);

function finalize(tmp, dir, slug, ext, previousUrl) {
  const hash = createHash("sha1").update(readFileSync(tmp)).digest("hex").slice(0, 8);
  const target = join(dir, `${slug}.${hash}.${ext}`);
  renameSync(tmp, target);
  const prev = toPath(previousUrl);
  if (prev && prev !== target && existsSync(prev)) unlinkSync(prev);
  // Also clean up the un-hashed name used by older versions of this script.
  const legacy = join(dir, `${slug}.${ext}`);
  if (legacy !== target && existsSync(legacy)) unlinkSync(legacy);
  return toUrl(target);
}

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------
const slugify = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "video";

const titleize = (s) =>
  s.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
    .split(" ").map((w) => (w.toLowerCase() === "dj" ? "DJ" : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");

function guessCategory(name) {
  const n = name.toLowerCase();
  if (/wedding|shaadi|vivah|baraat|haldi|mehndi/.test(n)) return "weddings";
  if (/couple|pre.?wedding|engagement/.test(n)) return "pre_wedding";
  if (/brand|product|corporate|commercial|shop|cafe/.test(n)) return "commercial";
  if (/edit/.test(n)) return "video_editing";
  if (/travel|outdoor|reel|temple|mataji|seth|darshan/.test(n)) return "social_reels";
  return "events"; // birthdays, DJ nights, functions… change it in local-media.json if needed
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
if (!existsSync(sourceDir)) {
  console.error(`Source folder not found: ${sourceDir}`);
  process.exit(1);
}
for (const dir of Object.values(out)) mkdirSync(dir, { recursive: true });

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { videos: [] };
const bySource = new Map(manifest.videos.map((v) => [v.source, v]));
const usedSlugs = new Set(manifest.videos.map((v) => v.slug));

const sources = readdirSync(sourceDir)
  .filter((f) => [".mov", ".mp4", ".m4v"].includes(extname(f).toLowerCase()) && !f.startsWith("."))
  .sort((a, b) => statSync(join(sourceDir, a)).mtimeMs - statSync(join(sourceDir, b)).mtimeMs);

console.log(`Source: ${sourceDir}`);
console.log(`Encoder: ${useFfmpeg ? `ffmpeg (${FFMPEG === "ffmpeg" ? "system" : "bundled"})` : "macOS avconvert"}\n`);

let added = 0;
let encoded = 0;
for (const file of sources) {
  const input = join(sourceDir, file);
  let entry = bySource.get(file);
  if (!entry) {
    const base = file.slice(0, -extname(file).length);
    let slug = slugify(base);
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${slugify(base)}-${n}`;
    usedSlugs.add(slug);
    entry = {
      slug,
      source: file,
      title: titleize(base),
      description: "",
      category: guessCategory(base),
      altText: "",
      featured: false,
      published: true,
      hero: true,
    };
    manifest.videos.push(entry);
    bySource.set(file, entry);
    added++;
  }
  if (!CATEGORIES.has(entry.category)) {
    console.warn(`  ! ${file}: unknown category "${entry.category}", using "events"`);
    entry.category = "events";
  }

  const rotate = [90, 180, 270].includes(entry.rotate) ? entry.rotate : 0;
  if (entry.rotate !== undefined && !rotate) console.warn(`  ! ${file}: "rotate" must be 90, 180 or 270`);
  const redo = force || (entry.encodedRotate ?? 0) !== rotate; // rotation changed → re-encode this clip
  const existing = (url) => {
    const path = toPath(url);
    return path && existsSync(path) ? path : null;
  };
  const meta = probe(input);
  process.stdout.write(`• ${file} → ${entry.slug} (${meta.width}×${meta.height}, ${meta.duration.toFixed(1)}s)\n`);

  let video = existing(entry.video) ?? existing(`/media/videos/${entry.slug}.mp4`);
  if (redo || !video) {
    process.stdout.write(`    encoding web video${rotate ? ` (rotated ${rotate}°)` : ""}… `);
    const tmp = join(out.videos, `.${entry.slug}.tmp.mp4`);
    transcode(input, tmp, { maxHeight: 720, rotate, fps: meta.fps });
    entry.video = finalize(tmp, out.videos, entry.slug, "mp4", entry.video);
    video = toPath(entry.video);
    encoded++;
    console.log(`${(statSync(video).size / 1e6).toFixed(1)} MB`);
  } else if (!/\.[0-9a-f]{8}\.mp4$/.test(entry.video ?? "")) {
    // Migrate an un-hashed file from an older import to a hashed name.
    entry.video = finalize(video, out.videos, entry.slug, "mp4", null);
    video = toPath(entry.video);
  }

  const posterAt =
    typeof entry.posterAt === "number" && entry.posterAt >= 0 && entry.posterAt < meta.duration
      ? entry.posterAt
      : Math.max(1, Math.min(meta.duration * 0.25, meta.duration - 0.5));
  const thumb = existing(entry.poster);
  if (redo || !thumb || !/\.[0-9a-f]{8}\.jpg$/.test(entry.poster) || entry.encodedPosterAt !== posterAt) {
    const tmp = join(out.thumbnails, `.${entry.slug}.tmp.jpg`);
    poster(input, tmp, posterAt, rotate);
    entry.poster = finalize(tmp, out.thumbnails, entry.slug, "jpg", entry.poster);
    console.log("    poster frame ✓");
  }

  const hero = existing(entry.heroClip);
  if (hero && !redo && !/\.[0-9a-f]{8}\.mp4$/.test(entry.heroClip)) {
    entry.heroClip = finalize(hero, out.hero, entry.slug, "mp4", null);
  } else if (redo || !hero) {
    const length = Math.min(HERO_SECONDS, meta.duration);
    const start = Math.max(0, Math.min(meta.duration * 0.2, meta.duration - length));
    process.stdout.write("    hero clip… ");
    const tmp = join(out.hero, `.${entry.slug}.tmp.mp4`);
    transcode(input, tmp, { maxHeight: 540, start: Number(start.toFixed(2)), duration: length, rotate, fps: meta.fps });
    entry.heroClip = finalize(tmp, out.hero, entry.slug, "mp4", entry.heroClip);
    console.log(`${(statSync(toPath(entry.heroClip)).size / 1e6).toFixed(1)} MB`);
  }

  const outMeta = probe(video);
  if (statSync(video).size > 95e6) {
    console.warn(`    ! ${entry.slug}.mp4 is over 95 MB — GitHub rejects files over 100 MB. Trim it or use Cloudinary.`);
  }
  Object.assign(entry, {
    width: outMeta.width,
    height: outMeta.height,
    duration: Number(outMeta.duration.toFixed(2)),
    encodedRotate: rotate,
    encodedPosterAt: posterAt,
  });
}

const missing = manifest.videos.filter((v) => !sources.includes(v.source));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`\nDone: ${sources.length} videos, ${added} new, ${encoded} encoded.`);
console.log(`Manifest: ${manifestPath}`);
if (missing.length) {
  console.log(
    `Note: ${missing.length} entr${missing.length === 1 ? "y has" : "ies have"} no source file any more ` +
      `(${missing.map((m) => m.source).join(", ")}). They stay on the site; set "published": false or delete the entry to remove.`,
  );
}
console.log('Edit titles, categories and "featured"/"published"/"hero" flags in the manifest, then reload the site.');
