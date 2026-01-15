"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  Search,
  BarChart3,
  MapPin,
  Clock,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  Zap,
  Globe,
  Activity,
  Users,
  Target,
  ArrowUpDown,
  Eye,
  X,
  Layers,
  Flame,
  ChevronDown,
} from "lucide-react";
import axios from "axios";
import { getManagedToken } from "@/lib/auth/tokenManager";
import { cn } from "@/lib/utils";
import Sheet from "@/components/ui/native-swipeable-sheets";
import { UserIdDisplay } from "@/components/ui/user-id-display";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import dynamic from "next/dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SEARCH_ANALYTICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Dynamic import for map to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface AnalyticsItem {
  _id: string;
  timestamp: string;
  userId: string;
  clerkId: string;
  requestSource: string;
  queryType: string;
  location: {
    lat: number;
    lng: number;
    radius: number;
    admin: Record<string, any>;
  };
  geoLocation: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  requestMeta: {
    minStations?: number;
  };
  resultMeta: {
    count: number;
    cacheHit: boolean;
    googleCall: boolean;
    responseMs: number;
    status: string;
  };
}

interface Metrics {
  totalSearches: number;
  uniqueUsers: number;
  cacheHitRate: number;
  googleApiCalls: number;
  avgResponseTime: number;
  avgStationsReturned: number;
}

type FilterType = {
  queryType: string;
  cacheHit: string;
  googleCall: string;
  requestSource: string;
};

type SortField = "timestamp" | "responseMs" | "count" | "userId";
type SortDirection = "asc" | "desc";

export default function SearchAnalyticsPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<AnalyticsItem[]>([]);
  const [filters, setFilters] = useState<FilterType>({
    queryType: "all",
    cacheHit: "all",
    googleCall: "all",
    requestSource: "all",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<AnalyticsItem | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(15);
  const [mapView, setMapView] = useState<"circles" | "heatmap">("circles");
  const [mapMounted, setMapMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const itemsPerPage = 20;

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      
      if (!API_URL) {
        throw new Error('API_URL is not defined');
      }

      // Check cache first
      const cacheKey = generateCacheKey(`${API_URL}/stations-analytics`);
      const cached = apiCache.get<AnalyticsItem[]>(cacheKey);
      
      if (cached) {
        setAnalytics(cached);
        setLoading(false);
        return;
      }

      const token = await getManagedToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers["x-jwt-token"] = token;
      }

      const response = await axios.get(`${API_URL}/stations-analytics`, { headers });
      
      const analyticsData = response.data?.analytics || [];
      
      // Cache the results
      apiCache.set(cacheKey, analyticsData, SEARCH_ANALYTICS_CACHE_TTL);
      
      setAnalytics(analyticsData);
    } catch (err: any) {
      console.error("[SearchAnalytics] Fetch failed:", err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message || "Failed to fetch analytics");
      } else {
        toast.error("An unexpected error occurred");
      }
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fix Leaflet icons on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet/dist/leaflet.css");
      const L = require("leaflet");
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    }
  }, []);

  // Ensure map container is mounted before rendering map
  useEffect(() => {
    if (typeof window === "undefined" || !filteredAnalytics.length) {
      setMapMounted(false);
      return;
    }

    // Unmount previous map first when switching views
    setMapMounted(false);
    
    let retryCount = 0;
    const maxRetries = 10;
    
    // Use multiple checks to ensure container is ready
    const checkAndMount = () => {
      if (mapContainerRef.current && mapContainerRef.current.offsetParent !== null) {
        // Container exists and is visible
        setMapMounted(true);
      } else if (retryCount < maxRetries) {
        // Retry after a short delay
        retryCount++;
        setTimeout(checkAndMount, 100);
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      // Additional delay to ensure container is fully ready
      setTimeout(checkAndMount, 300);
    });

    return () => {
      cancelAnimationFrame(rafId);
      setMapMounted(false);
    };
  }, [filteredAnalytics.length, mapView]);

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
    if (!autoRefresh || !isAuthenticated) {
      setRefreshCountdown(15);
      return;
    }
    
    // Reset countdown when auto-refresh is enabled
    setRefreshCountdown(15);
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          return 15; // Reset to 15 when it reaches 0
        }
        return prev - 1;
      });
    }, 1000); // Update every second
    
    // Refresh interval
    const refreshInterval = setInterval(() => {
      // Clear cache to force refresh
      if (API_URL) {
        apiCache.delete(generateCacheKey(`${API_URL}/stations-analytics`));
      }
      fetchAnalytics();
      setRefreshCountdown(15); // Reset countdown after refresh
    }, 15000); // 15 seconds
    
    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, [autoRefresh, isAuthenticated, fetchAnalytics]);

  // Filter analytics
  useEffect(() => {
    let filtered = [...analytics];

    // Apply filters
    if (filters.queryType !== "all") {
      filtered = filtered.filter((item) => item.queryType === filters.queryType);
    }
    if (filters.cacheHit !== "all") {
      filtered = filtered.filter(
        (item) =>
          (filters.cacheHit === "hit" && item.resultMeta.cacheHit) ||
          (filters.cacheHit === "miss" && !item.resultMeta.cacheHit)
      );
    }
    if (filters.googleCall !== "all") {
      filtered = filtered.filter(
        (item) =>
          (filters.googleCall === "yes" && item.resultMeta.googleCall) ||
          (filters.googleCall === "no" && !item.resultMeta.googleCall)
      );
    }
    if (filters.requestSource !== "all") {
      filtered = filtered.filter((item) => item.requestSource === filters.requestSource);
    }

    // Apply search (using debounced query)
    if (debouncedSearchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.userId.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          item.clerkId.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "timestamp":
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
        case "responseMs":
          aVal = a.resultMeta.responseMs;
          bVal = b.resultMeta.responseMs;
          break;
        case "count":
          aVal = a.resultMeta.count;
          bVal = b.resultMeta.count;
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

  // Compute metrics
  const metrics = useMemo<Metrics>(() => {
    if (filteredAnalytics.length === 0) {
      return {
        totalSearches: 0,
        uniqueUsers: 0,
        cacheHitRate: 0,
        googleApiCalls: 0,
        avgResponseTime: 0,
        avgStationsReturned: 0,
      };
    }

    const uniqueUsersSet = new Set(filteredAnalytics.map((item) => item.userId));
    const cacheHits = filteredAnalytics.filter((item) => item.resultMeta.cacheHit).length;
    const googleCalls = filteredAnalytics.filter((item) => item.resultMeta.googleCall).length;
    const totalResponseTime = filteredAnalytics.reduce(
      (sum, item) => sum + item.resultMeta.responseMs,
      0
    );
    const totalStations = filteredAnalytics.reduce(
      (sum, item) => sum + item.resultMeta.count,
      0
    );

    return {
      totalSearches: filteredAnalytics.length,
      uniqueUsers: uniqueUsersSet.size,
      cacheHitRate: (cacheHits / filteredAnalytics.length) * 100,
      googleApiCalls: (googleCalls / filteredAnalytics.length) * 100,
      avgResponseTime: totalResponseTime / filteredAnalytics.length,
      avgStationsReturned: totalStations / filteredAnalytics.length,
    };
  }, [filteredAnalytics]);

  // Calculate searches for last month and last week
  const timeBasedSearches = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const lastWeekSearches = filteredAnalytics.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= oneWeekAgo;
    }).length;

    const lastMonthSearches = filteredAnalytics.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= oneMonthAgo;
    }).length;

    return {
      lastWeek: lastWeekSearches,
      lastMonth: lastMonthSearches,
    };
  }, [filteredAnalytics]);

  // Chart data
  const chartData = useMemo(() => {
    const timeMap = new Map<string, { time: string; responseMs: number; count: number }>();
    
    filteredAnalytics.forEach((item) => {
      const date = new Date(item.timestamp);
      const timeKey = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
      
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { time: timeKey, responseMs: 0, count: 0 });
      }
      const entry = timeMap.get(timeKey)!;
      entry.responseMs += item.resultMeta.responseMs;
      entry.count += 1;
    });

    return Array.from(timeMap.values())
      .map((entry) => ({
        time: entry.time,
        responseMs: Math.round(entry.responseMs / entry.count),
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredAnalytics]);

  const cacheData = useMemo(() => {
    const hits = filteredAnalytics.filter((item) => item.resultMeta.cacheHit).length;
    const misses = filteredAnalytics.length - hits;
    return [
      { name: "Cache Hits", value: hits, color: "#10b981" },
      { name: "Cache Misses", value: misses, color: "#ef4444" },
    ];
  }, [filteredAnalytics]);

  const googleCallData = useMemo(() => {
    const calls = filteredAnalytics.filter((item) => item.resultMeta.googleCall).length;
    const cached = filteredAnalytics.length - calls;
    return [
      { name: "Google API Calls", value: calls, color: "#f59e0b" },
      { name: "Cached Responses", value: cached, color: "#3b82f6" },
    ];
  }, [filteredAnalytics]);

  // Aggregate searches by location for density circles
  const locationDensityData = useMemo(() => {
    // Group searches by rounded coordinates (0.01 degree ≈ 1km)
    const locationMap = new Map<string, { 
      lat: number; 
      lng: number; 
      count: number;
      avgRadius: number;
    }>();
    
    filteredAnalytics.forEach((item) => {
      // Round to ~1km precision for clustering
      const roundedLat = Math.round(item.location.lat * 100) / 100;
      const roundedLng = Math.round(item.location.lng * 100) / 100;
      const key = `${roundedLat},${roundedLng}`;
      
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          lat: roundedLat,
          lng: roundedLng,
          count: 0,
          avgRadius: 0,
        });
      }
      const entry = locationMap.get(key)!;
      entry.count += 1;
      entry.avgRadius += item.location.radius;
    });

    // Calculate average radius and normalize for display
    const data = Array.from(locationMap.values()).map(entry => ({
      ...entry,
      avgRadius: entry.avgRadius / entry.count,
    }));
    
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const minCount = Math.min(...data.map(d => d.count), 1);
    
    return data.map((entry) => {
      // Calculate circle properties based on search count
      // Size: larger circles for more searches (min 10000m, max 80000m radius)
      // Opacity: higher opacity for more searches (min 0.3, max 0.7)
      const countRatio = maxCount > minCount 
        ? (entry.count - minCount) / (maxCount - minCount) 
        : 0.5;
      
      // Increased radius for better visibility when zoomed out
      const circleRadius = 10000 + countRatio * 70000; // 10000 to 80000 meters (10km to 80km)
      const fillOpacity = 0.3 + countRatio * 0.4; // 0.3 to 0.7
      
      return {
        ...entry,
        circleRadius,
        fillOpacity,
        intensity: countRatio,
      };
    });
  }, [filteredAnalytics]);

  // Heatmap data - prepare data for leaflet.heat
  const heatmapData = useMemo(() => {
    // Create points array: [lat, lng, intensity]
    const points: Array<[number, number, number]> = [];
    const locationCounts = new Map<string, number>();
    
    // Count searches per location
    filteredAnalytics.forEach((item) => {
      const key = `${item.location.lat.toFixed(4)},${item.location.lng.toFixed(4)}`;
      locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
    });
    
    const maxCount = Math.max(...Array.from(locationCounts.values()), 1);
    
    // Convert to heatmap format
    locationCounts.forEach((count, key) => {
      const parts = key.split(",");
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      
      // Validate that both lat and lng are valid numbers
      if (!isNaN(lat) && !isNaN(lng) && parts.length === 2) {
        const intensity = count / maxCount; // Normalize to 0-1
        points.push([lat, lng, intensity]);
      }
    });
    
    return points;
  }, [filteredAnalytics]);

  // HeatmapLayer component
  const HeatmapLayerComponent = dynamic(
    () => {
      return Promise.all([
        import("react"),
        import("react-leaflet")
      ]).then(([{ useEffect }, { useMap }]) => {
        return function HeatmapLayer({ data }: { data: Array<[number, number, number]> }) {
          const map = useMap();

          useEffect(() => {
            if (typeof window === "undefined" || data.length === 0 || !map) return;

            const L = require("leaflet");
            require("leaflet.heat");

            // Create heatmap layer
            const heatmapLayer = (L as any).heatLayer(data, {
              radius: 25,
              blur: 15,
              maxZoom: 17,
              gradient: {
                0.0: "blue",
                0.2: "cyan",
                0.4: "lime",
                0.6: "yellow",
                0.8: "orange",
                1.0: "red",
              },
              max: 1.0,
              minOpacity: 0.5,
            });

            heatmapLayer.addTo(map);

            return () => {
              if (map && map.hasLayer(heatmapLayer)) {
                map.removeLayer(heatmapLayer);
              }
            };
          }, [map, data]);

          return null;
        };
      });
    },
    { ssr: false }
  );

  // Insights
  const insights = useMemo(() => {
    const slowSearches = filteredAnalytics.filter((item) => item.resultMeta.responseMs > 5000);
    const highCacheRate = metrics.cacheHitRate > 70;
    const lowCacheRate = metrics.cacheHitRate < 30;
    const highGoogleCalls = metrics.googleApiCalls > 50;

    const locationCounts = new Map<string, number>();
    filteredAnalytics.forEach((item) => {
      const key = `${item.location.lat.toFixed(2)},${item.location.lng.toFixed(2)}`;
      locationCounts.set(key, (locationCounts.get(key) || 0) + 1);
    });
    const maxLocation = Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1])[0];

    const insightsList = [];

    if (slowSearches.length > 0) {
      insightsList.push({
        type: "warning",
        icon: AlertTriangle,
        message: `High response time (>5s) detected in ${slowSearches.length} searches`,
      });
    }

    if (highCacheRate) {
      insightsList.push({
        type: "success",
        icon: CheckCircle2,
        message: `Cache saved Google API calls in ${metrics.cacheHitRate.toFixed(1)}% of requests`,
      });
    }

    if (lowCacheRate) {
      insightsList.push({
        type: "warning",
        icon: AlertTriangle,
        message: `Low cache hit rate (${metrics.cacheHitRate.toFixed(1)}%) - consider optimizing`,
      });
    }

    if (highGoogleCalls) {
      insightsList.push({
        type: "warning",
        icon: AlertTriangle,
        message: `High Google API usage (${metrics.googleApiCalls.toFixed(1)}%) - may increase costs`,
      });
    }

    if (maxLocation) {
      insightsList.push({
        type: "info",
        icon: MapPin,
        message: `Most searched location cluster: ${maxLocation[0]} (${maxLocation[1]} searches)`,
      });
    }

    const fastestCache = filteredAnalytics
      .filter((item) => item.resultMeta.cacheHit)
      .sort((a, b) => a.resultMeta.responseMs - b.resultMeta.responseMs)[0];
    if (fastestCache) {
      insightsList.push({
        type: "success",
        icon: Zap,
        message: `Fastest searches occur when cacheHit = true (avg ${Math.round(metrics.avgResponseTime)}ms)`,
      });
    }

    return insightsList;
  }, [filteredAnalytics, metrics]);

  // Pagination
  const totalPages = Math.ceil(filteredAnalytics.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAnalytics.slice(start, start + itemsPerPage);
  }, [filteredAnalytics, currentPage]);

  // Fetch address from geocode API via proxy
  const fetchAddress = useCallback(async (lat: number, lon: number) => {
    setAddressLoading(true);
    setAddress(null);
    try {
      const response = await axios.get(`/api/geocode?lat=${lat}&lon=${lon}`);
      if (response.data && response.data.display_name) {
        setAddress(response.data.display_name);
      } else if (response.data && response.data.error) {
        setAddress(`Error: ${response.data.error}`);
      } else {
        setAddress("Address not available");
      }
    } catch (err: any) {
      console.error("[SearchAnalytics] Address fetch failed:", err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || "Failed to fetch address";
      setAddress(`Error: ${errorMessage}`);
    } finally {
      setAddressLoading(false);
    }
  }, []);

  // Fetch address when detail sheet opens
  useEffect(() => {
    if (selectedItem && detailSheetOpen) {
      fetchAddress(selectedItem.location.lat, selectedItem.location.lng);
    } else {
      setAddress(null);
    }
  }, [selectedItem, detailSheetOpen, fetchAddress]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const headers = [
      "Timestamp",
      "User ID",
      "Clerk ID",
      "Query Type",
      "Latitude",
      "Longitude",
      "Radius (m)",
      "Result Count",
      "Cache Hit",
      "Google Call",
      "Response Time (ms)",
      "Status",
      "Request Source",
    ];

    const rows = filteredAnalytics.map((item) => [
      item.timestamp,
      item.userId,
      item.clerkId,
      item.queryType,
      item.location.lat,
      item.location.lng,
      item.location.radius,
      item.resultMeta.count,
      item.resultMeta.cacheHit ? "Yes" : "No",
      item.resultMeta.googleCall ? "Yes" : "No",
      item.resultMeta.responseMs,
      item.resultMeta.status,
      item.requestSource,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `search-analytics-${new Date().toISOString().split("T")[0]}.csv`;
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
            <CardDescription>Please sign in to access Search Analytics</CardDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-2 md:col-span-2 lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </CardContent>
          </Card>
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

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-2">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card className="border-2 lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Map Skeleton */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[500px] w-full rounded-lg" />
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
              <div className="grid grid-cols-11 gap-4 pb-3 border-b">
                {Array.from({ length: 11 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              {/* Table Rows */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-11 gap-4 py-3 border-b">
                  {Array.from({ length: 11 }).map((_, j) => (
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
      `}</style>

      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <BarChart3 className="h-10 w-10 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Station Search Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Insights into user search behavior & system performance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autoRefresh && (
              <span className="text-sm text-muted-foreground">
                {refreshCountdown}s
              </span>
            )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Query Type</label>
                <div className="relative">
                  <select
                    value={filters.queryType}
                    onChange={(e) => setFilters({ ...filters, queryType: e.target.value })}
                    className="w-full appearance-none px-3 py-2 pr-10 text-sm border rounded-md bg-background cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="nearby">Nearby</option>
                    <option value="route">Route</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Cache Hit</label>
                <div className="relative">
                  <select
                    value={filters.cacheHit}
                    onChange={(e) => setFilters({ ...filters, cacheHit: e.target.value })}
                    className="w-full appearance-none px-3 py-2 pr-10 text-sm border rounded-md bg-background cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="hit">Hit</option>
                    <option value="miss">Miss</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Google Call</label>
                <div className="relative">
                  <select
                    value={filters.googleCall}
                    onChange={(e) => setFilters({ ...filters, googleCall: e.target.value })}
                    className="w-full appearance-none px-3 py-2 pr-10 text-sm border rounded-md bg-background cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Request Source</label>
                <div className="relative">
                  <select
                    value={filters.requestSource}
                    onChange={(e) => setFilters({ ...filters, requestSource: e.target.value })}
                    className="w-full appearance-none px-3 py-2 pr-10 text-sm border rounded-md bg-background cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="app">App</option>
                    <option value="web">Web</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Search User ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="User ID or Clerk ID"
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-2 md:col-span-2 lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-2">Total Searches</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total</p>
                      <p className="text-2xl font-bold">{metrics.totalSearches}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Last Month</p>
                      <p className="text-2xl font-bold">{timeBasedSearches.lastMonth}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Last Week</p>
                      <p className="text-2xl font-bold">{timeBasedSearches.lastWeek}</p>
                    </div>
                  </div>
                </div>
                <Search className="h-8 w-8 text-primary/50 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Cache Hit Rate</p>
                  <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                    {metrics.cacheHitRate.toFixed(1)}%
                  </p>
                </div>
                <Database className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Google API Calls</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">
                    {metrics.googleApiCalls.toFixed(1)}%
                  </p>
                </div>
                <Globe className="h-8 w-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-500/30 bg-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                    {Math.round(metrics.avgResponseTime)}ms
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Stations Returned</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                    {metrics.avgStationsReturned.toFixed(1)}
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Insights & Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, idx) => {
                  const Icon = insight.icon;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        insight.type === "warning" && "bg-orange-500/10 border-orange-500/30",
                        insight.type === "success" && "bg-green-500/10 border-green-500/30",
                        insight.type === "info" && "bg-blue-500/10 border-blue-500/30"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0 mt-0.5",
                          insight.type === "warning" && "text-orange-500",
                          insight.type === "success" && "text-green-500",
                          insight.type === "info" && "text-blue-500"
                        )}
                      />
                      <p className="text-sm">{insight.message}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Response Time Chart */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Response Time Trend</CardTitle>
              <CardDescription>Latency over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="responseMs"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Response Time (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cache Hits vs Misses */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Cache Performance</CardTitle>
              <CardDescription>Cache hits vs misses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cacheData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {cacheData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Google API Calls */}
          <Card className="border-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Google API Usage</CardTitle>
              <CardDescription>API calls vs cached responses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={googleCallData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {googleCallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Map */}
        {filteredAnalytics.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Geographic Insights
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {mapView === "circles" 
                      ? "Circle size and opacity represent number of searches. Larger, more opaque circles indicate higher activity. Color coding: Blue = Low (bottom 33%), Orange = Medium (33-66%), Red = High (top 33%)."
                      : "Heatmap showing search density. Color intensity indicates number of searches: Blue (low) → Red (high)."
                    }
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={mapView === "circles" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMapView("circles")}
                    className="gap-2"
                  >
                    <Layers className="h-4 w-4" />
                    Circles
                  </Button>
                  <Button
                    variant={mapView === "heatmap" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMapView("heatmap")}
                    className="gap-2"
                  >
                    <Flame className="h-4 w-4" />
                    Heatmap
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                ref={mapContainerRef} 
                className="relative h-[500px] w-full rounded-lg overflow-hidden border"
                id="map-container"
              >
                {!mapMounted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <div className="text-sm text-muted-foreground">Loading map...</div>
                  </div>
                )}
                {typeof window !== "undefined" && mapMounted && mapContainerRef.current && mapView === "circles" && (
                  <MapContainer
                    center={[20.5937, 78.9629]} // Center of India
                    zoom={5}
                    style={{ height: "100%", width: "100%" }}
                    key={`circles-map-${Date.now()}`}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {locationDensityData.map((location, idx) => {
                      // Color based on intensity: blue (low) to red (high)
                      const getColor = (intensity: number) => {
                        if (intensity < 0.33) return "#3b82f6"; // blue
                        if (intensity < 0.66) return "#f59e0b"; // orange
                        return "#ef4444"; // red
                      };
                      
                      return (
                        <Circle
                          key={`density-${idx}-${location.lat}-${location.lng}`}
                          center={[location.lat, location.lng]}
                          radius={location.circleRadius}
                          pathOptions={{
                            color: getColor(location.intensity),
                            fillColor: getColor(location.intensity),
                            fillOpacity: location.fillOpacity,
                            weight: 3,
                          }}
                        >
                          <Popup>
                            <div className="text-sm space-y-1">
                              <p className="font-semibold">Search Activity Cluster</p>
                              <p>Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                              <p>Total Searches: {location.count}</p>
                              <p>Avg Search Radius: {Math.round(location.avgRadius / 1000)}km</p>
                            </div>
                          </Popup>
                        </Circle>
                      );
                    })}
                  </MapContainer>
                )}

                {typeof window !== "undefined" && mapMounted && mapContainerRef.current && mapView === "heatmap" && (
                  <MapContainer
                    center={[20.5937, 78.9629]} // Center of India
                    zoom={5}
                    style={{ height: "100%", width: "100%" }}
                    key={`heatmap-map-${Date.now()}`}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {heatmapData.length > 0 && <HeatmapLayerComponent data={heatmapData} />}
                  </MapContainer>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Table */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Detailed Analytics</CardTitle>
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
                      onClick={() => handleSort("timestamp")}
                    >
                      <div className="flex items-center gap-2">
                        Timestamp
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th
                      className="text-left p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("userId")}
                    >
                      <div className="flex items-center gap-2">
                        User ID
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-left p-3">Query Type</th>
                    <th className="text-left p-3">Location</th>
                    <th className="text-left p-3">Radius</th>
                    <th
                      className="text-left p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("count")}
                    >
                      <div className="flex items-center gap-2">
                        Result Count
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-left p-3">Cache Hit</th>
                    <th className="text-left p-3">Google Call</th>
                    <th
                      className="text-left p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("responseMs")}
                    >
                      <div className="flex items-center gap-2">
                        Response Time
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center p-8 text-muted-foreground">
                        No analytics data found
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item) => (
                      <tr
                        key={item._id}
                        className={cn(
                          "border-b hover:bg-muted/50 transition-colors",
                          item.resultMeta.responseMs > 5000 && "bg-red-500/5"
                        )}
                      >
                        <td className="p-3">
                          {new Date(item.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <UserIdDisplay userId={item.userId} variant="inline" textClassName="text-xs" />
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{item.queryType}</Badge>
                        </td>
                        <td className="p-3 text-xs">
                          {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
                        </td>
                        <td className="p-3">{item.location.radius / 1000}km</td>
                        <td className="p-3 font-semibold">{item.resultMeta.count}</td>
                        <td className="p-3">
                          {item.resultMeta.cacheHit ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </td>
                        <td className="p-3">
                          {item.resultMeta.googleCall ? (
                            <CheckCircle2 className="h-4 w-4 text-orange-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              item.resultMeta.responseMs > 5000 && "text-red-600 dark:text-red-400 font-semibold"
                            )}
                          >
                            {item.resultMeta.responseMs}ms
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={item.resultMeta.status === "ok" ? "default" : "destructive"}
                          >
                            {item.resultMeta.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item);
                              setDetailSheetOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
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
            setAddress(null);
          }}
          title="Analytics Details"
        >
          {selectedItem && (
            <div className="flex flex-col gap-6 p-6 pt-12 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="relative -m-6 mb-0 p-6 pb-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-t-3xl border-b">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 border-2 border-primary/30 shadow-lg">
                    <BarChart3 className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-foreground mb-1">Analytics Details</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={selectedItem.resultMeta.status === "ok" ? "default" : "destructive"}>
                        {selectedItem.resultMeta.status}
                      </Badge>
                      <Badge variant="outline">{selectedItem.queryType}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(selectedItem.timestamp).toLocaleString()}
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
                      <p className="text-xs text-muted-foreground mb-1">Clerk ID</p>
                      <p className="text-sm font-mono font-semibold">{selectedItem.clerkId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Request Source</p>
                      <Badge>{selectedItem.requestSource}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Query Type</p>
                      <Badge variant="outline">{selectedItem.queryType}</Badge>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                  <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Location
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Latitude</p>
                      <p className="font-semibold">{selectedItem.location.lat}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Longitude</p>
                      <p className="font-semibold">{selectedItem.location.lng}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Address</p>
                      {addressLoading ? (
                        <p className="text-sm text-muted-foreground italic">Loading address...</p>
                      ) : (
                        <p className="font-semibold">{address || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Radius</p>
                      <p className="font-semibold">{selectedItem.location.radius}m ({(selectedItem.location.radius / 1000).toFixed(2)}km)</p>
                    </div>
                  </div>
                </div>

                {/* Result Meta */}
                <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                  <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Result Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Result Count</p>
                      <p className="font-semibold text-lg">{selectedItem.resultMeta.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Response Time</p>
                      <p className={cn(
                        "font-semibold text-lg",
                        selectedItem.resultMeta.responseMs > 5000 && "text-red-600 dark:text-red-400"
                      )}>
                        {selectedItem.resultMeta.responseMs}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Cache Hit</p>
                      <div className="flex items-center gap-2">
                        {selectedItem.resultMeta.cacheHit ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="font-semibold text-green-600 dark:text-green-400">Yes</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="font-semibold text-red-600 dark:text-red-400">No</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Google Call</p>
                      <div className="flex items-center gap-2">
                        {selectedItem.resultMeta.googleCall ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-orange-500" />
                            <span className="font-semibold text-orange-600 dark:text-orange-400">Yes</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold text-muted-foreground">No</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full JSON */}
                <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                  <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Full JSON Data
                  </h4>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64 custom-scrollbar border border-border text-foreground font-mono">
                    <code>{JSON.stringify(selectedItem, null, 2)}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </Sheet>
      </div>
    </>
  );
}

