"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Users, Shield, AlertCircle, UserCircle, Search } from "lucide-react";
import { getAllUsers } from "@/lib/services/userService";
import type { User } from "@/types/auth";
import {
  SlideToUnlock,
  SlideToUnlockTrack,
  SlideToUnlockText,
  SlideToUnlockHandle,
} from "@/components/ui/slide-to-unlock";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { UpdateRoleSheet } from "./UpdateRoleSheet";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function RoleManagementPage() {
  const { isLoading: authLoading, isAuthenticated, userData } = useAuthContext();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateRoleSheetOpen, setUpdateRoleSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if user is superadmin (exact match only)
  const userRole = (userData?.userRole || userData?.role || "").toLowerCase();
  const isSuperAdmin = userRole === "superadmin";

  // Show modal when page loads and user is authenticated but not unlocked
  useEffect(() => {
    if (!authLoading && isAuthenticated && !isUnlocked && showUnlockModal === false) {
      setShowUnlockModal(true);
    }
  }, [authLoading, isAuthenticated, isUnlocked]);

  useEffect(() => {
    if (isUnlocked && !loadingUsers && users.length === 0) {
      fetchUsers();
    }
  }, [isUnlocked]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setError(null);
    try {
      const allUsers = await getAllUsers();
      console.log("[RoleManagement] getAllUsers returned:", {
        type: typeof allUsers,
        isArray: Array.isArray(allUsers),
        length: Array.isArray(allUsers) ? allUsers.length : 'N/A',
        data: allUsers,
      });
      // getAllUsers should already return an array, but handle both cases
      const usersArray = Array.isArray(allUsers) ? allUsers : [];
      console.log("[RoleManagement] Fetched users:", usersArray.length, usersArray);
      setUsers(usersArray);
    } catch (err: any) {
      console.error("[RoleManagement] Error fetching users:", err);
      setError(err.message || "Failed to fetch users");
      toast.error("Failed to fetch users");
      setUsers([]); // Set empty array on error
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUnlock = () => {
    setIsUnlocked(true);
    setShowUnlockModal(false);
    // Check if user is superadmin after unlocking
    if (!isSuperAdmin) {
      toast.error("Access denied: Only superadmin users can access this page");
      return;
    }
    toast.success("Unlocked");
  };

  const handleUpdateRole = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setUpdateRoleSheetOpen(true);
    }
  };

  const handleRoleUpdateSuccess = () => {
    // Refresh users list after successful update
    fetchUsers();
  };

  // Filter users based on search query (phone number or user ID)
  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.trim().toLowerCase();
    const phone = user.phone?.toLowerCase() || "";
    const userId = user.id?.toLowerCase() || "";
    return phone.includes(query) || userId.includes(query);
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h2 className="text-xl font-semibold">Access Prohibited</h2>
                <p className="text-muted-foreground mt-2">
                  You must be authenticated to access this page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="space-y-6 pb-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Users List Skeleton */}
        <Card className="border-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Unlock Modal */}
      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogPortal>
          <DialogOverlay className="backdrop-blur-sm bg-black/30" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
            )}
          >
            <DialogTitle className="sr-only">Slide to Access</DialogTitle>
            <DialogPrimitive.Description className="sr-only">
              Slide to unlock and access role management.
            </DialogPrimitive.Description>
            <div className="flex flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <Shield className="h-10 w-10 text-primary" />
                <h2 className="text-xl font-semibold">Slide to Access</h2>
                <p className="text-sm text-muted-foreground">
                  Slide to unlock and access role management
                </p>
              </div>
              <div className="w-full flex justify-center">
                <SlideToUnlock onUnlock={handleUnlock}>
                  <SlideToUnlockTrack>
                    <SlideToUnlockText>
                      {({ isDragging }) => (
                        <ShimmeringText text="slide to unlock" isStopped={isDragging} />
                      )}
                    </SlideToUnlockText>
                    <SlideToUnlockHandle />
                  </SlideToUnlockTrack>
                </SlideToUnlock>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Update Role Sheet */}
      <UpdateRoleSheet
        open={updateRoleSheetOpen}
        close={() => {
          setUpdateRoleSheetOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={handleRoleUpdateSuccess}
      />

      {/* Main Content */}
      <div className={cn("space-y-6", !isUnlocked && !showUnlockModal && "blur-sm pointer-events-none")}>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and permissions
          </p>
        </div>

        {!isUnlocked ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                {showUnlockModal ? "Slide to unlock to view users" : "Content locked - Click to slide to unlock"}
              </div>
            </CardContent>
          </Card>
        ) : !isSuperAdmin ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <Shield className="h-12 w-12 text-destructive" />
                <div>
                  <h2 className="text-xl font-semibold">Access Prohibited</h2>
                  <p className="text-muted-foreground mt-2">
                    Only users with <strong>superadmin</strong> role can access this page.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : loadingUsers ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div>
                  <h2 className="text-xl font-semibold">Error</h2>
                  <p className="text-muted-foreground mt-2">{error}</p>
                </div>
                <Button onClick={fetchUsers}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by phone number or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No users found matching your search" : "No users found"}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <UserCircle className="h-10 w-10 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.name || user.email || user.phone || user.id}
                            </span>
                            {(user.userRole || user.role) && (
                              <Badge variant="secondary">
                                {user.userRole || user.role}
                              </Badge>
                            )}
                          </div>
                          {user.email && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {user.email}
                            </p>
                          )}
                          {user.phone && (
                            <p className="text-sm text-muted-foreground">
                              {user.phone}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {user.id}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleUpdateRole(user.id)}
                        variant="outline"
                      >
                        Update Role
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}