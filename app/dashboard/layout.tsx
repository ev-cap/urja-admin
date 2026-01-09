"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Loader } from "@/components/ui/loader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, isLoading, userData, signOut } = useAuthContext();
  const router = useRouter();
  const [permissionErrorOpen, setPermissionErrorOpen] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check user role when user data is loaded
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (userData) {
        // Check userRole field (primary) or role field (fallback)
        const userRole = (userData.userRole || userData.role || '').toLowerCase();
        const isAdmin = userRole.includes('admin') || userRole.includes('super-admin');
        
        if (!isAdmin) {
          console.warn('[DashboardLayout] User does not have admin privileges:', userRole);
          setPermissionErrorOpen(true);
        }
        setCheckingRole(false);
      } else {
        // User data not loaded yet, wait for it
        setCheckingRole(true);
      }
    } else if (!isLoading && !isAuthenticated) {
      // Not authenticated, redirect to sign in
      router.push('/auth/signin');
    }
  }, [isLoading, isAuthenticated, userData, router]);

  const currentTheme = mounted ? (resolvedTheme || theme) : "light";
  const logoSrc = currentTheme === "dark" 
    ? "/admin_rool_text_white_logo.png" 
    : "/admin_rool_text_black_logo.png";

  // Show loader while checking authentication and role
  if (isLoading || checkingRole) {
    return <Loader />;
  }

  // Don't render dashboard if user doesn't have permission
  if (permissionErrorOpen) {
    return (
      <Dialog open={permissionErrorOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="text-xl">Access Denied</DialogTitle>
            </div>
            <DialogDescription className="text-left pt-2">
              You do not have the required permission privileges to access the administration dashboard.
              Only users with <strong>admin</strong> or <strong>super-admin</strong> roles can access this panel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
