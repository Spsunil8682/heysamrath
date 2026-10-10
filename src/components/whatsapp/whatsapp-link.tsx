import { MessageCircle } from "lucide-react";
import { connection } from "next/server";
import { buttonClass } from "@/components/ui/button";
import { getSiteInfo } from "@/lib/data/public";
import { whatsappLink } from "@/lib/utils/format";

/**
 * A "message on WhatsApp" button with a pre-filled message. Renders nothing until a WhatsApp number
 * is set (in /admin/settings, or siteConfig.contact.whatsapp without a database). Wrap in <Suspense>.
 */
export async function WhatsAppLink({
  message,
  label = "Book on WhatsApp",
  variant = "secondary",
  size = "md",
  className,
}: {
  /** "{business}" is replaced with the business name. */
  message: string;
  label?: string;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
  className?: string;
}) {
  await connection();
  const info = await getSiteInfo();
  const href = whatsappLink(info.whatsapp, message.replaceAll("{business}", info.businessName));
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size, className)}>
      <MessageCircle className="size-4" aria-hidden /> {label}
    </a>
  );
}
