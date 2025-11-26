"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ShoppingCart, Zap, TrendingUp, Activity, Car, MapPin, Battery, User as UserIcon, FileText, Route, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/loader";
import axios from "axios";
import { getManagedToken } from "@/lib/auth/tokenManager";
import Sheet from "@/components/ui/native-swipeable-sheets";
import dynamic from "next/dynamic";

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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [totalStations, setTotalStations] = useState<number>(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [routeAnalytics, setRouteAnalytics] = useState<any[]>([]);
  const [loadingRouteAnalytics, setLoadingRouteAnalytics] = useState(false);
  const [routeAnalyticsError, setRouteAnalyticsError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Check authentication
    if (!authLoading) {
      if (!isAuthenticated) {
        console.warn('[Dashboard] User not authenticated');
        setError('Please sign in to view dashboard');
        setLoading(false);
        return;
      }
      fetchDashboardStats();
      fetchActivityLogs();
      fetchRouteAnalytics();
    }
  }, [isAuthenticated, authLoading]);

  // Set up polling for activity logs (refresh every 30 seconds)
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const interval = setInterval(() => {
      fetchActivityLogs();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, authLoading]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
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

      // Fetch users and stations in parallel
      const [usersResponse, stationsResponse] = await Promise.all([
        axios.get(`${API_URL}/users`, { headers }).catch(err => {
          console.error('[Dashboard] Error fetching users:', err);
          return { data: { users: [] } };
        }),
        axios.get(`${API_URL}/stations`, { headers }).catch(err => {
          console.error('[Dashboard] Error fetching stations:', err);
          return { data: { stations: [] } };
        }),
      ]);

      // Handle users response structure - could be { users: [...] } or [...]
      const users = usersResponse.data?.users || usersResponse.data || [];
      
      const total = Array.isArray(users) ? users.length : 0;
      const active = Array.isArray(users) 
        ? users.filter((user: any) => user.userStatus === "active").length 
        : 0;

      // Handle stations response structure - could be { stations: [...] } or [...]
      const stations = stationsResponse.data?.stations || stationsResponse.data || [];
      const totalStationsCount = Array.isArray(stations) ? stations.length : 0;

      setTotalUsers(total);
      setActiveUsers(active);
      setTotalStations(totalStationsCount);
      setError(null);
    } catch (err) {
      console.error('[Dashboard] Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
      // Set defaults on error
      setTotalUsers(0);
      setActiveUsers(0);
      setTotalStations(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      if (!API_URL) {
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

      const response = await axios.get(`${API_URL}/activitylogs`, { headers });

      // Handle response structure - could be { activities: [...] } or [...]
      const activities = response.data?.activities || response.data || [];
      const logs = Array.isArray(activities) ? activities.slice(0, 50) : []; // Get latest 50

      setActivityLogs(logs);
    } catch (err) {
      console.error('[Dashboard] Error fetching activity logs:', err);
      // Don't set error state for activity logs to avoid disrupting the dashboard
    }
  };

  const fetchRouteAnalytics = async () => {
    setLoadingRouteAnalytics(true);
    setRouteAnalyticsError(null);
    
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

      const response = await axios.get(`${API_URL}/routes/analytics`, { headers });
      
      // Handle response structure - could be { analytics: [...] } or [...]
      const analytics = response.data?.analytics || response.data;
      const routes = Array.isArray(analytics) ? analytics : [];
      
      console.log('[Dashboard] Route analytics fetched:', {
        total: routes.length,
        sample: routes[0] ? Object.keys(routes[0]) : null,
      });
      
      setRouteAnalytics(routes);
    } catch (err: any) {
      console.error('[Dashboard] Route analytics fetch failed:', err);
      if (axios.isAxiosError(err)) {
        setRouteAnalyticsError(err.response?.data?.message || err.message || 'Failed to fetch route analytics');
      } else {
        setRouteAnalyticsError('An unexpected error occurred');
      }
      setRouteAnalytics([]);
    } finally {
      setLoadingRouteAnalytics(false);
    }
  };

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
      change: "+12.5%",
      icon: Users,
      color: "text-chart-1",
    },
    {
      title: "Total Active Users",
      value: activeUsers.toLocaleString(),
      change: "+8.2%",
      icon: ShoppingCart,
      color: "text-chart-2",
    },
    {
      title: "Total Charging Stations",
      value: totalStations.toLocaleString(),
      change: "+23.1%",
      icon: Zap,
      color: "text-chart-3",
    },
    {
      title: "Growth",
      value: "18.3%",
      change: "+4.3%",
      icon: TrendingUp,
      color: "text-chart-4",
    },
  ];

  // Show loading state while auth is being established
  if (authLoading) {
    return <Loader />;
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
        
        /* Hide scrollbar for Plan Route Analytics */
        .route-analytics-content::-webkit-scrollbar {
          display: none;
        }
        
        .route-analytics-content {
          -ms-overflow-style: none;
          scrollbar-width: none;
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

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          <p className="text-sm font-medium">{error}</p>
          {!isAuthenticated && (
            <p className="text-xs mt-2">
              Please <a href="/auth/signin" className="underline">sign in</a> to access the dashboard.
            </p>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-primary">{stat.change}</span> from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
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
          <CardContent className="pl-2 flex-1 overflow-hidden route-analytics-content">
            {loadingRouteAnalytics ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : routeAnalyticsError ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm">{routeAnalyticsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchRouteAnalytics}
                  className="mt-2"
                >
                  <Loader2 className="h-4 w-4 mr-2" />
                  Retry
                </Button>
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
                
                {/* Route Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-blue-500"></div>
                    <span>Route Paths</span>
                  </div>
                  <p className="text-xs text-muted-foreground/70">
                    Different colors represent different routes across India
                  </p>
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
              {activityLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No activity logs available</p>
                  <p className="text-xs mt-1">Activity logs will appear here</p>
                </div>
              ) : (
                activityLogs.map((log, index) => {
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
                })
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
                  <p className="text-sm font-mono text-foreground break-all bg-muted/50 p-2 rounded border">{selectedLog.userId}</p>
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
                  <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                      {Object.entries(selectedLog.meta).map(([key, value], index) => {
                        const formattedKey = key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase())
                          .trim();
                        
                        return (
                          <div key={key} className={`pb-4 ${index !== Object.entries(selectedLog.meta).length - 1 ? 'border-b border-border/30' : ''}`}>
                            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">{formattedKey}</p>
                            {typeof value === 'object' && value !== null ? (
                              <div className="bg-background/80 rounded-lg p-3 border border-border/50">
                                <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-mono leading-relaxed">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <p className="text-sm text-foreground break-words bg-background/50 p-2 rounded border border-border/30 font-medium">
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

