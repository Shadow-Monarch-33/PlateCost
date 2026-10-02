"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("platecost-theme-change", onChange);
      return () => window.removeEventListener("platecost-theme-change", onChange);
    },
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light",
  );

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("platecost-theme", nextTheme);
    window.dispatchEvent(new Event("platecost-theme-change"));
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-hidden"
    >
      <span className="text-sm font-medium text-white">Theme</span>
      <span className="flex items-center gap-2 text-xs text-white/60">
        {isDark ? "Dark" : "Light"}
        <span
          aria-hidden="true"
          className={`relative h-5 w-9 rounded-full transition-colors ${
            isDark ? "bg-zinc-600" : "bg-zinc-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
              isDark ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </span>
    </button>
  );
}