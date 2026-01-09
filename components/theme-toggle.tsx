"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps = {}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-9 w-9 rounded-full", className)}
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const handleThemeChange = () => {
    // Get the current effective theme (resolvedTheme handles system theme)
    const currentTheme = resolvedTheme || theme;
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast.success(`Theme changed to ${newTheme === "dark" ? "Dark" : "Light"} mode`);
  };

  // Determine which icon to show based on resolved theme
  const isDark = (resolvedTheme || theme) === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9 rounded-full hover:bg-white/20", className)}
      onClick={handleThemeChange}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-all" />
      ) : (
        <Moon className="h-4 w-4 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

