import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent text-primary">
        <Icon className="size-6" />
      </span>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
