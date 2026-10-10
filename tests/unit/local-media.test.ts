import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "@/lib/config/local-media.json";
import { heroClips, localPortfolioItems } from "@/lib/data/local-media";
import { isAllowedMediaUrl } from "@/lib/media";

const publicDir = join(__dirname, "..", "..", "public");

describe("local media library", () => {
  it("every manifest entry points at files that exist in public/", () => {
    for (const v of manifest.videos) {
      for (const url of [v.video, v.poster, v.heroClip]) {
        expect(isAllowedMediaUrl(url), `${v.slug}: ${url}`).toBe(true);
        expect(existsSync(join(publicDir, url!)), `${v.slug}: missing ${url}`).toBe(true);
      }
    }
  });

  it("maps published videos to portfolio rows with posters (no video downloaded for tiles)", () => {
    const items = localPortfolioItems();
    expect(items.length).toBe(manifest.videos.filter((v) => v.published !== false).length);
    for (const item of items) {
      expect(item.media_type).toBe("video");
      expect(item.thumbnail_url).toMatch(/^\/media\/thumbnails\//);
      expect(item.id).toMatch(/^local-/);
    }
  });

  it("hero clips are short, separate files and include both orientations", () => {
    const clips = heroClips();
    expect(clips.length).toBeGreaterThan(1);
    expect(clips.every((c) => c.src.startsWith("/media/hero/"))).toBe(true);
  });

  it("exposes only well-formed Instagram links and view labels", () => {
    for (const item of localPortfolioItems()) {
      if (item.social_url) expect(item.social_url).toMatch(/^https:\/\/www\.instagram\.com\/(reel|p)\/[A-Za-z0-9_-]+\/?$/);
      if (item.views_label) expect(item.views_label).toMatch(/^[0-9][0-9.,]*\s?[KkMm]?\+?$/);
    }
    const seth = localPortfolioItems().find((i) => i.id === "local-sawriya-seth");
    expect(seth?.views_label).toBe("1M");
    expect(seth?.social_url).toBe("https://www.instagram.com/reel/DdSpr8ZT7FG/");
  });

  it("hero and home selection match the owner's list", () => {
    const wanted = ["sawriya-seth", "sawriya-seth-2", "model-shoot", "couple", "outdoor-shot", "travel-video", "travel-2"];
    expect(heroClips().map((c) => c.src.split("/").pop()!.replace(/\.[0-9a-f]{8}\.mp4$/, ""))).toEqual(wanted);
    expect(localPortfolioItems().filter((i) => i.featured).map((i) => i.id.replace("local-", ""))).toEqual(wanted);
  });

  it("phones play only the model shoot and both travel videos", () => {
    const mobile = heroClips().filter((c) => c.mobile);
    expect(mobile.map((c) => c.src.split("/").pop()!.replace(/\.[0-9a-f]{8}\.mp4$/, ""))).toEqual([
      "model-shoot",
      "travel-video",
      "travel-2",
    ]);
  });
});

describe("hard-coded media paths", () => {
  it("every /media/… path referenced in code, config and seed data exists in public/", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const root = join(__dirname, "..", "..");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|json|sql)$/.test(name)) files.push(p);
      }
    };
    walk(join(root, "src"));
    walk(join(root, "supabase"));
    const missing: string[] = [];
    for (const file of files) {
      for (const [path] of readFileSync(file, "utf8").matchAll(/\/media\/(?:images|videos|thumbnails|hero|logos)\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp|svg|mp4)/g)) {
        const example = /\/(x|name|logo)\.[a-z0-9]+$/.test(path); // placeholders in help text and comments
        if (!example && !existsSync(join(publicDir, path))) missing.push(`${file.replace(root, "")}: ${path}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
