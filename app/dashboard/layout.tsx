"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <SidebarProvider>
      {/* Header - Full width spanning over sidebar */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
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
        <ThemeToggle />
      </header>
      
      <AppSidebar />
      <SidebarInset>
        {/* Emerald Glow Background - Light mode */}
        <div
          className="fixed inset-0 z-0 dark:hidden pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #10b981 100%)
            `,
            backgroundSize: "100% 100%",
          }}
        />
        
        {/* Emerald Void - Dark mode */}
        <div
          className="fixed inset-0 z-0 hidden dark:block pointer-events-none"
          style={{
            background: "radial-gradient(125% 125% at 50% 10%, #000000 40%, #072607 100%)",
          }}
        />
        
        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Spacer for fixed header */}
          <div className="h-16 shrink-0" />

          {/* Main Content */}
          <div className="flex-1 p-4 md:p-8">
            <div className="container mx-auto max-w-7xl">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
