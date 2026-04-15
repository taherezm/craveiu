"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Utensils, Heart, Bell, Menu, X, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-context";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: Utensils },
  { href: "/preferences", label: "Preferences", icon: Heart },
  { href: "/notifications", label: "Notifications", icon: Bell },
] as const;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#990000]">
            <Utensils className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Crave<span className="text-[#990000]">IU</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-[#990000]/10 text-[#990000]"
                    : "text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 dark:text-zinc-400 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </nav>

        {/* Mobile right side */}
        <div className="flex items-center gap-1 md:hidden">
          {/* Theme toggle (mobile) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 dark:text-zinc-400 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 dark:text-zinc-400 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200",
                    active
                      ? "bg-[#990000]/10 text-[#990000]"
                      : "text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
