import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlateCost",
  description: "Technical foundation for a food-business financial decision platform.",
};

const themeScript = `
  (() => {
    try {
      const savedTheme = localStorage.getItem("platecost-theme");
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", savedTheme === "dark" || (!savedTheme && systemPrefersDark));
    } finally {
      document.documentElement.classList.add("theme-ready");
    }
  })();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <Script id="platecost-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
