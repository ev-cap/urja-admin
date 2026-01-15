"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShoppingCart, Zap, TrendingUp, Activity, Car, MapPin, Battery, User as UserIcon, FileText, Route, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/loader";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "axios";
import Sheet from "@/components/ui/native-swipeable-sheets";
import dynamic from "next/dynamic";
import { apiCache, generateCacheKey } from "@/lib/cache/apiCache";
import { useManualLazyLoad } from "@/hooks/useLazyLoad";
import toast from "react-hot-toast";
import { UserIdDisplay } from "@/components/ui/user-id-display";
import { getAllUsers } from "@/lib/services/userService";

// Dynamically import RouteMap to avoid SSR issues with Leaflet
const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

interface ActivityLog {
  id: string;
  userId: string;
  category: string;
  action: string;
  description: string;
  meta?: any;
  createdAt: string;
  processed: boolean;
}

const ACTIVITY_LOGS_PAGE_SIZE = 20;
const DASHBOARD_STATS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const ROUTE_ANALYTICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_LOGS_CACHE_TTL = 30 * 1000; // 30 seconds

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [totalStations, setTotalStations] = useState<number>(0);
  const [totalIssues, setTotalIssues] = useState<number>(0);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [routeAnalytics, setRouteAnalytics] = useState<any[]>([]);
  const [loadingRouteAnalytics, setLoadingRouteAnalytics] = useState(false);
  const { isAuthenticated, isLoading: authLoading, sessionId } = useAuth();

  // Lazy loading for activity logs
  const fetchActivityLogsPage = useCallback(async (page: number) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!API_URL) {
      return { data: [], hasMore: false };
    }

    const cacheKey = generateCacheKey(`${API_URL}/activitylogs`, { page });
    const cached = apiCache.get<ActivityLog[]>(cacheKey);
    
    if (cached) {
      return { data: cached, hasMore: cached.length === ACTIVITY_LOGS_PAGE_SIZE };
    }

    try {
      // Let axios interceptor handle auth headers automatically
      const response = await axios.get(`${API_URL}/activitylogs`);
      const activities = response.data?.activities || response.data || [];
      const allLogs = Array.isArray(activities) ? activities : [];
      
      // Paginate: get page of logs
      const startIndex = (page - 1) * ACTIVITY_LOGS_PAGE_SIZE;
      const endIndex = startIndex + ACTIVITY_LOGS_PAGE_SIZE;
      const pageLogs = allLogs.slice(startIndex, endIndex);

      // Cache the page
      apiCache.set(cacheKey, pageLogs, ACTIVITY_LOGS_CACHE_TTL);

      return {
        data: pageLogs,
        hasMore: endIndex < allLogs.length,
      };
    } catch (err) {
      console.error('[Dashboard] Error fetching activity logs:', err);
      return { data: [], hasMore: false };
    }
  }, []);

  const {
    items: activityLogs,
    isFetching: loadingActivityLogs,
    hasMore: hasMoreActivityLogs,
    loadMore: loadMoreActivityLogs,
    loadInitial: loadInitialActivityLogs,
  } = useManualLazyLoad<ActivityLog>(fetchActivityLogsPage, { enabled: isAuthenticated && !authLoading });

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      if (!API_URL) {
        throw new Error('API_URL is not defined in environment');
      }

      // Check cache first
      const cacheKey = generateCacheKey(`${API_URL}/dashboard-stats`);
      const cached = apiCache.get<{ totalUsers: number; activeUsers: number; totalStations: number; totalIssues: number }>(cacheKey);
      
      if (cached) {
        setTotalUsers(cached.totalUsers);
        setActiveUsers(cached.activeUsers);
        setTotalStations(cached.totalStations);
        setTotalIssues(cached.totalIssues || 0);
        setLoading(false);
        return;
      }

      // Use getAllUsers service which properly handles sessionId header
      // Fetch users, stations, and issues in parallel
      const [usersData, stationsResponse, issuesResponse] = await Promise.all([
        getAllUsers(sessionId || undefined).catch(err => {
          console.error('[Dashboard] Error fetching users:', err);
          if (axios.isAxiosError(err) && err.response?.status === 401) {
            console.error('[Dashboard] 401 Unauthorized - Token may be invalid or expired');
          }
          return [];
        }),
        axios.get(`${API_URL}/stations`).catch(err => {
          console.error('[Dashboard] Error fetching stations:', err);
          return { data: { stations: [] } };
        }),
        axios.get(`${API_URL}/userissues/all`).catch(err => {
          console.error('[Dashboard] Error fetching issues:', err);
          return { data: { issues: [], count: 0 } };
        }),
      ]);

      // getAllUsers already returns an array of users
      const users = Array.isArray(usersData) ? usersData : [];
      
      const total = Array.isArray(users) ? users.length : 0;
      const active = Array.isArray(users) 
        ? users.filter((user: any) => user.userStatus === "active").length 
        : 0;

      // Handle stations response structure - could be { stations: [...] } or [...]
      const stations = stationsResponse.data?.stations || stationsResponse.data || [];
      const totalStationsCount = Array.isArray(stations) ? stations.length : 0;

      // Handle issues response - get count from response or calculate from issues array
      const issuesData = issuesResponse.data?.issues || [];
      const issuesCount = issuesResponse.data?.count ?? (Array.isArray(issuesData) ? issuesData.length : 0);

      const statsData = { totalUsers: total, activeUsers: active, totalStations: totalStationsCount, totalIssues: issuesCount };
      
      // Cache the results
      apiCache.set(cacheKey, statsData, DASHBOARD_STATS_CACHE_TTL);

      setTotalUsers(total);
      setActiveUsers(active);
      setTotalStations(totalStationsCount);
      setTotalIssues(issuesCount);
    } catch (err) {
      console.error('[Dashboard] Error fetching dashboard stats:', err);
      toast.error('Failed to load dashboard statistics');
      // Set defaults on error
      setTotalUsers(0);
      setActiveUsers(0);
      setTotalStations(0);
      setTotalIssues(0);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchRouteAnalytics = useCallback(async () => {
    setLoadingRouteAnalytics(true);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      if (!API_URL) {
        throw new Error('API_URL is not defined in environment');
      }

      // Check cache first
      const cacheKey = generateCacheKey(`${API_URL}/routes/analytics`);
      const cached = apiCache.get<any[]>(cacheKey);
      
      if (cached) {
        setRouteAnalytics(cached);
        setLoadingRouteAnalytics(false);
        return;
      }

      // Let axios interceptor handle auth headers automatically
      const response = await axios.get(`${API_URL}/routes/analytics`);
      
      // Handle response structure - could be { analytics: [...] } or [...]
      const analytics = response.data?.analytics || response.data;
      const routes = Array.isArray(analytics) ? analytics : [];
      
      console.log('[Dashboard] Route analytics fetched:', {
        total: routes.length,
        sample: routes[0] ? Object.keys(routes[0]) : null,
      });
      
      // Cache the results
      apiCache.set(cacheKey, routes, ROUTE_ANALYTICS_CACHE_TTL);
      
      setRouteAnalytics(routes);
    } catch (err: any) {
      console.error('[Dashboard] Route analytics fetch failed:', err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message || 'Failed to fetch route analytics');
      } else {
        toast.error('An unexpected error occurred');
      }
      setRouteAnalytics([]);
    } finally {
      setLoadingRouteAnalytics(false);
    }
  }, []);

  useEffect(() => {
    // Check authentication
    if (!authLoading) {
      if (!isAuthenticated) {
        console.warn('[Dashboard] User not authenticated');
        toast.error('Please sign in to view dashboard');
        setLoading(false);
        return;
      }
      fetchDashboardStats();
      loadInitialActivityLogs();
      fetchRouteAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  // Set up polling for activity logs (refresh cache and reload first page every 30 seconds)
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const interval = setInterval(() => {
      // Clear activity logs cache to force refresh
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (API_URL) {
        // Clear all activity log cache entries
        for (let i = 1; i <= 10; i++) {
          apiCache.delete(generateCacheKey(`${API_URL}/activitylogs`, { page: i }));
        }
      }
      loadInitialActivityLogs();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Vehicle':
        return Car;
      case 'Route':
        return MapPin;
      case 'Charging':
        return Battery;
      case 'User':
        return UserIcon;
      default:
        return FileText;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const stats = [
    {
      title: "Total Users",
      value: totalUsers.toLocaleString(),
      icon: Users,
      color: "text-chart-1",
    },
    {
      title: "Total Active Users",
      value: activeUsers.toLocaleString(),
      icon: ShoppingCart,
      color: "text-chart-2",
    },
    {
      title: "Total Charging Stations",
      value: totalStations.toLocaleString(),
      icon: Zap,
      color: "text-chart-3",
    },
    {
      title: "Total Issues",
      value: totalIssues.toLocaleString(),
      icon: AlertCircle,
      color: "text-chart-4",
    },
  ];

  // Show loading state while auth is being established
  if (authLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Stats Grid Skeleton */}
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

        {/* Charts Skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Activity Logs Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`skeleton-activity-${index}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card"
                >
                  <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Skeleton className="h-5 w-16 rounded-md" />
                        <Skeleton className="h-4 w-24 rounded" />
                      </div>
                      {index === 0 && <Skeleton className="h-5 w-12 rounded-full" />}
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
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
          width: 8px;
          height: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(99, 102, 241, 0.5), rgba(168, 85, 247, 0.5));
          border-radius: 4px;
          border: 2px solid rgba(15, 23, 42, 0.3);
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(99, 102, 241, 0.8), rgba(168, 85, 247, 0.8));
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(99, 102, 241, 0.5) rgba(15, 23, 42, 0.3);
        }
        
        /* Remove scrolling for Plan Route Analytics */
        .route-analytics-content {
          overflow: visible !important;
        }
        
        /* Hide scrollbar for Recent Activity Logs */
        .activity-logs-content::-webkit-scrollbar {
          display: none;
        }
        
        .activity-logs-content {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Fix marker stretching */
        .custom-map-marker img {
          object-fit: contain !important;
          width: auto !important;
          height: auto !important;
          max-width: 40px !important;
          max-height: 40px !important;
        }
      `}</style>
      <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening with your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          // Skeleton loaders for stats cards
          Array.from({ length: 4 }).map((_, index) => (
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
          ))
        ) : (
          stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Recent Activity and Plan Route Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-8">
        {/* Plan Route Analytics */}
        <Card className="col-span-4 h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              Plan Route Analytics
            </CardTitle>
            <CardDescription>
              Comprehensive analysis of route planning and charging patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2 flex-1 overflow-visible route-analytics-content">
            {loading || loadingRouteAnalytics ? (
              <div className="h-full space-y-4">
                {/* Summary Stats Skeletons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`skeleton-summary-${index}`} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <Skeleton className="h-3 w-20 mb-2" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
                {/* Map Skeleton */}
                <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border">
                  <Skeleton className="h-full w-full" />
                </div>
              </div>
            ) : routeAnalytics.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="text-center">
                  <Route className="h-12 w-12 mb-4 opacity-20 mx-auto" />
                  <p className="text-sm mb-2">No route analytics data available</p>
                  <p className="text-xs opacity-70">Routes will appear here once users plan routes</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchRouteAnalytics}
                  className="mt-2"
                >
                  <Loader2 className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Total Routes</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {routeAnalytics.length}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Total Distance</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {(() => {
                        const total = routeAnalytics.reduce((sum, route) => {
                          const distance = route?.apiResponse?.routeAnalyses?.[0]?.route?.distanceKm || 
                                          route?.apiResponse?.batteryManagement?.routeDistanceEstimate || 0;
                          return sum + distance;
                        }, 0);
                        return (total / 1000).toFixed(1);
                      })()}k km
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Avg Charging Time</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {(() => {
                        const total = routeAnalytics.reduce((sum, route) => {
                          const time = route?.apiResponse?.batteryManagement?.totalChargingTime || 
                                       route?.apiResponse?.routeAnalyses?.[0]?.totalChargingTime || 0;
                          return sum + time;
                        }, 0);
                        const avg = routeAnalytics.length > 0 ? total / routeAnalytics.length : 0;
                        return Math.round(avg);
                      })()} min
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Total Charging Cost</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      ₹{(() => {
                        const total = routeAnalytics.reduce((sum, route) => {
                          const cost = route?.apiResponse?.batteryManagement?.totalChargingCost || 
                                      route?.apiResponse?.routeAnalyses?.[0]?.totalChargingCost || 0;
                          return sum + cost;
                        }, 0);
                        return total.toFixed(0);
                      })()}
                    </p>
                  </div>
                </div>

                {/* Route Map Visualization */}
                <div className="h-[400px] w-full">
                  <RouteMap routes={routeAnalytics} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Logs */}
        <Card className="col-span-3 border-2 shadow-lg h-[600px] flex flex-col">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Activity Logs
                </CardTitle>
                <CardDescription className="mt-1.5 text-xs">
                  Latest platform activities • {activityLogs.length} entries
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto activity-logs-content">
            <div className="space-y-2 pr-2">
              {loading || loadingActivityLogs ? (
                // Skeleton loaders for activity logs
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`skeleton-activity-${index}`}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card"
                  >
                    <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Skeleton className="h-5 w-16 rounded-md" />
                          <Skeleton className="h-4 w-24 rounded" />
                        </div>
                        {index === 0 && <Skeleton className="h-5 w-12 rounded-full" />}
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No activity logs available</p>
                  <p className="text-xs mt-1">Activity logs will appear here</p>
                </div>
              ) : (
                <>
                  {activityLogs.map((log, index) => {
                  const Icon = getCategoryIcon(log.category);
                  const getCategoryColor = (category: string) => {
                    switch (category) {
                      case 'Vehicle':
                        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
                      case 'Route':
                        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
                      case 'Charging':
                        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
                      case 'User':
                        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
                      default:
                        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
                    }
                  };
                  
                  return (
                    <div
                      key={log.id}
                      onClick={() => {
                        setSelectedLog(log);
                        setSheetOpen(true);
                      }}
                      className="group relative flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/50 hover:border-primary/30 cursor-pointer transition-all duration-200 hover:shadow-md"
                    >
                      {/* Left Icon */}
                      <div className={`h-10 w-10 rounded-lg ${getCategoryColor(log.category).split(' ')[0]} flex items-center justify-center flex-shrink-0 border ${getCategoryColor(log.category).split(' ')[2]} group-hover:scale-110 transition-transform`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${getCategoryColor(log.category)}`}>
                              {log.category}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </div>
                          {index === 0 && (
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              Latest
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground leading-relaxed line-clamp-2 font-medium">
                          {log.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                            {formatTimeAgo(log.createdAt)}
                          </p>
                          {log.processed ? (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                              Processed
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Hover Arrow */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  );
                  })}
                  {hasMoreActivityLogs && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMoreActivityLogs}
                        disabled={loadingActivityLogs}
                        className="gap-2"
                      >
                        {loadingActivityLogs ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Load More
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log Detail Sheet */}
      <Sheet
        open={sheetOpen}
        close={() => {
          setSheetOpen(false);
          setSelectedLog(null);
        }}
        title="Activity Log Details"
      >
        {selectedLog && (
          <div className="flex flex-col gap-6 p-6 pt-12 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Header with Gradient */}
            <div className="relative -m-6 mb-0 p-6 pb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-t-3xl border-b">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 border-2 border-primary/30 shadow-lg">
                  {(() => {
                    const Icon = getCategoryIcon(selectedLog.category);
                    return <Icon className="h-7 w-7 text-primary" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold text-foreground mb-1">Activity Log Details</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-primary bg-primary/20 px-3 py-1 rounded-full border border-primary/30">
                      {selectedLog.category}
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {selectedLog.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                {selectedLog.processed ? (
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/20 px-3 py-1.5 rounded-full border border-green-500/30">
                    ✓ Processed
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-500/20 px-3 py-1.5 rounded-full border border-yellow-500/30">
                    ⏳ Pending
                  </span>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Description Card */}
              <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Description
                </h4>
                <p className="text-sm text-foreground leading-relaxed">{selectedLog.description}</p>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card rounded-lg p-4 border border-border/50 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</p>
                  <p className="text-base font-semibold text-foreground">{selectedLog.category}</p>
                </div>
                <div className="bg-card rounded-lg p-4 border border-border/50 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</p>
                  <p className="text-base font-semibold text-foreground font-mono">{selectedLog.action.replace(/_/g, ' ')}</p>
                </div>
                <div className="bg-card rounded-lg p-4 border border-border/50 space-y-1.5 md:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">User ID</p>
                  <div className="bg-muted/50 p-2 rounded border">
                    <UserIdDisplay userId={selectedLog.userId} textClassName="text-foreground" />
                  </div>
                </div>
                <div className="bg-card rounded-lg p-4 border border-border/50 space-y-1.5 md:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created At</p>
                  <p className="text-sm text-foreground font-medium">{formatDate(selectedLog.createdAt)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(selectedLog.createdAt)}</p>
                </div>
              </div>

              {/* Meta Data */}
              {selectedLog.meta && Object.keys(selectedLog.meta).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Additional Information
                  </h4>
                  <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(selectedLog.meta).map(([key, value]) => {
                        const formattedKey = key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase())
                          .trim();
                        
                        return (
                          <div key={key} className="flex flex-col">
                            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">{formattedKey}</p>
                            {typeof value === 'object' && value !== null ? (
                              <div className="bg-background/80 rounded-lg p-3 border border-border/50 flex-1">
                                <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <p className="text-sm text-foreground break-words bg-background/50 p-2 rounded border border-border/30 font-medium flex-1">
                                {String(value)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Activity ID Footer */}
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity ID</p>
                <p className="text-xs font-mono text-foreground break-all bg-background/50 p-2 rounded border border-border/30">
                  {selectedLog.id}
                </p>
              </div>
            </div>
          </div>
        )}
      </Sheet>
      </div>
    </>
  );
}

