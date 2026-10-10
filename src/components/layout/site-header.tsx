import { Suspense } from "react";
import { LinkButton } from "@/components/ui/button";
import { BrandFallback, LiveBrand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-gradient-to-b from-ink/90 to-ink/60 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Suspense fallback={<BrandFallback />}>
          <LiveBrand />
        </Suspense>
        <nav aria-label="Main" className="hidden md:block">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-2">
          <LinkButton href="/booking" size="sm" className="hidden sm:inline-flex">
            Book a Session
          </LinkButton>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
