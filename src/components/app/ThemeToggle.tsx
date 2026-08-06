import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", light);
    root.classList.toggle("dark", !light);
  }, [light]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setLight((v) => !v)}
    >
      {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}
