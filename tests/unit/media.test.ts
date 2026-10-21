import { describe, expect, it } from "vitest";
import { isAllowedMediaUrl, resolveMedia, tileImageUrl, videoPosterUrl, withCloudinaryTransform } from "@/lib/media";

describe("media URL allow-list (mirrors the SQL check)", () => {
  it.each([
    "/media/images/wedding.jpg",
    "/media/videos/dj-night.mp4",
    "https://res.cloudinary.com/demo/image/upload/v1712345/portfolio/a.jpg",
    "https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/v1/reel.mp4",
  ])("allows %s", (url) => expect(isAllowedMediaUrl(url)).toBe(true));

  it.each([
    "",
    null,
    "javascript:alert(1)",
    "/media/../.env",
    "//evil.example/x.jpg",
    "/media//x.jpg",
    "http://res.cloudinary.com/demo/image/upload/a.jpg",
    "https://res.cloudinary.com.evil.example/demo/image/upload/a.jpg",
    "https://evil.example/media/a.jpg",
    "/uploads/a.jpg",
    "data:image/png;base64,AAAA",
  ])("rejects %s", (url) => expect(isAllowedMediaUrl(url)).toBe(false));

  it("identifies the provider", () => {
    expect(resolveMedia("/media/images/a.jpg")?.provider).toBe("local");
    expect(resolveMedia("https://res.cloudinary.com/d/image/upload/a.jpg")?.provider).toBe("cloudinary");
    expect(resolveMedia("https://evil.example/a.jpg")).toBeNull();
  });
});

describe("Cloudinary helpers", () => {
  it("inserts a transformation only for Cloudinary URLs", () => {
    expect(withCloudinaryTransform("https://res.cloudinary.com/d/video/upload/v1/a.mp4", "f_auto,q_auto")).toBe(
      "https://res.cloudinary.com/d/video/upload/f_auto,q_auto/v1/a.mp4",
    );
    expect(withCloudinaryTransform("/media/videos/a.mp4", "f_auto")).toBe("/media/videos/a.mp4");
  });

  it("does not stack transformations on an already-transformed URL", () => {
    const url = "https://res.cloudinary.com/d/video/upload/q_auto/v1/a.mp4";
    expect(withCloudinaryTransform(url, "f_auto")).toBe(url);
  });

  it("derives posters: stored thumbnail first, Cloudinary frame second, otherwise null", () => {
    expect(videoPosterUrl("/media/videos/a.mp4", "/media/thumbnails/a.jpg")).toBe("/media/thumbnails/a.jpg");
    expect(videoPosterUrl("https://res.cloudinary.com/d/video/upload/v1/a.mp4", null)).toBe(
      "https://res.cloudinary.com/d/video/upload/so_2,f_jpg,q_auto,w_1280/v1/a.jpg",
    );
    expect(videoPosterUrl("/media/videos/a.mp4", null)).toBeNull();
  });

  it("never uses a full video file as a grid tile", () => {
    expect(tileImageUrl({ media_type: "video", media_url: "/media/videos/a.mp4", thumbnail_url: null })).toBeNull();
    expect(tileImageUrl({ media_type: "image", media_url: "/media/images/a.jpg", thumbnail_url: null })).toBe("/media/images/a.jpg");
  });
});

describe("iPhone photos", async () => {
  const { resolveMedia } = await import("@/lib/media");
  it("shows Cloudinary HEIC photos as JPEG", () => {
    expect(resolveMedia("https://res.cloudinary.com/demo/image/upload/v1/portfolio/a.heic")?.url).toBe(
      "https://res.cloudinary.com/demo/image/upload/v1/portfolio/a.jpg",
    );
    expect(resolveMedia("https://res.cloudinary.com/demo/video/upload/v1/portfolio/a.mov")?.url).toMatch(/\.mov$/);
    expect(resolveMedia("/media/images/a.jpg")?.url).toBe("/media/images/a.jpg");
  });
});
