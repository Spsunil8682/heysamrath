import { describe, expect, it } from "vitest";
import { signCloudinaryParams } from "@/lib/cloudinary/sign";

describe("Cloudinary signature", () => {
  it("matches the example from Cloudinary's documentation", () => {
    expect(
      signCloudinaryParams(
        { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 },
        "abcd",
      ),
    ).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("is independent of key order and ignores empty values", () => {
    const a = signCloudinaryParams({ timestamp: 1, folder: "portfolio", tags: "" }, "s");
    const b = signCloudinaryParams({ folder: "portfolio", timestamp: 1 }, "s");
    expect(a).toBe(b);
  });
});
