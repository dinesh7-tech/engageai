import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber, FadeUp } from "@/components/motion/primitives";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string | undefined;
  trend?: "up" | "down" | "flat" | undefined;
  icon?: LucideIcon | undefined;
  hint?: string | undefined;
  className?: string | undefined;
}

export function StatCard({ label, value, delta, trend = "flat", icon: Icon, hint, className }: StatCardProps) {
  const numeric = Number(value.replace(/[^\d.]/g, "")) || 0;
  const isPureNumber = !isNaN(Number(value));

  return (
    <FadeUp className={cn("hover-lift group rounded-2xl border border-white/[0.06] bg-[color:var(--color-card)] p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">{label}</div>
        {Icon && (
          <div className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-white/70 ring-1 ring-inset ring-white/10">
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="font-mono mt-4 text-3xl font-semibold tracking-tight text-white">
        {isPureNumber ? <AnimatedNumber value={numeric} /> : value}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-[11px]",
              trend === "down"
                ? "bg-[color:var(--color-danger)]/15 text-[color:var(--color-danger)]"
                : "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
            )}
          >
            {trend === "down" ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
            {delta}
          </span>
        )}
        {hint && <span className="text-white/45">{hint}</span>}
      </div>
    </FadeUp>
  );
}

