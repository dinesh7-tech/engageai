import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div className={cn("panel group relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-primary transition-colors group-hover:bg-primary/15">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              trend === "down"
                ? "bg-destructive/12 text-destructive"
                : "bg-success/12 text-success",
            )}
          >
            {trend === "down" ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
            {delta}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
