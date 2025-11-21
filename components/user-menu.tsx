"use client";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FiLogOut, FiUser, FiPhone } from "react-icons/fi";

export function UserMenu() {
  const { user, phone, signOut, isLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/signin');
    } catch (error) {
      console.error('[UserMenu] Error signing out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-black/80 backdrop-blur-md rounded-full px-4 py-2">
        <div className="w-6 h-6 animate-pulse bg-white/20 rounded-full" />
      </div>
    );
  }

  return (
    <div className="bg-black/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3">
      <div className="flex items-center gap-2 text-white text-sm">
        {phone ? (
          <>
            <FiPhone className="w-4 h-4" />
            <span className="hidden sm:inline">{phone}</span>
          </>
        ) : user?.id ? (
          <>
            <FiUser className="w-4 h-4" />
            <span className="hidden sm:inline">User</span>
          </>
        ) : null}
      </div>
      
      <div className="w-px h-6 bg-white/20" />
      
      <Button
        onClick={handleSignOut}
        variant="ghost"
        size="sm"
        className="text-white hover:text-white hover:bg-white/10 h-auto py-1 px-2 rounded-full"
      >
        <FiLogOut className="w-4 h-4" />
        <span className="ml-1 hidden sm:inline">Sign Out</span>
      </Button>
    </div>
  );
}

