"use client";

import { DashboardNavigation } from "@/components/dashboard-navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
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
  );
}
