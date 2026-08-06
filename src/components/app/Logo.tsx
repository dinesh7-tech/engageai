import { cn } from "@/lib/utils";

export function Logo({ className, showWord = true }: { className?: string | undefined; showWord?: boolean | undefined }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative grid size-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
        <span className="size-2.5 rounded-[3px] bg-primary-foreground" />
      </span>
      {showWord && (
        <span className="font-display text-[17px] font-semibold tracking-tight text-foreground">
          Engage<span className="text-primary">AI</span>
        </span>
      )}
    </span>
  );
}
