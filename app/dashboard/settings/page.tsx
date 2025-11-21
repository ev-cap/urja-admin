"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { useUserData } from "@/hooks/useUserData";
import { User, Mail, Phone, UserCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { userData, loading, error } = useUserData();

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account information
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
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
    </div>
  );
}

