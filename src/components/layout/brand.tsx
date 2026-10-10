import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { getSiteInfo } from "@/lib/data/public";
import { siteConfig } from "@/lib/config/site";
import { resolveMedia } from "@/lib/media";

function BrandMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const logo = resolveMedia(logoUrl);
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label={`${name} — home`}>
      {logo ? (
        <Image src={logo.url} alt="" width={36} height={36} className="size-9 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="grid size-9 place-items-center rounded-full border border-gold/60 font-display text-lg text-gold">
          {name.charAt(0)}
        </span>
      )}
      <span className="font-display text-lg tracking-wide whitespace-nowrap transition-colors group-hover:text-gold-bright sm:text-xl">{name}</span>
    </Link>
  );
}

export function BrandFallback() {
  return <BrandMark name={siteConfig.businessName} logoUrl={siteConfig.logo} />;
}

export async function LiveBrand() {
  await connection();
  const info = await getSiteInfo();
  return <BrandMark name={info.businessName} logoUrl={info.logoUrl} />;
}
