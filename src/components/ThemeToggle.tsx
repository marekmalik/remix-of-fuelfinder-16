import { Moon, Sun, Smartphone } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 p-1 rounded-full bg-secondary border border-border w-full">
        <div className="flex-1 h-9" />
        <div className="flex-1 h-9" />
        <div className="flex-1 h-9" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-secondary border border-border w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme("light")}
        className={`flex-1 rounded-full px-3 py-2 h-auto transition-all ${
          theme === "light"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        }`}
      >
        <Sun className="w-4 h-4 mr-1.5" />
        Light
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme("dark")}
        className={`flex-1 rounded-full px-3 py-2 h-auto transition-all ${
          theme === "dark"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        }`}
      >
        <Moon className="w-4 h-4 mr-1.5" />
        Dark
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme("system")}
        className={`flex-1 rounded-full px-3 py-2 h-auto transition-all ${
          theme === "system"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-transparent"
        }`}
      >
        <Smartphone className="w-4 h-4 mr-1.5" />
        System
      </Button>
    </div>
  );
}
