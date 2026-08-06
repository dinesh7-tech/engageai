import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FadeUp } from "@/components/motion/primitives";

export function ChartCard({
  title,
  subtitle,
  children,
  action,
  className,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <FadeUp className={cn("rounded-2xl border border-white/[0.06] bg-[color:var(--color-card)] p-6", className)}>
      <div className="flex items-start justify-between gap-4 pb-4">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-white">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-white/50">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </FadeUp>
  );
}
