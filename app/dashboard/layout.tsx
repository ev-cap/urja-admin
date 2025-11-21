"use client";

import { DashboardNavigation } from "@/components/dashboard-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || theme) : "light";
  const logoSrc = currentTheme === "dark" 
    ? "/admin_rool_text_white_logo.png" 
    : "/admin_rool_text_black_logo.png";

  return (
    <div className="min-h-screen w-full relative" style={{ isolation: 'isolate' }}>
      {/* Emerald Glow Background - Light mode */}
      <div
        className="fixed inset-0 z-0 dark:hidden"
        style={{
          backgroundImage: `
            radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)
          `,
          backgroundSize: "100% 100%",
        }}
      />
      
      {/* Emerald Void - Dark mode */}
      <div
        className="fixed inset-0 z-0 hidden dark:block"
        style={{
          background: "radial-gradient(125% 125% at 50% 10%, #000000 40%, #072607 100%)",
        }}
      />
      
      {/* Content Wrapper */}
      <div className="relative z-10">
        {/* Logo - Top Left */}
        <div className="fixed top-6 left-6 z-50">
          {mounted && (
            <Image
              src={logoSrc}
              alt="Admin Rool"
              width={110}
              height={32}
              priority
              className="object-contain"
            />
          )}
        </div>

        {/* Navigation - Centered */}
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <DashboardNavigation />
        </div>

        {/* User Controls - Top Right */}
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
          <div className="bg-black/80 dark:bg-white/10 backdrop-blur-md rounded-full p-1">
            <ThemeToggle className="text-white" />
          </div>
          <UserMenu />
        </div>

        {/* Main Content */}
        <main className="pt-24 px-4 md:px-8">
          <div className="container mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
