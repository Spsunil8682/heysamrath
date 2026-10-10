import { describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/config/site";
import { whatsappLink } from "@/lib/utils/format";
import { whatsAppBookingMessage } from "@/lib/utils/whatsapp-message";

describe("WhatsApp booking", () => {
  it("builds a wa.me link for the owner's number", () => {
    expect(siteConfig.contact.whatsapp).toMatch(/^91\d{10}$/);
    expect(whatsappLink(siteConfig.contact.whatsapp, "Hi")).toBe(`https://wa.me/${siteConfig.contact.whatsapp}?text=Hi`);
  });

  it("pre-fills the service, date and optional details", () => {
    const msg = whatsAppBookingMessage({
      businessName: "Hey Samrath",
      service: "Event & Festival Reels",
      date: "2026-10-15",
      reels: "2",
      name: " Asha ",
      location: "",
    });
    expect(msg).toContain("Service: Event & Festival Reels");
    expect(msg).toMatch(/Date: Thu, 15 Oct,? 2026/);
    expect(msg).toContain("Reels: 2");
    expect(msg).toContain("Name: Asha");
    expect(msg).not.toContain("Location");
    expect(decodeURIComponent(whatsappLink("918529515706", msg)!.split("?text=")[1])).toBe(msg);
  });
});
