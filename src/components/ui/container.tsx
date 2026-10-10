import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.32em] text-gold", className)} {...props} />;
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Tag className="mt-4 font-display text-4xl leading-[1.05] font-medium text-balance sm:text-5xl">{title}</Tag>
      {intro && <p className="mt-5 text-base leading-relaxed text-muted text-pretty">{intro}</p>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: React.ReactNode; intro?: React.ReactNode }) {
  return (
    <header className="border-b border-line bg-charcoal pt-36 pb-14 sm:pt-44 sm:pb-20">
      <Container>
        <div className="animate-fade-up">
          <SectionHeading as="h1" eyebrow={eyebrow} title={title} intro={intro} />
        </div>
      </Container>
    </header>
  );
}
