import { useEffect, useState } from "react";
import { Search, Bell, Command as CommandIcon, Menu, Sparkles, Wand2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";

export function TopNav({ onOpenMobile, unread = 0 }: { onOpenMobile?: () => void; unread?: number }) {
  const [platform, setPlatform] = useState<"mac" | "other">("other");
  const { profile, user, initials } = useAuth();
  const { activeWorkspace } = useActiveWorkspace();

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setPlatform(/Mac|iPod|iPhone|iPad/i.test(navigator.platform) ? "mac" : "other");
  }, []);

  return (
    <header className="sticky top-4 z-30 mx-4 lg:ml-[264px] lg:mr-4">
      <div className="glass-strong shadow-float flex h-14 items-center gap-3 rounded-2xl px-3">
        <button
          className="grid size-9 place-items-center rounded-xl text-white/70 hover:bg-white/[0.06] hover:text-white lg:hidden"
          onClick={onOpenMobile}
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </button>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <div className="grid size-7 place-items-center rounded-lg bg-white text-black">
            <Sparkles className="size-3.5" />
          </div>
          <span className="font-display text-sm font-semibold tracking-tight text-white">
            {activeWorkspace?.name || "EngageAI"}
          </span>
        </div>

        <div className="group flex flex-1 items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left text-sm text-white/50 transition-colors hover:border-white/10 hover:bg-white/[0.05] hover:text-white/80">
          <Search className="size-4" />
          <span className="truncate">Search modules, queues, events, feedback…</span>
          <span className="ml-auto hidden items-center gap-1 rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white/60 md:inline-flex">
            {platform === "mac" ? <CommandIcon className="size-3" /> : "Ctrl"}K
          </span>
        </div>

        <Button asChild size="sm" className="hidden rounded-xl bg-white text-black hover:bg-white/90 sm:inline-flex">
          <Link to="/app/copilot">
            <Wand2 className="size-4" /> Ask Copilot
          </Link>
        </Button>

        <Link
          to="/app/notifications"
          className="relative grid size-9 place-items-center rounded-xl text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[color:var(--color-success)]" />
          )}
        </Link>

        <Link
          to="/app/settings"
          className="grid size-9 place-items-center rounded-xl bg-white/[0.06] text-xs font-semibold text-white ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.1]"
          aria-label="Profile"
        >
          {initials || "EA"}
        </Link>
      </div>
    </header>
  );
}
