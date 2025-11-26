"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "./button";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="relative group">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full border border-border/50 bg-background/50"
        >
          <Sun className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full border border-border/50 bg-background/50 hover:bg-accent hover:text-accent-foreground"
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      <div className="absolute right-0 top-full mt-2 w-32 origin-top-right rounded-xl border border-border/50 bg-popover p-1 shadow-lg shadow-black/5 opacity-0 scale-95 invisible group-hover:opacity-100 group-hover:scale-100 group-hover:visible transition-all duration-200 z-50">
        <button
          onClick={() => setTheme("light")}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
            theme === "light"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Sun className="h-4 w-4" />
          Light
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
            theme === "dark"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Moon className="h-4 w-4" />
          Dark
        </button>
        <button
          onClick={() => setTheme("system")}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
            theme === "system"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Monitor className="h-4 w-4" />
          System
        </button>
      </div>
    </div>
  );
}
