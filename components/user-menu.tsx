"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FiLogOut, FiUser, FiPhone } from "react-icons/fi";
import { useSidebar } from "@/components/ui/sidebar";

export function UserMenu() {
  const { user, phone, signOut, isLoading } = useAuth();
  const router = useRouter();
  const { state } = useSidebar();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/signin');
    } catch (error) {
      console.error('[UserMenu] Error signing out:', error);
    }
  };

  const isCollapsed = state === "collapsed";

  if (isLoading) {
    return (
      <div className="w-6 h-6 animate-pulse bg-sidebar-accent rounded-md" />
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      {phone ? (
        <div className="flex items-center gap-1.5 text-sidebar-foreground text-sm flex-1 min-w-0 -ml-0.5">
          <FiPhone className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">{phone}</span>}
        </div>
      ) : user?.id ? (
        <div className="flex items-center gap-1.5 text-sidebar-foreground text-sm flex-1 min-w-0 -ml-0.5">
          <FiUser className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>User</span>}
        </div>
      ) : null}
      
      <Button
        onClick={handleSignOut}
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        title="Sign Out"
      >
        <FiLogOut className="w-4 h-4 shrink-0" />
      </Button>
    </div>
  );
}

