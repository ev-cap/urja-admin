"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { Switch } from "@/components/ui/switch";
import { useUserData } from "@/hooks/useUserData";
import { useAuth } from "@/hooks/useAuth";
import { User, Mail, Phone, UserCircle2, LayoutPanelTop } from "lucide-react";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import {
  isCustomOrderEnabled,
  setCustomOrderEnabled,
  clearSidebarOrder,
} from "@/lib/utils/sidebarPreferences";

export default function SettingsPage() {
  const { userData, loading, error } = useUserData();
  const { userId } = useAuth();
  const [customOrderEnabled, setCustomOrderEnabledState] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Load sidebar preference
  useEffect(() => {
    if (userId) {
      const enabled = isCustomOrderEnabled(userId);
      setCustomOrderEnabledState(enabled);
    }
  }, [userId]);

  const handleSidebarOrderToggle = (enabled: boolean) => {
    if (!userId) return;

    setCustomOrderEnabled(userId, enabled);
    setCustomOrderEnabledState(enabled);
    
    if (!enabled) {
      // Clear cached order when disabling so user starts fresh when re-enabling
      clearSidebarOrder(userId);
    }
    
    toast.success(
      enabled
        ? "Custom sidebar ordering enabled. You can now drag and drop menu items."
        : "Custom sidebar ordering disabled. Using default order."
    );
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account information
        </p>
      </div>

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your personal account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* First Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <User className="h-4 w-4" />
              First Name
            </Label>
            <div className="text-foreground text-lg font-medium bg-muted/50 px-4 py-3 rounded-md border border-border">
              {userData?.firstName || 'Not provided'}
            </div>
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <User className="h-4 w-4" />
              Last Name
            </Label>
            <div className="text-foreground text-lg font-medium bg-muted/50 px-4 py-3 rounded-md border border-border">
              {userData?.lastName || 'Not provided'}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <div className="text-foreground text-lg font-medium bg-muted/50 px-4 py-3 rounded-md border border-border">
              {userData?.email || 'Not provided'}
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <div className="text-foreground text-lg font-medium bg-muted/50 px-4 py-3 rounded-md border border-border">
              {userData?.phone || 'Not provided'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutPanelTop className="h-5 w-5 text-primary" />
            Preferences
          </CardTitle>
          <CardDescription>
            Customize your dashboard experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sidebar Order Preference */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sidebar-order-toggle" className="text-base font-medium">
                Custom Sidebar Order
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable drag and drop to reorder sidebar menu items
              </p>
            </div>
            <Switch
              id="sidebar-order-toggle"
              checked={customOrderEnabled}
              onCheckedChange={handleSidebarOrderToggle}
              disabled={!userId}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

