"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiCache, generateCacheKey } from "@/lib/cache/apiCache";
import { 
  CreditCard, 
  AlertTriangle, 
  TrendingDown, 
  Users, 
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  Zap,
  User,
  UserCircle,
  Eye,
  Phone,
  Mail,
  IdCard
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import { getManagedToken } from "@/lib/auth/tokenManager";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import Sheet from "@/components/ui/native-swipeable-sheets";
import { UserIdDisplay } from "@/components/ui/user-id-display";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  WheelPicker,
  WheelPickerWrapper,
  type WheelPickerOption,
} from "@/components/wheel-picker";
import { ChevronsUpDown, XIcon } from "lucide-react";

interface Credit {
  creditType: string;
  creditPoints: number;
  validFrom: string;
  validUntil: string;
  source: string;
}

interface UserCredit {
  id: string;
  userId: string;
  credits: Credit[];
  lastMonthlyCreditDate: string;
  totalAvailableCredits: number;
}

interface CreditsResponse {
  userCredits: UserCredit[];
  total: number;
}

const CREDITS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const createCreditOptions = (min: number, max: number): WheelPickerOption<number>[] =>
  Array.from({ length: max - min + 1 }, (_, i) => {
    const value = i + min;
    return {
      label: value.toString(),
      value: value,
    };
  });

const creditOptions = createCreditOptions(100, 1000);

export default function CreditConsumptionPage() {
  const [loading, setLoading] = useState(true);
  const [creditsData, setCreditsData] = useState<CreditsResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserCredit, setSelectedUserCredit] = useState<UserCredit | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userBasicInfo, setUserBasicInfo] = useState<any>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);
  const [updateCreditsSheetOpen, setUpdateCreditsSheetOpen] = useState(false);
  const [selectedUserForUpdate, setSelectedUserForUpdate] = useState<UserCredit | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [updatingCredits, setUpdatingCredits] = useState(false);
  const [wheelPickerOpen, setWheelPickerOpen] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        console.warn('[CreditConsumption] User not authenticated');
        toast.error('Please sign in to view credit consumption');
        setLoading(false);
        return;
      }
      fetchCredits();
    }
  }, [isAuthenticated, authLoading]);

  const fetchCredits = useCallback(async () => {
    try {
      setLoading(true);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error('API_URL is not defined in environment');
      }

      // Check cache first
      const cacheKey = generateCacheKey(`${API_URL}/credits`);
      const cached = apiCache.get<CreditsResponse>(cacheKey);
      
      if (cached) {
        setCreditsData(cached);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const token = await getManagedToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers['x-jwt-token'] = token;
      }

      const response = await axios.get<CreditsResponse>(`${API_URL}/credits`, { headers });
      
      // Cache the results
      apiCache.set(cacheKey, response.data, CREDITS_CACHE_TTL);
      
      setCreditsData(response.data);
    } catch (err: any) {
      console.error('[CreditConsumption] Error fetching credits:', err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message || 'Failed to fetch credit data');
      } else {
        toast.error('An unexpected error occurred');
      }
      setCreditsData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cache to force refresh
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (API_URL) {
      apiCache.delete(generateCacheKey(`${API_URL}/credits`));
    }
    await fetchCredits();
  };

  const getDaysUntilExpiry = (validUntil: string): number => {
    const expiryDate = new Date(validUntil);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if credits are low based on creditPoints or totalAvailableCredits
  const isCreditLow = (userCredit: UserCredit): boolean => {
    // Check totalAvailableCredits
    if (userCredit.totalAvailableCredits < 50) {
      return true;
    }
    // Check individual creditPoints
    if (userCredit.credits && userCredit.credits.length > 0) {
      const lowCredits = userCredit.credits.filter(credit => credit.creditPoints < 50);
      if (lowCredits.length > 0) {
        return true;
      }
    }
    return false;
  };

  // Check if credits are critically low (high alert)
  const isCreditCriticallyLow = (userCredit: UserCredit): boolean => {
    // Critical: less than 20 credits
    if (userCredit.totalAvailableCredits < 20) {
      return true;
    }
    // Check individual creditPoints
    if (userCredit.credits && userCredit.credits.length > 0) {
      const criticalCredits = userCredit.credits.filter(credit => credit.creditPoints < 20);
      if (criticalCredits.length > 0) {
        return true;
      }
    }
    return false;
  };

  const getCreditStatus = (userCredit: UserCredit): 'critical' | 'low' | 'ok' => {
    if (isCreditCriticallyLow(userCredit)) {
      return 'critical';
    }
    if (isCreditLow(userCredit)) {
      return 'low';
    }
    return 'ok';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate summary statistics
  const summaryStats = creditsData ? {
    totalUsers: creditsData.total,
    criticalCredits: creditsData.userCredits.filter(uc => isCreditCriticallyLow(uc)).length,
    lowCredits: creditsData.userCredits.filter(uc => isCreditLow(uc)).length, // Includes critical users too
    totalCredits: creditsData.userCredits.reduce((sum, uc) => sum + uc.totalAvailableCredits, 0),
    averageCredits: creditsData.userCredits.length > 0
      ? Math.round(creditsData.userCredits.reduce((sum, uc) => sum + uc.totalAvailableCredits, 0) / creditsData.userCredits.length)
      : 0,
  } : null;

  // Filter users with warnings (low or critical credits)
  const usersWithWarnings = creditsData?.userCredits.filter(uc => {
    const status = getCreditStatus(uc);
    return status !== 'ok';
  }) || [];

  // Fetch user basic info
  const fetchUserBasicInfo = async (userId: string) => {
    setLoadingUserInfo(true);
    setUserBasicInfo(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error('API_URL is not defined');
      }

      const token = await getManagedToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers['x-jwt-token'] = token;
      }

      const response = await axios.get(`${API_URL}/users/${userId}/basic-info`, { headers });
      setUserBasicInfo(response.data);
    } catch (err: any) {
      console.error('[CreditConsumption] Error fetching user basic info:', err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message || 'Failed to fetch user information');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setLoadingUserInfo(false);
    }
  };

  const handleUserIdClick = (userId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedUserId(userId);
    setUserInfoModalOpen(true);
    fetchUserBasicInfo(userId);
  };

  const handleCardClick = (userCredit: UserCredit) => {
    setSelectedUserCredit(userCredit);
    setDetailSheetOpen(true);
  };

  const handleUpdateCredits = (userCredit: UserCredit, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedUserForUpdate(userCredit);
    setCreditAmount("");
    setUpdateCreditsSheetOpen(true);
  };

  const updateUserCredits = async () => {
    if (!selectedUserForUpdate || !creditAmount) {
      toast.error("Please enter a credit amount");
      return;
    }

    const amount = parseInt(creditAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    setUpdatingCredits(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error('API_URL is not defined in environment');
      }

      const token = await getManagedToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers['x-jwt-token'] = token;
      }

      // Calculate dates: validFrom is now, validUntil is 30 days from now
      const now = new Date();
      const validFrom = now.toISOString();
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const lastMonthlyCreditDate = now.toISOString();

      const requestBody = {
        credits: [{
          creditType: "subscription",
          creditPoints: amount,
          validFrom: validFrom,
          validUntil: validUntil,
          source: "monthly_recurring",
          purchasePack: "",
          transactionId: ""
        }],
        lastMonthlyCreditDate: lastMonthlyCreditDate,
        totalAvailableCredits: amount
      };

      const response = await axios.put(
        `${API_URL}/credits/${selectedUserForUpdate.userId}`,
        requestBody,
        { headers }
      );

      // Clear cache to force refresh
      const cacheKey = generateCacheKey(`${API_URL}/credits`);
      apiCache.delete(cacheKey);

      toast.success("Credits updated");
      setUpdateCreditsSheetOpen(false);
      setSelectedUserForUpdate(null);
      setCreditAmount("");
      
      // Refresh the credits data
      await fetchCredits();
    } catch (err: any) {
      console.error('[CreditConsumption] Error updating credits:', err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message || 'Failed to update credits');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setUpdatingCredits(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-6 pb-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Credits List Skeleton */}
        <Card className="border-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
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
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        .custom-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <CreditCard className="h-10 w-10 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Credit Consumption</h1>
              <p className="text-muted-foreground mt-1">
                Monitor user credit balances and expiration status
              </p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            variant="outline"
            className="gap-2"
          >
            {refreshing || loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>


        {/* Summary Stats */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={`skeleton-stat-${index}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : summaryStats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-chart-1" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Users with credit accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                <Zap className="h-4 w-4 text-chart-2" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalCredits.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average: {summaryStats.averageCredits} per user
                </p>
              </CardContent>
            </Card>

            <Card className={cn(
              summaryStats.criticalCredits > 0 && "border-red-500/50 bg-red-500/5"
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Alert</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {summaryStats.criticalCredits}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Users with &lt; 20 credits
                </p>
              </CardContent>
            </Card>

            <Card className={cn(
              summaryStats.lowCredits > 0 && "border-orange-500/50 bg-orange-500/5"
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Credits</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {summaryStats.lowCredits}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Users with &lt; 50 credits
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Warning Alerts */}
        {usersWithWarnings.length > 0 && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                High Alert Users ({usersWithWarnings.length})
              </CardTitle>
              <CardDescription>
                Users with low credit balances requiring immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usersWithWarnings.slice(0, 5).map((userCredit) => {
                  const status = getCreditStatus(userCredit);
                  
                  return (
                    <div
                      key={userCredit.id}
                      onClick={() => handleCardClick(userCredit)}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                        status === 'critical' && "bg-red-500/10 border-red-500/30 hover:bg-red-500/15",
                        status === 'low' && "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-semibold">User ID: </span>
                            <UserIdDisplay userId={userCredit.userId} variant="inline" />
                            {status === 'critical' && (
                              <Badge variant="destructive" className="text-xs">
                                Critical
                              </Badge>
                            )}
                            {status === 'low' && (
                              <Badge className="bg-orange-500 text-white border-orange-500 text-xs">
                                Low Credits
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Total Available</p>
                              <p className={cn(
                                "font-semibold text-lg",
                                status === 'critical' && "text-red-500",
                                status === 'low' && "text-orange-500"
                              )}>
                                {userCredit.totalAvailableCredits}
                              </p>
                            </div>
                            {userCredit.credits && userCredit.credits.length > 0 && (() => {
                              const credit = userCredit.credits?.[0];
                              if (!credit) return null;
                              return (
                                <>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Credit Points</p>
                                    <p className={cn(
                                      "font-semibold",
                                      credit.creditPoints < 20 && "text-red-500",
                                      credit.creditPoints < 50 && credit.creditPoints >= 20 && "text-orange-500"
                                    )}>
                                      {credit.creditPoints}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Source</p>
                                    <p className="font-semibold capitalize text-xs">
                                      {credit.source.replace(/_/g, ' ')}
                                    </p>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <Button
                          onClick={(e) => handleUpdateCredits(userCredit, e)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Update Credits
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {usersWithWarnings.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing 5 of {usersWithWarnings.length} high alert users. Click to view details.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Users Credits Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              All User Credits
            </CardTitle>
            <CardDescription>
              Complete list of user credit balances and expiration dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="p-4 rounded-lg border">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : creditsData && creditsData.userCredits.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {creditsData.userCredits.map((userCredit) => {
                  const status = getCreditStatus(userCredit);
                  const credit = userCredit.credits && userCredit.credits.length > 0 ? userCredit.credits[0] : undefined;
                  
                  return (
                    <div
                      key={userCredit.id}
                      onClick={() => handleCardClick(userCredit)}
                      className={cn(
                        "p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                        status === 'critical' && "bg-red-500/5 border-red-500/20 hover:bg-red-500/10",
                        status === 'low' && "bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10",
                        status === 'ok' && "bg-card border-border hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <UserIdDisplay userId={userCredit.userId} variant="compact" />
                            {status === 'critical' && (
                              <Badge variant="destructive" className="text-xs">
                                Critical
                              </Badge>
                            )}
                            {status === 'low' && (
                              <Badge className="bg-orange-500 text-white border-orange-500 text-xs">
                                Low
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Total Available Credits
                              </p>
                              <p className={cn(
                                "text-lg font-bold",
                                status === 'critical' && "text-red-500",
                                status === 'low' && "text-orange-500"
                              )}>
                                {userCredit.totalAvailableCredits}
                              </p>
                            </div>
                            
                            {credit && (
                              <>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    Credit Points
                                  </p>
                                  <p className={cn(
                                    "text-lg font-bold",
                                    credit.creditPoints < 20 && "text-red-500",
                                    credit.creditPoints < 50 && credit.creditPoints >= 20 && "text-orange-500"
                                  )}>
                                    {credit.creditPoints}
                                  </p>
                                </div>
                                
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Valid From
                                  </p>
                                  <p className="text-sm font-semibold">
                                    {formatDate(credit.validFrom)}
                                  </p>
                                </div>
                                
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Credit Details</p>
                                  <div className="space-y-1">
                                    <Badge variant="outline" className="text-xs">
                                      {credit.creditType}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {credit.source.replace(/_/g, ' ')}
                                    </p>
                                  </div>
                                </div>
                              </>
                            )}
                            
                            {!credit && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Last Credit Date</p>
                                <p className="text-sm font-semibold">
                                  {formatDate(userCredit.lastMonthlyCreditDate)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={(e) => handleUpdateCredits(userCredit, e)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Update Credits
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No credit data available</p>
                <p className="text-xs mt-1">Credit information will appear here once available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credit Detail Sheet */}
      <Sheet
        open={detailSheetOpen}
        close={() => {
          setDetailSheetOpen(false);
          setSelectedUserCredit(null);
        }}
        title="Credit Details"
      >
        {selectedUserCredit && (
          <div className="flex flex-col gap-6 p-6 pt-12 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="relative -m-6 mb-0 p-6 pb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-t-3xl border-b">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 border-2 border-primary/30 shadow-lg">
                  <CreditCard className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold text-foreground mb-1">Credit Details</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm bg-primary/10 px-3 py-1 rounded-full border border-primary/30 hover:bg-primary/20 transition-colors flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <UserIdDisplay userId={selectedUserCredit.userId} variant="inline" textClassName="text-primary" />
                      <button
                        onClick={(e) => handleUserIdClick(selectedUserCredit.userId, e)}
                        className="hover:underline"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                    </div>
                    {(() => {
                      const status = getCreditStatus(selectedUserCredit);
                      if (status === 'critical') {
                        return (
                          <Badge variant="destructive" className="text-xs">
                            Critical Alert
                          </Badge>
                        );
                      }
                      if (status === 'low') {
                        return (
                          <Badge className="bg-orange-500 text-white border-orange-500 text-xs">
                            Low Credits
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Credit Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card rounded-lg p-4 border border-border/50 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Available Credits</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      selectedUserCredit.totalAvailableCredits < 20 && "text-red-500",
                      selectedUserCredit.totalAvailableCredits < 50 && selectedUserCredit.totalAvailableCredits >= 20 && "text-orange-500"
                    )}>
                      {selectedUserCredit.totalAvailableCredits}
                    </p>
                  </div>
                  <div className="bg-card rounded-lg p-4 border border-border/50 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credit Record ID</p>
                    <p className="text-sm font-mono text-foreground break-all">{selectedUserCredit.id}</p>
                  </div>
                  <div className="bg-card rounded-lg p-4 border border-border/50 space-y-1.5 md:col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Monthly Credit Date</p>
                    <p className="text-sm text-foreground font-medium">{formatDate(selectedUserCredit.lastMonthlyCreditDate)}</p>
                  </div>
                </div>
              </div>

              {/* Credits List */}
              {selectedUserCredit.credits && selectedUserCredit.credits.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Credit Entries ({selectedUserCredit.credits.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedUserCredit.credits.map((credit, index) => (
                      <div
                        key={index}
                        className={cn(
                          "bg-card rounded-lg p-4 border border-border/50",
                          credit.creditPoints < 20 && "bg-red-500/5 border-red-500/30",
                          credit.creditPoints < 50 && credit.creditPoints >= 20 && "bg-orange-500/5 border-orange-500/30"
                        )}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credit Points</p>
                            <p className={cn(
                              "text-xl font-bold",
                              credit.creditPoints < 20 && "text-red-500",
                              credit.creditPoints < 50 && credit.creditPoints >= 20 && "text-orange-500"
                            )}>
                              {credit.creditPoints}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credit Type</p>
                            <Badge variant="outline" className="text-xs">
                              {credit.creditType}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valid From</p>
                            <p className="text-sm font-semibold">{formatDate(credit.validFrom)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valid Until</p>
                            <p className="text-sm font-semibold">{formatDate(credit.validUntil)}</p>
                            <p className="text-xs text-muted-foreground">
                              {(() => {
                                const days = getDaysUntilExpiry(credit.validUntil);
                                return days < 0 ? 'Expired' : `${days} day${days !== 1 ? 's' : ''} remaining`;
                              })()}
                            </p>
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source</p>
                            <p className="text-sm font-semibold capitalize">{credit.source.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* User Info Sheet */}
      <Sheet
        open={userInfoModalOpen}
        close={() => {
          setUserInfoModalOpen(false);
          setUserBasicInfo(null);
          setSelectedUserId(null);
        }}
        title="User Information"
      >
        <div className="flex flex-col gap-6 p-6 pt-12 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">User Information</h3>
              <p className="text-sm text-muted-foreground">Quick user details</p>
            </div>
          </div>

          {/* Loading State */}
          {loadingUserInfo && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading user information...</p>
            </div>
          )}

          {/* User Info Display */}
          {userBasicInfo && !loadingUserInfo && (
            <div className="space-y-4">
              {/* User ID */}
              {selectedUserId && (
                <div className="rounded-lg bg-muted/50 p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <IdCard className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">User ID</p>
                  </div>
                  <UserIdDisplay userId={selectedUserId} textClassName="text-foreground" />
                </div>
              )}

              {/* Name */}
              {(userBasicInfo.firstName || userBasicInfo.lastName) && (
                <div className="rounded-lg bg-muted/50 p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {userBasicInfo.firstName || ''} {userBasicInfo.lastName || ''}
                  </p>
                </div>
              )}

              {/* Email */}
              {userBasicInfo.email && (
                <div className="rounded-lg bg-muted/50 p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground break-all">{userBasicInfo.email}</p>
                </div>
              )}

              {/* Phone */}
              {userBasicInfo.phone && (
                <div className="rounded-lg bg-muted/50 p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground font-mono">{userBasicInfo.phone}</p>
                </div>
              )}

              {/* Status */}
              {userBasicInfo.userStatus && (
                <div className="rounded-lg bg-muted/50 p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
                  </div>
                  <Badge variant={userBasicInfo.userStatus === 'active' ? 'default' : 'secondary'}>
                    {userBasicInfo.userStatus}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>
      </Sheet>

      {/* Update Credits Sheet */}
      <Sheet
        open={updateCreditsSheetOpen}
        close={() => {
          setUpdateCreditsSheetOpen(false);
          setSelectedUserForUpdate(null);
          setCreditAmount("");
        }}
        title="Update Credits"
      >
        {selectedUserForUpdate && (
          <div className="flex flex-col gap-6 p-6 pt-12 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="relative -m-6 mb-0 p-6 pb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-t-3xl border-b">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 border-2 border-primary/30 shadow-lg">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold text-foreground mb-1">Update Credits</h3>
                  <p className="text-sm text-muted-foreground">Add credits for user</p>
                  <div className="mt-2">
                    <UserIdDisplay userId={selectedUserForUpdate.userId} variant="compact" textClassName="text-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditAmount" className="text-sm font-semibold">
                      Credit Amount
                    </Label>
                    <div className="relative">
                      <Input
                        id="creditAmount"
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter credit amount"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        disabled={updatingCredits}
                        className="text-lg pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setWheelPickerOpen(true)}
                        disabled={updatingCredits}
                      >
                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This amount will be added to the user's account as subscription credits
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credit Details</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Credit Type</p>
                        <Badge variant="outline">subscription</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Source</p>
                        <p className="text-xs font-semibold capitalize">monthly recurring</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Validity</p>
                        <p className="text-xs font-semibold">30 days from today</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={updateUserCredits}
                  disabled={updatingCredits || !creditAmount || parseInt(creditAmount, 10) <= 0}
                  className="flex-1 gap-2"
                >
                  {updatingCredits ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Update Credits
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setUpdateCreditsSheetOpen(false);
                    setSelectedUserForUpdate(null);
                    setCreditAmount("");
                  }}
                  disabled={updatingCredits}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {/* Wheel Picker Dialog */}
      <Dialog open={wheelPickerOpen} onOpenChange={setWheelPickerOpen}>
        <DialogPortal>
          <DialogOverlay className="z-[502] backdrop-blur-md" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-[503] grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
            )}
          >
            <DialogHeader>
              <DialogTitle>Select Credit Amount</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <WheelPickerWrapper>
                <WheelPicker
                  options={creditOptions}
                  value={creditAmount ? parseInt(creditAmount, 10) : 100}
                  onValueChange={(value) => {
                    setCreditAmount(value.toString());
                  }}
                  infinite
                />
              </WheelPickerWrapper>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setWheelPickerOpen(false)}>
                Done
              </Button>
            </div>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
