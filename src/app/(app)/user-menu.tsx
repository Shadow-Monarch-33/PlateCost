"use client";
import Image from "next/image";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/browser";
import { getSafeDisplayName } from "@/application/auth/display-name";

interface Props {
  email: string | undefined;
  displayName: string | undefined;
  avatarUrl: string | undefined;
}

export function UserAccountMenu({ email, displayName, avatarUrl }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fallback to email (username part) if display name is absent
  const safeDisplayName = getSafeDisplayName(displayName, email);
  const currentAvatarSrc = avatarUrl || "/images/default_pfp.jpeg";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full p-1 pl-1 pr-3 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors focus:outline-hidden focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Image width={28} height={28}
          src={currentAvatarSrc}
          alt={safeDisplayName}
          className="h-7 w-7 rounded-full object-cover"
        />
        <span className="text-sm font-medium text-zinc-700 max-w-30 truncate">
          {safeDisplayName}
        </span>
        <svg
          className={`h-4 w-4 text-zinc-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 origin-top-right rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-xl ring-1 ring-black/5 focus:outline-hidden z-50">
          <div className="flex items-center gap-3 px-3 py-3">
            <Image width={40} height={40}
              src={currentAvatarSrc}
              alt={safeDisplayName}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-800"
            />
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-semibold text-white">
                {safeDisplayName}
              </span>
              <span className="truncate text-xs text-zinc-400">
                {email}
              </span>
            </div>
          </div>
          
          <div className="mt-1 border-t border-zinc-800/80"></div>
          
          <div className="p-1 mt-1">
            <a
              href="/profile"
              className="group flex flex-col rounded-lg px-3 py-2.5 hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-hidden transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">✦ Account Center</span>
              </div>
              <span className="mt-0.5 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                Manage your PlateCost account and profile
              </span>
            </a>
            
            <a
              href="/settings"
              className="group mt-1 flex flex-col rounded-lg px-3 py-2.5 hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-hidden transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">⚙ Settings</span>
              </div>
              <span className="mt-0.5 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                Manage your PlateCost preferences
              </span>
            </a>
          </div>

          <div className="mt-1 border-t border-zinc-800/80"></div>
          
          <div className="p-1 mt-1">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full group flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white focus:outline-hidden disabled:opacity-50 transition-colors"
            >
              <span className="text-lg">↪</span>
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
