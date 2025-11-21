"use client";

import { DashboardNavigation } from "@/components/dashboard-navigation";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Island */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center items-center gap-3">
        <DashboardNavigation />
        <div className="bg-black rounded-full p-1">
          <ThemeToggle />
        </div>
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
