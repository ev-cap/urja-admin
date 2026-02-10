"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/useDebounce";
import { apiCache, generateCacheKey } from "@/lib/cache/apiCache";
import toast from "react-hot-toast";
import {
  Route,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  Filter,
  Activity,
  FileText,
  Search,
  TrendingUp,
  AlertCircle,
  Info,
  Loader2,
  Eye,
  ChevronDown,
  Zap,
  Battery,
  MapPin,
  Car,
  CreditCard,
  Database,
  Globe,
  Target,
  Trophy,
  Sparkles,
  Settings,
  Navigation,
  Gauge,
  Timer,
  DollarSign,
} from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";
import Sheet from "@/components/ui/native-swipeable-sheets";
import { UserIdDisplay } from "@/components/ui/user-id-display";


const API_URL = process.env.NEXT_PUBLIC_API_URL;
const ROUTE_ANALYTICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface AnalyticsSummary {
  directionsApiCalls: number;
  placesApiCalls: number;
  totalApiCalls: number;
  databaseQueries: number;
  stationCacheHits: number;
  cacheHitPercentage: number;
  apiCallPercentage: number;
}

interface ApiResponseInput {
  from?: { lat: number; lng: number; address?: string };
  to?: { lat: number; lng: number; address?: string };
  departureTime?: string;
}

interface ApiResponseVehicle {
  make?: string;
  model?: string;
  variant?: string;
  type?: string;
  range?: number | { rangeKm: number };
  batteryCapacity?: number;
  efficiency?: number;
}

interface ApiResponseBatteryManagement {
  startBattery?: number;
  endBattery?: number;
  safeBattery?: number;
  totalChargingTime?: number;
  totalChargingCost?: number;
  routeDistanceEstimate?: number;
}

interface ApiResponseChargeStop {
  location?: { lat: number; lng: number };
  batteryLevel?: number;
  requiredCharge?: number;
  estimatedChargingTime?: number;
  estimatedCost?: number;
  bestStation?: {
    name?: string;
    address?: string;
    distance?: number;
    connectorType?: string;
    power?: number;
  };
}

interface ApiResponseRouteAnalysis {
  route?: {
    routePolyline?: string;
    distanceKm?: number;
    estimatedDurationMin?: number;
    routeType?: string;
  };
  chargeStops?: ApiResponseChargeStop[];
  totalChargingTime?: number;
  totalChargingCost?: number;
  score?: number;
}

interface ApiResponse {
  message?: string;
  input?: ApiResponseInput;
  vehicle?: ApiResponseVehicle;
  batteryManagement?: ApiResponseBatteryManagement;
  routeCount?: number;
  routeAnalyses?: ApiResponseRouteAnalysis[];
  bestRouteIndex?: number;
  apiCallCount?: number;
  routeId?: string;
  stationsStatus?: string;
}

interface PlanRouteAnalytics {
  _id: string;
  userId: string;
  vehicleId: string;
  apiResponse: ApiResponse;
  consoleLogs: string;
  status: string;
  createdAt: string;
  durationMs: number;
  summary?: AnalyticsSummary;
}







interface FilterType {
  status: string;
}

type SortField = "createdAt" | "durationMs" | "userId";
type SortDirection = "asc" | "desc";

export default function PlanRouteAnalyticsPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<PlanRouteAnalytics[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<PlanRouteAnalytics[]>([]);
  const [filters, setFilters] = useState<FilterType>({
    status: "all",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<PlanRouteAnalytics | null>(null);
  const [selectedDetailLoading, setSelectedDetailLoading] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const itemsPerPage = 20;

  // Function to fetch full detail for a selected analytics item
  const fetchAnalyticsDetail = useCallback(async (id: string) => {
    try {
      setSelectedDetailLoading(true);

      if (!API_URL) {
        throw new Error("API_URL is not defined");
      }

      // Check cache first
      const cacheKey = generateCacheKey(`${API_URL}/routes/analytics/${id}`);
      const cached = apiCache.get<PlanRouteAnalytics>(cacheKey);

      if (cached) {
        setSelectedItem(cached);
        setSelectedDetailLoading(false);
        return;
      }

      // Fetch from API
      const response = await axios.get(`${API_URL}/routes/analytics/${id}`);
      const detailData = response.data?.analytics || response.data;

      if (detailData) {
        // Cache the results
        apiCache.set(cacheKey, detailData, ROUTE_ANALYTICS_CACHE_TTL);
        setSelectedItem(detailData);
      } else {
        throw new Error("Analytics details not found in response");
      }
    } catch (err: any) {
      console.error("[PlanRouteAnalytics] Fetch detail failed:", err);
      toast.error("Failed to fetch route analytics details");
    } finally {
      setSelectedDetailLoading(false);
    }
  }, []);







  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      if (!API_URL) {
        throw new Error("API_URL is not defined");
      }

      // Check cache first
      const cacheKey = generateCacheKey(`${API_URL}/routes/analytics`);
      const cached = apiCache.get<PlanRouteAnalytics[]>(cacheKey);

      if (cached) {
        setAnalytics(cached);
        setLoading(false);
        return;
      }

      // Let axios interceptor handle auth headers automatically
      const response = await axios.get(`${API_URL}/routes/analytics`);

      const analyticsData = response.data?.analytics || response.data || [];
      const routes = Array.isArray(analyticsData) ? analyticsData : [];

      // Cache the results
      apiCache.set(cacheKey, routes, ROUTE_ANALYTICS_CACHE_TTL);

      setAnalytics(routes);
    } catch (err: any) {
      console.error("[PlanRouteAnalytics] Fetch failed:", err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message || "Failed to fetch route analytics");
      } else {
        toast.error("An unexpected error occurred");
      }
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        toast.error("Please sign in to view analytics");
        setLoading(false);
        return;
      }
      fetchAnalytics();
    }
  }, [authLoading, isAuthenticated, fetchAnalytics]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;
    const interval = setInterval(() => {
      // Clear cache to force refresh
      if (API_URL) {
        apiCache.delete(generateCacheKey(`${API_URL}/routes/analytics`));
      }
      fetchAnalytics();
    }, 60000); // 60 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, isAuthenticated, fetchAnalytics]);

  // Filter analytics
  useEffect(() => {
    let filtered = [...analytics];

    // Apply filters
    if (filters.status !== "all") {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    // Apply search
    if (debouncedSearchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.userId.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          item.vehicleId.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case "durationMs":
          aVal = a.durationMs;
          bVal = b.durationMs;
          break;

        case "userId":
          aVal = a.userId;
          bVal = b.userId;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredAnalytics(filtered);
    setCurrentPage(1);
  }, [analytics, filters, debouncedSearchQuery, sortField, sortDirection]);



  // Pagination
  const totalPages = Math.ceil(filteredAnalytics.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAnalytics.slice(start, start + itemsPerPage);
  }, [filteredAnalytics, currentPage]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = [
      "Created At",
      "User ID",
      "Vehicle ID",
      "Status",
      "Duration (ms)",
      "API Calls",
      "Cache Hit %",
    ];

    const rows = filteredAnalytics.map((item) => {
      return [
        item.createdAt,
        item.userId,
        item.vehicleId,
        item.status,
        item.durationMs,
        item.summary?.totalApiCalls || 0,
        item.summary?.cacheHitPercentage || 0,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-route-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAnalytics]);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access Plan Route Analytics</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (authLoading || loading) {
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
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        {/* Filters Skeleton */}
        <Card className="border-2">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards Skeleton */}
        <Card className="border-2">
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



        {/* Table Skeleton */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4 pb-3 border-b">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              {/* Table Rows */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 py-3 border-b">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
            {/* Pagination Skeleton */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <style>{`
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
      `}</style>

      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Route className="h-10 w-10 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Plan Route Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Analysis of console logs from route planning operations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", autoRefresh && "animate-spin")} />
              Auto-refresh
            </Button>
            <Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="relative">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full appearance-none px-3 py-2 pr-10 text-sm border rounded-md bg-background cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-3">
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by User ID or Vehicle ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Routes</p>
                <p className="text-2xl font-bold mt-1">{filteredAnalytics.length}</p>
              </div>
              <Route className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        {/* API Performance Summary */}
        {filteredAnalytics.some(item => item.summary) && (() => {
          const summaryAggregates = filteredAnalytics.reduce((acc, item) => {
            if (item.summary) {
              acc.totalApiCalls += item.summary.totalApiCalls || 0;
              acc.directionsApiCalls += item.summary.directionsApiCalls || 0;
              acc.placesApiCalls += item.summary.placesApiCalls || 0;
              acc.databaseQueries += item.summary.databaseQueries || 0;
              acc.stationCacheHits += item.summary.stationCacheHits || 0;
              acc.cacheHitPercentageSum += item.summary.cacheHitPercentage || 0;
              acc.routesWithSummary += 1;
            }
            return acc;
          }, {
            totalApiCalls: 0,
            directionsApiCalls: 0,
            placesApiCalls: 0,
            databaseQueries: 0,
            stationCacheHits: 0,
            cacheHitPercentageSum: 0,
            routesWithSummary: 0,
          });

          const avgCacheHit = summaryAggregates.routesWithSummary > 0
            ? (summaryAggregates.cacheHitPercentageSum / summaryAggregates.routesWithSummary)
            : 0;

          return (
            <Card className="border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-violet-500/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-500" />
                  API Performance Summary
                </CardTitle>
                <CardDescription>
                  Aggregated API usage metrics from {summaryAggregates.routesWithSummary} route analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Total API Calls</p>
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      {summaryAggregates.totalApiCalls.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Directions API</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {summaryAggregates.directionsApiCalls.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Places API</p>
                    <p className="text-xl font-bold text-violet-600 dark:text-violet-400">
                      {summaryAggregates.placesApiCalls.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                    <p className="text-xs text-muted-foreground mb-1">DB Queries</p>
                    <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
                      {summaryAggregates.databaseQueries.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Cache Hits</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {summaryAggregates.stationCacheHits.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Avg Cache Hit %</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {avgCacheHit.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}





        {/* Detailed Table */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Route Analytics</CardTitle>
              <Badge variant="outline">{filteredAnalytics.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th
                      className="text-left p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center gap-2">
                        Created At
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-left p-3">User ID</th>
                    <th className="text-left p-3">Vehicle ID</th>
                    <th className="text-left p-3">Status</th>
                    <th
                      className="text-left p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("durationMs")}
                    >
                      <div className="flex items-center gap-2">
                        Duration
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-left p-3">API Calls</th>
                    <th className="text-left p-3">Cache %</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        No analytics data found
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item) => {
                      return (
                        <tr
                          key={item._id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-3">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <UserIdDisplay userId={item.userId} variant="inline" textClassName="text-xs" />
                          </td>
                          <td className="p-3 text-xs font-mono">{item.vehicleId}</td>
                          <td className="p-3">
                            <Badge variant={item.status === "success" ? "default" : "destructive"}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="p-3">{item.durationMs}ms</td>
                          <td className="p-3 text-xs">
                            {item.summary ? (
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{item.summary.totalApiCalls}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {item.summary ? (
                              <span className={cn(
                                "font-semibold",
                                item.summary.cacheHitPercentage >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                              )}>
                                {item.summary.cacheHitPercentage.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item); // Set optimistic data
                                setDetailSheetOpen(true);
                                fetchAnalyticsDetail(item._id); // Fetch full detail
                              }}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredAnalytics.length)} of{" "}
                  {filteredAnalytics.length} results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Sheet */}
        <Sheet
          open={detailSheetOpen}
          close={() => {
            setDetailSheetOpen(false);
            setSelectedItem(null);
            setLogsExpanded(false);
          }}
          title="Route Analytics Details"
        >
          {selectedItem && (
            <div className="flex flex-col gap-6 p-6 pt-12 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {selectedDetailLoading && (
                <div className="space-y-6">
                  <div className="relative -m-6 mb-0 p-6 pb-8 bg-muted/20 animate-pulse rounded-t-3xl border-b">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-14 w-14 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-40 w-full rounded-xl" />
                    <Skeleton className="h-60 w-full rounded-xl" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                  </div>
                </div>
              )}

              {!selectedDetailLoading && (
                <>
                  {/* Header */}
                  <div className="relative -m-6 mb-0 p-6 pb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-t-3xl border-b">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 border-2 border-primary/30 shadow-lg">
                        <Route className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold text-foreground mb-1">Route Analytics Details</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={selectedItem.status === "success" ? "default" : "destructive"}>
                            {selectedItem.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(selectedItem.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                      <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Basic Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">User ID</p>
                          <UserIdDisplay userId={selectedItem.userId} variant="compact" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Vehicle ID</p>
                          <p className="text-sm font-mono font-semibold">{selectedItem.vehicleId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          <Badge variant={selectedItem.status === "success" ? "default" : "destructive"}>
                            {selectedItem.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Duration</p>
                          <p className="text-sm font-semibold">{selectedItem.durationMs}ms</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Created At</p>
                          <p className="text-sm font-semibold">
                            {new Date(selectedItem.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* API Performance Metrics (from summary) */}
                    {selectedItem.summary && (
                      <div className="bg-gradient-to-br from-indigo-500/5 to-violet-500/5 rounded-xl p-4 border border-indigo-500/20">
                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                          <Globe className="h-4 w-4 text-indigo-500" />
                          API Performance Metrics
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Total API Calls</p>
                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{selectedItem.summary.totalApiCalls}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Directions API</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedItem.summary.directionsApiCalls}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Places API</p>
                            <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{selectedItem.summary.placesApiCalls}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                            <p className="text-xs text-muted-foreground mb-1">DB Queries</p>
                            <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{selectedItem.summary.databaseQueries}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Station Cache Hits</p>
                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{selectedItem.summary.stationCacheHits}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Cache Hit %</p>
                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{selectedItem.summary.cacheHitPercentage.toFixed(1)}%</p>
                          </div>
                          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 col-span-2">
                            <p className="text-xs text-muted-foreground mb-1">API Call %</p>
                            <div className="flex items-center gap-3">
                              <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{selectedItem.summary.apiCallPercentage.toFixed(1)}%</p>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(selectedItem.summary.apiCallPercentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Route Information (from apiResponse.input) */}
                    {selectedItem.apiResponse?.input && (
                      <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Route Information
                        </h4>
                        <div className="space-y-3">
                          {selectedItem.apiResponse.input.from && (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-muted-foreground mb-1">From</p>
                              <p className="text-sm font-semibold">{selectedItem.apiResponse.input.from.address || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {selectedItem.apiResponse.input.from.lat.toFixed(6)}, {selectedItem.apiResponse.input.from.lng.toFixed(6)}
                              </p>
                            </div>
                          )}
                          {selectedItem.apiResponse.input.to && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="text-xs text-muted-foreground mb-1">To</p>
                              <p className="text-sm font-semibold">{selectedItem.apiResponse.input.to.address || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {selectedItem.apiResponse.input.to.lat.toFixed(6)}, {selectedItem.apiResponse.input.to.lng.toFixed(6)}
                              </p>
                            </div>
                          )}
                          {selectedItem.apiResponse.input.departureTime && (
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Departure Time</p>
                              <p className="text-sm font-semibold">{selectedItem.apiResponse.input.departureTime}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Vehicle Details (from apiResponse.vehicle) */}
                    {selectedItem.apiResponse?.vehicle && (
                      <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                          <Car className="h-4 w-4 text-primary" />
                          Vehicle Details
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedItem.apiResponse.vehicle.make && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Make</p>
                              <p className="text-sm font-semibold">{selectedItem.apiResponse.vehicle.make}</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.vehicle.model && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Model</p>
                              <p className="text-sm font-semibold">{selectedItem.apiResponse.vehicle.model}</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.vehicle.variant && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Variant</p>
                              <p className="text-sm font-semibold">{selectedItem.apiResponse.vehicle.variant}</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.vehicle.range !== undefined && selectedItem.apiResponse.vehicle.range !== null && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Range</p>
                              <p className="text-sm font-semibold">
                                {typeof selectedItem.apiResponse.vehicle.range === 'object' && 'rangeKm' in selectedItem.apiResponse.vehicle.range
                                  ? selectedItem.apiResponse.vehicle.range.rangeKm
                                  : String(selectedItem.apiResponse.vehicle.range)} km
                              </p>
                            </div>
                          )}
                          {selectedItem.apiResponse.vehicle.batteryCapacity !== undefined && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Battery</p>
                              <p className="text-sm font-semibold">{selectedItem.apiResponse.vehicle.batteryCapacity} kWh</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.vehicle.type && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Type</p>
                              <p className="text-sm font-semibold">{selectedItem.apiResponse.vehicle.type}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Battery Management (from apiResponse.batteryManagement) */}
                    {selectedItem.apiResponse?.batteryManagement && (
                      <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                          <Battery className="h-4 w-4 text-primary" />
                          Battery Management
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedItem.apiResponse.batteryManagement.startBattery !== undefined && (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Start Battery</p>
                              <p className="text-lg font-bold text-blue-600">{selectedItem.apiResponse.batteryManagement.startBattery}%</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.batteryManagement.endBattery !== undefined && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="text-xs text-muted-foreground mb-1">End Battery</p>
                              <p className="text-lg font-bold text-green-600">{selectedItem.apiResponse.batteryManagement.endBattery}%</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.batteryManagement.safeBattery !== undefined && (
                            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Safe Battery</p>
                              <p className="text-lg font-bold text-orange-600">{selectedItem.apiResponse.batteryManagement.safeBattery}%</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.batteryManagement.totalChargingTime !== undefined && (
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Total Charging Time</p>
                              <p className="text-lg font-bold text-purple-600">{selectedItem.apiResponse.batteryManagement.totalChargingTime} min</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.batteryManagement.totalChargingCost !== undefined && (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Total Charging Cost</p>
                              <p className="text-lg font-bold text-amber-600">₹{selectedItem.apiResponse.batteryManagement.totalChargingCost.toFixed(2)}</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.batteryManagement.routeDistanceEstimate !== undefined && (
                            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Route Distance</p>
                              <p className="text-lg font-bold text-cyan-600">{selectedItem.apiResponse.batteryManagement.routeDistanceEstimate.toFixed(1)} km</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Route Analyses (from apiResponse.routeAnalyses) */}
                    {selectedItem.apiResponse?.routeAnalyses && selectedItem.apiResponse.routeAnalyses.length > 0 && (
                      <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                          <Route className="h-4 w-4 text-primary" />
                          Route Analyses ({selectedItem.apiResponse.routeAnalyses.length} routes)
                        </h4>
                        <div className="space-y-3">
                          {selectedItem.apiResponse.routeAnalyses.map((analysis, idx) => {
                            const isBest = selectedItem.apiResponse?.bestRouteIndex === idx;
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "p-4 rounded-lg border",
                                  isBest
                                    ? "bg-emerald-500/10 border-emerald-500/30 border-2"
                                    : "bg-card border-border/50"
                                )}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-semibold">Route {idx + 1}</h5>
                                    {isBest && (
                                      <Badge className="bg-emerald-600 text-white">
                                        <Trophy className="h-3 w-3 mr-1" />
                                        Best Route
                                      </Badge>
                                    )}
                                    {analysis.route?.routeType && (
                                      <Badge variant="outline">{analysis.route.routeType}</Badge>
                                    )}
                                    {analysis.score !== undefined && (
                                      <Badge variant="outline">Score: {analysis.score.toFixed(2)}</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {analysis.route?.distanceKm !== undefined && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Distance</p>
                                      <p className="text-sm font-semibold">{analysis.route.distanceKm.toFixed(1)} km</p>
                                    </div>
                                  )}
                                  {analysis.route?.estimatedDurationMin !== undefined && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Travel Time</p>
                                      <p className="text-sm font-semibold">{analysis.route.estimatedDurationMin} min</p>
                                    </div>
                                  )}
                                  {analysis.totalChargingTime !== undefined && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Charging Time</p>
                                      <p className="text-sm font-semibold">{analysis.totalChargingTime} min</p>
                                    </div>
                                  )}
                                  {analysis.totalChargingCost !== undefined && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Charging Cost</p>
                                      <p className="text-sm font-semibold">₹{analysis.totalChargingCost.toFixed(2)}</p>
                                    </div>
                                  )}
                                </div>

                                {/* Charge Stops for this route */}
                                {analysis.chargeStops && analysis.chargeStops.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border/30">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                      <Zap className="h-3 w-3" />
                                      {analysis.chargeStops.length} Charging Stop{analysis.chargeStops.length > 1 ? 's' : ''}
                                    </p>
                                    <div className="space-y-2">
                                      {analysis.chargeStops.map((stop, stopIdx) => (
                                        <div key={stopIdx} className="p-3 rounded-lg bg-green-500/5 border border-green-500/15">
                                          <div className="flex items-start justify-between mb-2">
                                            <div>
                                              <p className="text-xs font-semibold text-green-600">Stop {stopIdx + 1}</p>
                                              {stop.bestStation?.name && (
                                                <p className="text-sm font-medium">{stop.bestStation.name}</p>
                                              )}
                                              {stop.bestStation?.address && (
                                                <p className="text-xs text-muted-foreground">{stop.bestStation.address}</p>
                                              )}
                                            </div>
                                            {stop.batteryLevel !== undefined && (
                                              <Badge variant="outline" className="border-green-500 text-green-600">
                                                Battery: {stop.batteryLevel.toFixed(1)}%
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="grid grid-cols-3 gap-2 text-xs">
                                            {stop.estimatedChargingTime !== undefined && (
                                              <div>
                                                <p className="text-muted-foreground">Time</p>
                                                <p className="font-semibold">{stop.estimatedChargingTime} min</p>
                                              </div>
                                            )}
                                            {stop.estimatedCost !== undefined && (
                                              <div>
                                                <p className="text-muted-foreground">Cost</p>
                                                <p className="font-semibold">₹{stop.estimatedCost.toFixed(2)}</p>
                                              </div>
                                            )}
                                            {stop.bestStation?.power !== undefined && (
                                              <div>
                                                <p className="text-muted-foreground">Power</p>
                                                <p className="font-semibold">{stop.bestStation.power} kW</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Route Meta Info */}
                    {(selectedItem.apiResponse?.routeId || selectedItem.apiResponse?.apiCallCount !== undefined || selectedItem.apiResponse?.stationsStatus) && (
                      <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                          <Settings className="h-4 w-4 text-primary" />
                          Route Meta
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {selectedItem.apiResponse.routeId && (
                            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Route ID</p>
                              <p className="text-xs font-mono font-semibold break-all">{selectedItem.apiResponse.routeId}</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.apiCallCount !== undefined && (
                            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                              <p className="text-xs text-muted-foreground mb-1">API Call Count</p>
                              <p className="text-lg font-bold text-yellow-600">{selectedItem.apiResponse.apiCallCount}</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.stationsStatus && (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Stations Status</p>
                              <p className="text-sm font-semibold">{selectedItem.apiResponse.stationsStatus}</p>
                            </div>
                          )}
                          {selectedItem.apiResponse.routeCount !== undefined && (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-muted-foreground mb-1">Route Count</p>
                              <p className="text-lg font-bold text-blue-600">{selectedItem.apiResponse.routeCount}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}



                    {/* API Response Summary */}
                    {selectedItem.apiResponse && (
                      <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          API Response Summary
                        </h4>
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64 custom-scrollbar border border-border text-foreground font-mono">
                          {JSON.stringify(selectedItem.apiResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </Sheet>
      </div>
    </>
  );
}
