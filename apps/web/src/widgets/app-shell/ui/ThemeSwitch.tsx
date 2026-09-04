/**
 * Adapted from shadcn-admin@e16c87f213a5ba5e45964e9b67c792105ec74d26.
 * Copyright (c) 2024 Sat Naing. MIT License; see THIRD_PARTY_NOTICES.md.
 */
import { useEffect } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { cn, useTheme, type Theme } from "@/shared/lib";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Button,
} from "@/shared/ui";

const themes: { label: string; value: Theme }[] = [
  { label: "라이트", value: "light" },
  { label: "다크", value: "dark" },
  { label: "시스템", value: "system" },
];

const browserChromeColor = {
  dark: "#020617",
  light: "#f8fafc",
} as const;

export function ThemeSwitch() {
  const { resolvedTheme, setTheme, theme } = useTheme();

  useEffect(() => {
    const metaThemeColor = document.querySelector("meta[name='theme-color']");
    metaThemeColor?.setAttribute(
      "content",
      browserChromeColor[resolvedTheme],
    );
  }, [resolvedTheme]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="테마 변경"
          className="relative size-11 lg:size-9"
          size="icon"
          type="button"
          variant="ghost"
        >
          <Sun
            aria-hidden="true"
            className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
          />
          <Moon
            aria-hidden="true"
            className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
          >
            {option.label}
            <Check
              className={cn(
                "ms-auto size-4",
                theme !== option.value && "hidden",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
