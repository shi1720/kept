import { cn } from "@/lib/cn";

/** Page-width wrapper shared by every landing section. */
export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

/** Editorial section marker: "01; The problem" with a hairline. */
export function Eyebrow({ index, children, light }: { index?: string; children: React.ReactNode; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3 font-mono text-[11.5px] uppercase tracking-[0.16em]", light ? "text-paper/65" : "text-ink-2/80")}>
      {index && <span className={light ? "text-jade-300" : "text-jade-600"}>{index}</span>}
      <span>{children}</span>
      <span className={cn("h-px w-10 sm:w-16", light ? "bg-paper/20" : "bg-line-2")} aria-hidden />
    </div>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  index,
  title,
  lede,
  light,
  split,
  className,
}: {
  id?: string;
  eyebrow: string;
  index?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  light?: boolean;
  /** Put the lede beside the title on wide screens to save vertical space. */
  split?: boolean;
  className?: string;
}) {
  if (split && lede) {
    return (
      <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-end lg:gap-14", className)}>
        <SectionHeading id={id} eyebrow={eyebrow} index={index} title={title} light={light} />
        <p className={cn("text-[16.5px] leading-relaxed lg:pb-2", light ? "text-paper/70" : "text-ink-2")}>{lede}</p>
      </div>
    );
  }
  return (
    <div className={cn("max-w-3xl", className)}>
      <Eyebrow index={index} light={light}>
        {eyebrow}
      </Eyebrow>
      <h2 id={id} className={cn("display mt-5 text-[40px] leading-[1.02] sm:text-[52px] lg:text-[60px]", light ? "text-paper" : "text-ink")}>
        {title}
      </h2>
      {lede && <p className={cn("mt-5 max-w-2xl text-[16.5px] leading-relaxed sm:text-[17.5px]", light ? "text-paper/70" : "text-ink-2")}>{lede}</p>}
    </div>
  );
}

/** Small-print citation used under every statistic. */
export function Cite({ children, href, light }: { children: React.ReactNode; href?: string; light?: boolean }) {
  const cls = cn("block text-[11px] leading-snug", light ? "text-paper/70" : "text-ink-3");
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cn(cls, "underline decoration-dotted underline-offset-2 hover:text-ink-2")}>
      {children}
    </a>
  ) : (
    <span className={cls}>{children}</span>
  );
}
