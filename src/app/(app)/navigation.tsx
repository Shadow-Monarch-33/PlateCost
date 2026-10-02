"use client";

import { useState } from "react";
import { UserAccountMenu } from "./user-menu";

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Ingredients", href: "/ingredients" },
  { label: "Recipes", href: "/recipes" },
  { label: "Menu", href: "/menu" },
  { label: "Invoices", href: "/invoices" },
];

interface Props {
  userEmail: string | undefined;
  displayName: string | undefined;
  businessName: string | null;
}

export function AppNavigation({ userEmail, displayName, businessName }: Props) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + Business Name */}
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-lg font-bold text-zinc-900">
              PlateCost
            </a>
            {businessName && (
              <span className="hidden sm:inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {businessName}
              </span>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <UserAccountMenu email={userEmail} displayName={displayName} />
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
              aria-label="Toggle navigation menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <nav className="md:hidden border-t border-zinc-200 py-2 pb-3">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-4 px-3 border-t border-zinc-200 pt-4">
              <UserAccountMenu email={userEmail} displayName={displayName} />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
