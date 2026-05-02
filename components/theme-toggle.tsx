"use client";

import * as React from "react";
import { MoonStar, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  const cycleTheme = () => {
    if (theme === "system") setTheme("dark");
    else if (theme === "dark") setTheme("light");
    else setTheme("system");
  };

  return (
    <button
      onClick={cycleTheme}
      className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-bg-elevated transition-colors text-text-secondary hover:text-text-primary"
      aria-label="Toggle theme"
    >
      {theme === "system" && <Monitor className="w-5 h-5" />}
      {theme === "dark" && <MoonStar className="w-5 h-5" />}
      {theme === "light" && <Sun className="w-5 h-5" />}
    </button>
  );
}
