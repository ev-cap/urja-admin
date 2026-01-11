"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader } from "@/components/ui/loader";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const ROUTE_ANALYTICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface PlanRouteAnalytics {
  _id: string;
  userId: string;
  vehicleId: string;
  apiResponse: any;
  consoleLogs: string;
  status: string;
  createdAt: string;
  durationMs: number;
  summary?: any;
}

interface ParsedLog {
  level: "info" | "warn" | "error" | "debug" | "unknown";
  message: string;
  timestamp?: string;
  raw: string;
  section?: string; // Route analysis, battery management, etc.
  icon?: React.ComponentType<{ className?: string }>; // Icon component for this log
}

interface ExtractedMetrics {
  routeCount: number;
  chargeStops: number;
  totalChargingTime: number; // minutes
  totalChargingCost: number; // rupees
  totalJourneyTime: number; // minutes
  googleApiCalls: number;
  databaseQueries: number;
  creditsConsumed: number;
  routeDistance: number; // km
  bestRouteScore: number;
  hasErrors: boolean;
  hasWarnings: boolean;
}

interface RouteInfo {
  from?: { address: string; lat?: number; lng?: number };
  to?: { address: string; lat?: number; lng?: number };
  waypoints?: string[];
}

interface VehicleInfo {
  make?: string;
  model?: string;
  variant?: string;
  type?: string;
  range?: number; // km
  battery?: number; // kWh
  efficiency?: number; // Wh/km
}

interface BatteryInfo {
  startBattery?: number; // %
  endBattery?: number; // %
  safeBattery?: number; // %
  availableRange?: number; // km
  requiredRange?: number; // km
}

interface ChargingStop {
  distanceFromStart?: number; // km
  batteryLevel?: number; // %
  requiredCharge?: number; // %
  chargingTime?: number; // min
  cost?: number; // rupees
  stationName?: string;
  stationDistance?: number; // km
  connector?: string;
  power?: number; // kW
}

interface RouteAnalysis {
  routeIndex?: number;
  distance?: number; // km
  travelTime?: number; // min
  chargingTime?: number; // min
  totalTime?: number; // min
  cost?: number; // rupees
  score?: number;
  chargeStops?: ChargingStop[];
}

interface StructuredRouteData {
  routeInfo?: RouteInfo;
  vehicleInfo?: VehicleInfo;
  batteryInfo?: BatteryInfo;
  routes?: RouteAnalysis[];
  bestRoute?: RouteAnalysis;
  credits?: {
    available?: number;
    consumed?: number;
    remaining?: number;
  };
  apiUsage?: {
    googleApiCalls?: number;
    databaseQueries?: number;
  };
  departureTime?: string;
  routeId?: string;
}

interface LogMetrics {
  totalLogs: number;
  infoLogs: number;
  warnLogs: number;
  errorLogs: number;
  debugLogs: number;
  avgLogsPerRoute: number;
  routesWithErrors: number;
  routesWithWarnings: number;
}

type FilterType = {
  status: string;
  logLevel: string;
  hasErrors: string;
};

type SortField = "createdAt" | "durationMs" | "logCount" | "userId";
type SortDirection = "asc" | "desc";

export default function PlanRouteAnalyticsPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<PlanRouteAnalytics[]>([]);
  const [filteredAnalytics, setFilteredAnalytics] = useState<PlanRouteAnalytics[]>([]);
  const [filters, setFilters] = useState<FilterType>({
    status: "all",
    logLevel: "all",
    hasErrors: "all",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<PlanRouteAnalytics | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const itemsPerPage = 20;

  // Map emojis to icon components
  const getIconForEmoji = useCallback((emoji: string, message: string): React.ComponentType<{ className?: string }> | undefined => {
    // Emoji to icon mapping
    const emojiMap: Record<string, React.ComponentType<{ className?: string }>> = {
      "🚗": Car,
      "💳": CreditCard,
      "🔍": Search,
      "🔋": Battery,
      "📍": MapPin,
      "🛣️": Route,
      "⏱️": Timer,
      "💰": DollarSign,
      "🚨": AlertCircle,
      "⚠️": AlertTriangle,
      "✅": CheckCircle2,
      "🎉": Sparkles,
      "🏆": Trophy,
      "📊": BarChart3,
      "🗺️": Globe,
      "🔌": Zap,
      "🔢": Database,
      "🗄️": Database,
      "🎯": Target,
      "📤": Download,
      "📏": Gauge,
      "⚡": Zap,
      "🏁": Target,
    };

    // Check for emoji in message
    for (const [emojiChar, Icon] of Object.entries(emojiMap)) {
      if (message.includes(emojiChar)) {
        return Icon;
      }
    }

    // Context-based icon selection
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("route") || lowerMessage.includes("journey")) return Route;
    if (lowerMessage.includes("battery") || lowerMessage.includes("charging")) return Battery;
    if (lowerMessage.includes("station") || lowerMessage.includes("location")) return MapPin;
    if (lowerMessage.includes("api") || lowerMessage.includes("google")) return Globe;
    if (lowerMessage.includes("database") || lowerMessage.includes("query")) return Database;
    if (lowerMessage.includes("credit") || lowerMessage.includes("cost")) return CreditCard;
    if (lowerMessage.includes("time") || lowerMessage.includes("duration")) return Timer;
    if (lowerMessage.includes("distance") || lowerMessage.includes("km")) return Gauge;
    if (lowerMessage.includes("vehicle") || lowerMessage.includes("car")) return Car;
    if (lowerMessage.includes("score") || lowerMessage.includes("best")) return Trophy;

    return undefined;
  }, []);

  // Remove emojis from text and replace with text equivalents
  const removeEmojis = useCallback((text: string): string => {
    // Emoji to text mapping
    const emojiReplacements: Record<string, string> = {
      "🚗": "[Vehicle]",
      "💳": "[Credits]",
      "🔍": "[Search]",
      "🔋": "[Battery]",
      "📍": "[Location]",
      "🛣️": "[Route]",
      "⏱️": "[Time]",
      "💰": "[Cost]",
      "🚨": "[CRITICAL]",
      "⚠️": "[WARNING]",
      "✅": "[Success]",
      "🎉": "[Success]",
      "🏆": "[Best]",
      "📊": "[Analytics]",
      "🗺️": "[Map]",
      "🔌": "[Charging]",
      "🔢": "[Count]",
      "🗄️": "[Database]",
      "🎯": "[Target]",
      "📤": "[Export]",
      "📏": "[Distance]",
      "⚡": "[Power]",
      "🏁": "[Destination]",
    };

    let cleaned = text;
    for (const [emoji, replacement] of Object.entries(emojiReplacements)) {
      cleaned = cleaned.replace(new RegExp(emoji, "g"), replacement);
    }

    // Remove any remaining emojis (fallback)
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();

    return cleaned;
  }, []);

  // Parse consoleLogs string into structured logs
  const parseConsoleLogs = useCallback((consoleLogs: string): ParsedLog[] => {
    if (!consoleLogs || typeof consoleLogs !== "string") {
      return [];
    }

    const logs: ParsedLog[] = [];
    const lines = consoleLogs.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let level: ParsedLog["level"] = "info"; // Default to info for route planning logs
      let message = trimmed;
      let timestamp: string | undefined;

      // Detect log level from emojis and patterns (route planning specific)
      if (trimmed.includes("🚨") || trimmed.includes("CRITICAL") || trimmed.match(/error/i)) {
        level = "error";
      } else if (trimmed.includes("⚠️") || trimmed.includes("WARNING") || trimmed.match(/warning/i)) {
        level = "warn";
      } else if (trimmed.startsWith("INF ") || trimmed.startsWith("DBG ") || trimmed.includes("🔍") || trimmed.includes("📊")) {
        level = "debug";
      } else if (trimmed.includes("✅") || trimmed.includes("🎉") || trimmed.includes("🏆")) {
        level = "info";
      } else {
        // Standard log format
        const match = trimmed.match(/^\[(error|warn|info|debug)\]/i);
        if (match && match[1]) {
          level = match[1].toLowerCase() as ParsedLog["level"];
        }
      }

      // Try to extract timestamp (ISO format or common date formats)
      const timestampMatch = trimmed.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/);
      if (timestampMatch) {
        timestamp = timestampMatch[0];
        message = trimmed.replace(timestampMatch[0], "").trim();
      }

      // Extract prefix patterns (INF, DBG, etc.)
      const prefixMatch = trimmed.match(/^(INF|DBG|ERR|WARN)\s+/);
      if (prefixMatch && prefixMatch[1]) {
        const prefix = prefixMatch[1];
        message = trimmed.replace(prefixMatch[0], "").trim();
        if (prefix === "ERR") level = "error";
        else if (prefix === "WARN") level = "warn";
        else if (prefix === "DBG") level = "debug";
        else if (prefix === "INF") level = "info";
      }

      // Clean up message - remove common prefixes
      message = message
        .replace(/^\[(error|warn|info|debug)\]/i, "")
        .replace(/^(error|warn|info|debug):\s*/i, "")
        .trim();

      // Remove emojis and replace with text
      const cleanedMessage = removeEmojis(message);
      
      // Get icon for this log entry
      const icon = getIconForEmoji("", cleanedMessage);

      if (!cleanedMessage) {
        message = removeEmojis(trimmed);
      } else {
        message = cleanedMessage;
      }

      logs.push({
        level,
        message,
        timestamp,
        raw: trimmed,
        icon,
      });
    }

    return logs;
  }, [removeEmojis, getIconForEmoji]);

  // Parse structured route data from consoleLogs
  const parseStructuredRouteData = useCallback((consoleLogs: string): StructuredRouteData => {
    const data: StructuredRouteData = {};

    if (!consoleLogs || typeof consoleLogs !== "string") {
      return data;
    }

    // Extract route info (from/to)
    const fromMatch = consoleLogs.match(/From:\s*(.+?)\s*\(([\d.]+),\s*([\d.]+)\)/i);
    if (fromMatch && fromMatch[1] && fromMatch[2] && fromMatch[3]) {
      data.routeInfo = {
        from: {
          address: fromMatch[1].trim(),
          lat: parseFloat(fromMatch[2]),
          lng: parseFloat(fromMatch[3]),
        },
      };
    }

    const toMatch = consoleLogs.match(/To:\s*(.+?)\s*\(([\d.]+),\s*([\d.]+)\)/i);
    if (toMatch && toMatch[1] && toMatch[2] && toMatch[3]) {
      data.routeInfo = {
        ...data.routeInfo,
        to: {
          address: toMatch[1].trim(),
          lat: parseFloat(toMatch[2]),
          lng: parseFloat(toMatch[3]),
        },
      };
    }

    // Extract vehicle info
    const vehicleMatch = consoleLogs.match(/Vehicle fetched successfully:\s*(.+?)\s*Make:\s*(.+?),\s*Model:\s*(.+?),\s*Variant:\s*(.+?)\s*Type:\s*(.+?),\s*Range:\s*(\d+)\s*km\s*Battery:\s*([\d.]+)\s*kWh/i);
    if (vehicleMatch && vehicleMatch[2] && vehicleMatch[3] && vehicleMatch[4] && vehicleMatch[5] && vehicleMatch[6] && vehicleMatch[7]) {
      data.vehicleInfo = {
        make: vehicleMatch[2].trim(),
        model: vehicleMatch[3].trim(),
        variant: vehicleMatch[4].trim(),
        type: vehicleMatch[5].trim(),
        range: parseInt(vehicleMatch[6], 10),
        battery: parseFloat(vehicleMatch[7]),
      };
    }

    // Extract battery info
    const startBatteryMatch = consoleLogs.match(/Start Battery:\s*([\d.]+)%/i);
    const endBatteryMatch = consoleLogs.match(/End Battery:\s*([\d.]+)%/i);
    const safeBatteryMatch = consoleLogs.match(/Safe Battery:\s*([\d.]+)%/i);
    const availableRangeMatch = consoleLogs.match(/Available Range at Start:\s*([\d.]+)\s*km/i);
    const requiredRangeMatch = consoleLogs.match(/Required Range at End:\s*([\d.]+)\s*km/i);

    if (startBatteryMatch || endBatteryMatch || safeBatteryMatch) {
      data.batteryInfo = {
        startBattery: startBatteryMatch && startBatteryMatch[1] ? parseFloat(startBatteryMatch[1]) : undefined,
        endBattery: endBatteryMatch && endBatteryMatch[1] ? parseFloat(endBatteryMatch[1]) : undefined,
        safeBattery: safeBatteryMatch && safeBatteryMatch[1] ? parseFloat(safeBatteryMatch[1]) : undefined,
        availableRange: availableRangeMatch && availableRangeMatch[1] ? parseFloat(availableRangeMatch[1]) : undefined,
        requiredRange: requiredRangeMatch && requiredRangeMatch[1] ? parseFloat(requiredRangeMatch[1]) : undefined,
      };
    }

    // Extract credits
    const creditsMatch = consoleLogs.match(/Total Available Credits:\s*(\d+)/i);
    const creditsConsumedMatch = consoleLogs.match(/Credits Consumed:\s*(\d+)/i);
    const creditsRemainingMatch = consoleLogs.match(/Remaining Credits:\s*(\d+)/i);
    if (creditsMatch || creditsConsumedMatch || creditsRemainingMatch) {
      data.credits = {
        available: creditsMatch && creditsMatch[1] ? parseInt(creditsMatch[1], 10) : undefined,
        consumed: creditsConsumedMatch && creditsConsumedMatch[1] ? parseInt(creditsConsumedMatch[1], 10) : undefined,
        remaining: creditsRemainingMatch && creditsRemainingMatch[1] ? parseInt(creditsRemainingMatch[1], 10) : undefined,
      };
    }

    // Extract API usage
    const apiCallsMatch = consoleLogs.match(/Total Google Maps API calls:\s*(\d+)/i);
    const dbQueriesMatch = consoleLogs.match(/Database queries:\s*(\d+)/i);
    if (apiCallsMatch || dbQueriesMatch) {
      data.apiUsage = {
        googleApiCalls: apiCallsMatch && apiCallsMatch[1] ? parseInt(apiCallsMatch[1], 10) : undefined,
        databaseQueries: dbQueriesMatch && dbQueriesMatch[1] ? parseInt(dbQueriesMatch[1], 10) : undefined,
      };
    }

    // Extract departure time
    const departureMatch = consoleLogs.match(/Departure Time:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/i);
    if (departureMatch && departureMatch[1]) {
      data.departureTime = departureMatch[1];
    }

    // Extract route ID
    const routeIdMatch = consoleLogs.match(/Route ID:\s*([a-f0-9]+)/i);
    if (routeIdMatch && routeIdMatch[1]) {
      data.routeId = routeIdMatch[1];
    }

    // Extract route analyses - improved pattern matching
    const routes: RouteAnalysis[] = [];
    
    // Pattern 1: Route X (fastest/balanced): distance km, travel min, charging min, total min, Score: X.XX
    const routePattern1 = /Route (\d+)\s*\([^)]+\):\s*([\d.]+)\s*km[\s\S]*?(\d+)\s*min[\s\S]*?travel[\s\S]*?(\d+)\s*min[\s\S]*?charging[\s\S]*?(\d+)\s*min[\s\S]*?total[\s\S]*?Score:\s*([\d.]+)/gi;
    let routeMatch1: RegExpExecArray | null;
    while ((routeMatch1 = routePattern1.exec(consoleLogs)) !== null) {
      const match = routeMatch1;
      const routeIndex = match[1];
      const distance = match[2];
      const travelTime = match[3];
      const chargingTime = match[4];
      const totalTime = match[5];
      const score = match[6];
      if (routeIndex && distance && travelTime && chargingTime && totalTime && score) {
        routes.push({
          routeIndex: parseInt(routeIndex, 10),
          distance: parseFloat(distance),
          travelTime: parseInt(travelTime, 10),
          chargingTime: parseInt(chargingTime, 10),
          totalTime: parseInt(totalTime, 10),
          score: parseFloat(score),
        });
      }
    }

    // Pattern 2: Route X: distance km, travel min, charging min, total min, Score: X.XX
    const routePattern2 = /Route (\d+):\s*([\d.]+)\s*km[\s\S]*?(\d+)\s*min[\s\S]*?(\d+)\s*min[\s\S]*?(\d+)\s*min[\s\S]*?Score:\s*([\d.]+)/gi;
    let routeMatch2: RegExpExecArray | null;
    while ((routeMatch2 = routePattern2.exec(consoleLogs)) !== null) {
      const match = routeMatch2;
      const routeIndex = match[1];
      const distance = match[2];
      const travelTime = match[3];
      const chargingTime = match[4];
      const totalTime = match[5];
      const score = match[6];
      if (routeIndex && distance && travelTime && chargingTime && totalTime && score) {
        // Check if this route wasn't already added
        if (!routes.find(r => r.routeIndex === parseInt(routeIndex, 10))) {
          routes.push({
            routeIndex: parseInt(routeIndex, 10),
            distance: parseFloat(distance),
            travelTime: parseInt(travelTime, 10),
            chargingTime: parseInt(chargingTime, 10),
            totalTime: parseInt(totalTime, 10),
            score: parseFloat(score),
          });
        }
      }
    }

    // Extract best route
    const bestRouteMatch = consoleLogs.match(/Best Route:\s*Route (\d+).*?Score:\s*([\d.]+)/i) ||
                         consoleLogs.match(/🏆 Best Route:\s*Route (\d+).*?Score:\s*([\d.]+)/i);
    if (bestRouteMatch && bestRouteMatch[1] && bestRouteMatch[2]) {
      const bestRouteIndex = parseInt(bestRouteMatch[1], 10);
      data.bestRoute = routes.find((r) => r.routeIndex === bestRouteIndex) || {
        routeIndex: bestRouteIndex,
        score: parseFloat(bestRouteMatch[2]),
      };
    }

    // Extract charging stops - improved pattern
    const chargeStops: ChargingStop[] = [];
    
    // Pattern for charging stops in final summary
    const chargeStopPattern = /Point (\d+):\s*([\d.]+)\s*km from start[\s\S]*?Battery Level:\s*([\d.]+)%[\s\S]*?Required Charge:\s*([\d.]+)%[\s\S]*?Charging Time:\s*(\d+)\s*min[\s\S]*?Cost:\s*₹([\d.]+)[\s\S]*?Station:\s*(.+?)\s*\(([\d.]+)\s*km away\)/gi;
    let stopMatch: RegExpExecArray | null;
    while ((stopMatch = chargeStopPattern.exec(consoleLogs)) !== null) {
      const match = stopMatch;
      const distanceFromStart = match[2];
      const batteryLevel = match[3];
      const requiredCharge = match[4];
      const chargingTime = match[5];
      const cost = match[6];
      const stationName = match[7];
      const stationDistance = match[8];
      if (distanceFromStart && batteryLevel && requiredCharge && chargingTime && cost && stationName && stationDistance) {
        chargeStops.push({
          distanceFromStart: parseFloat(distanceFromStart),
          batteryLevel: parseFloat(batteryLevel),
          requiredCharge: parseFloat(requiredCharge),
          chargingTime: parseInt(chargingTime, 10),
          cost: parseFloat(cost),
          stationName: stationName.trim(),
          stationDistance: parseFloat(stationDistance),
        });
      }
    }

    // Also try to extract connector and power info
    chargeStops.forEach((stop, idx) => {
      if (stop.stationName) {
        // Look for connector and power info near the station name
        const stationSection = consoleLogs.substring(
          consoleLogs.indexOf(stop.stationName),
          consoleLogs.indexOf(stop.stationName) + 500
        );
        const connectorMatch = stationSection.match(/Connector:\s*(\w+)/i);
        const powerMatch = stationSection.match(/Power:\s*([\d.]+)\s*kW/i);
        if (connectorMatch && connectorMatch[1]) stop.connector = connectorMatch[1];
        if (powerMatch && powerMatch[1]) stop.power = parseFloat(powerMatch[1]);
      }
    });

    if (chargeStops.length > 0 && data.bestRoute) {
      data.bestRoute.chargeStops = chargeStops;
    }

    data.routes = routes.length > 0 ? routes : undefined;

    return data;
  }, []);

  // Extract structured metrics from consoleLogs
  const extractMetrics = useCallback((consoleLogs: string): ExtractedMetrics => {
    const defaultMetrics: ExtractedMetrics = {
      routeCount: 0,
      chargeStops: 0,
      totalChargingTime: 0,
      totalChargingCost: 0,
      totalJourneyTime: 0,
      googleApiCalls: 0,
      databaseQueries: 0,
      creditsConsumed: 0,
      routeDistance: 0,
      bestRouteScore: 0,
      hasErrors: false,
      hasWarnings: false,
    };

    if (!consoleLogs || typeof consoleLogs !== "string") {
      return defaultMetrics;
    }

    const logs = parseConsoleLogs(consoleLogs);
    const metrics = { ...defaultMetrics };

    // Check for errors and warnings
    metrics.hasErrors = logs.some((log) => log.level === "error");
    metrics.hasWarnings = logs.some((log) => log.level === "warn");

    // Extract route count
    const routeCountMatch = consoleLogs.match(/Got (\d+) candidate routes?/i) || 
                           consoleLogs.match(/Analyzing (\d+) route/i);
    if (routeCountMatch && routeCountMatch[1]) {
      metrics.routeCount = parseInt(routeCountMatch[1], 10) || 0;
    }

    // Extract charge stops
    const chargeStopsMatch = consoleLogs.match(/Total Charge Stops: (\d+)/i) ||
                            consoleLogs.match(/Charge Stops: (\d+)/i) ||
                            consoleLogs.match(/(\d+) charge stops?/i);
    if (chargeStopsMatch && chargeStopsMatch[1]) {
      metrics.chargeStops = parseInt(chargeStopsMatch[1], 10) || 0;
    }

    // Extract charging time (in minutes)
    const chargingTimeMatch = consoleLogs.match(/Total Charging Time: (\d+)\s*min/i) ||
                              consoleLogs.match(/(\d+)\s*min.*charging/i);
    if (chargingTimeMatch && chargingTimeMatch[1]) {
      metrics.totalChargingTime = parseInt(chargingTimeMatch[1], 10) || 0;
    }

    // Extract charging cost (in rupees)
    const costMatch = consoleLogs.match(/Total Charging Cost: ₹([\d.]+)/i) ||
                     consoleLogs.match(/₹([\d.]+).*charging cost/i);
    if (costMatch && costMatch[1]) {
      metrics.totalChargingCost = parseFloat(costMatch[1]) || 0;
    }

    // Extract journey time (in minutes)
    const journeyTimeMatch = consoleLogs.match(/Total Journey Time: (\d+)\s*min/i) ||
                            consoleLogs.match(/(\d+)\s*min.*total.*journey/i);
    if (journeyTimeMatch && journeyTimeMatch[1]) {
      metrics.totalJourneyTime = parseInt(journeyTimeMatch[1], 10) || 0;
    }

    // Extract Google API calls
    const apiCallsMatch = consoleLogs.match(/Total Google Maps API calls: (\d+)/i) ||
                         consoleLogs.match(/Google Maps API calls: (\d+)/i);
    if (apiCallsMatch && apiCallsMatch[1]) {
      metrics.googleApiCalls = parseInt(apiCallsMatch[1], 10) || 0;
    }

    // Extract database queries
    const dbQueriesMatch = consoleLogs.match(/Database queries: (\d+)/i) ||
                          consoleLogs.match(/🗄️.*(\d+).*queries/i);
    if (dbQueriesMatch && dbQueriesMatch[1]) {
      metrics.databaseQueries = parseInt(dbQueriesMatch[1], 10) || 0;
    }

    // Extract credits consumed
    const creditsMatch = consoleLogs.match(/Credits Consumed: (\d+)/i) ||
                        consoleLogs.match(/Total credits to deduct: (\d+)/i);
    if (creditsMatch && creditsMatch[1]) {
      metrics.creditsConsumed = parseInt(creditsMatch[1], 10) || 0;
    }

    // Extract route distance
    const distanceMatch = consoleLogs.match(/Route 1.*?(\d+\.?\d*)\s*km/i) ||
                         consoleLogs.match(/(\d+\.?\d*)\s*km.*route/i);
    if (distanceMatch && distanceMatch[1]) {
      metrics.routeDistance = parseFloat(distanceMatch[1]) || 0;
    }

    // Extract best route score
    const scoreMatch = consoleLogs.match(/Best Route.*?Score: ([\d.]+)/i) ||
                      consoleLogs.match(/Route Score: ([\d.]+)/i);
    if (scoreMatch && scoreMatch[1]) {
      metrics.bestRouteScore = parseFloat(scoreMatch[1]) || 0;
    }

    return metrics;
  }, [parseConsoleLogs]);

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

    if (filters.hasErrors !== "all") {
      filtered = filtered.filter((item) => {
        const logs = parseConsoleLogs(item.consoleLogs);
        const hasErrors = logs.some((log) => log.level === "error");
        return filters.hasErrors === "yes" ? hasErrors : !hasErrors;
      });
    }

    if (filters.logLevel !== "all") {
      filtered = filtered.filter((item) => {
        const logs = parseConsoleLogs(item.consoleLogs);
        return logs.some((log) => log.level === filters.logLevel);
      });
    }

    // Apply search
    if (debouncedSearchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.userId.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          item.vehicleId.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          item.consoleLogs.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
        case "logCount":
          aVal = parseConsoleLogs(a.consoleLogs).length;
          bVal = parseConsoleLogs(b.consoleLogs).length;
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
  }, [analytics, filters, debouncedSearchQuery, sortField, sortDirection, parseConsoleLogs]);

  // Compute metrics
  const metrics = useMemo<LogMetrics>(() => {
    if (filteredAnalytics.length === 0) {
      return {
        totalLogs: 0,
        infoLogs: 0,
        warnLogs: 0,
        errorLogs: 0,
        debugLogs: 0,
        avgLogsPerRoute: 0,
        routesWithErrors: 0,
        routesWithWarnings: 0,
      };
    }

    let totalLogs = 0;
    let infoLogs = 0;
    let warnLogs = 0;
    let errorLogs = 0;
    let debugLogs = 0;
    let routesWithErrors = 0;
    let routesWithWarnings = 0;

    filteredAnalytics.forEach((item) => {
      const logs = parseConsoleLogs(item.consoleLogs);
      totalLogs += logs.length;

      logs.forEach((log) => {
        switch (log.level) {
          case "info":
            infoLogs++;
            break;
          case "warn":
            warnLogs++;
            break;
          case "error":
            errorLogs++;
            break;
          case "debug":
            debugLogs++;
            break;
        }
      });

      if (logs.some((log) => log.level === "error")) {
        routesWithErrors++;
      }
      if (logs.some((log) => log.level === "warn")) {
        routesWithWarnings++;
      }
    });

    return {
      totalLogs,
      infoLogs,
      warnLogs,
      errorLogs,
      debugLogs,
      avgLogsPerRoute: totalLogs / filteredAnalytics.length,
      routesWithErrors,
      routesWithWarnings,
    };
  }, [filteredAnalytics, parseConsoleLogs]);

  // Chart data - log levels distribution
  const logLevelData = useMemo(() => {
    return [
      { name: "Info", value: metrics.infoLogs, color: "#3b82f6" },
      { name: "Warn", value: metrics.warnLogs, color: "#f59e0b" },
      { name: "Error", value: metrics.errorLogs, color: "#ef4444" },
      { name: "Debug", value: metrics.debugLogs, color: "#8b5cf6" },
      { name: "Unknown", value: metrics.totalLogs - metrics.infoLogs - metrics.warnLogs - metrics.errorLogs - metrics.debugLogs, color: "#6b7280" },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  // Chart data - logs over time
  const logsOverTimeData = useMemo(() => {
    const timeMap = new Map<string, { time: string; info: number; warn: number; error: number }>();

    filteredAnalytics.forEach((item) => {
      const date = new Date(item.createdAt);
      const timeKey = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;

      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { time: timeKey, info: 0, warn: 0, error: 0 });
      }

      const entry = timeMap.get(timeKey)!;
      const logs = parseConsoleLogs(item.consoleLogs);
      logs.forEach((log) => {
        if (log.level === "info") entry.info++;
        else if (log.level === "warn") entry.warn++;
        else if (log.level === "error") entry.error++;
      });
    });

    return Array.from(timeMap.values())
      .map((entry) => ({
        time: entry.time,
        info: entry.info,
        warn: entry.warn,
        error: entry.error,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [filteredAnalytics, parseConsoleLogs]);

  // Insights
  const insights = useMemo(() => {
    const insightsList = [];

    if (metrics.routesWithErrors > 0) {
      insightsList.push({
        type: "error",
        icon: AlertCircle,
        message: `${metrics.routesWithErrors} route(s) contain error logs`,
      });
    }

    if (metrics.routesWithWarnings > 0) {
      insightsList.push({
        type: "warning",
        icon: AlertTriangle,
        message: `${metrics.routesWithWarnings} route(s) contain warning logs`,
      });
    }

    if (metrics.avgLogsPerRoute > 50) {
      insightsList.push({
        type: "info",
        icon: Info,
        message: `High log volume: ${metrics.avgLogsPerRoute.toFixed(1)} logs per route on average`,
      });
    }

    if (metrics.errorLogs > 0 && metrics.errorLogs / metrics.totalLogs > 0.1) {
      insightsList.push({
        type: "error",
        icon: AlertCircle,
        message: `Error rate is ${((metrics.errorLogs / metrics.totalLogs) * 100).toFixed(1)}% of all logs`,
      });
    }

    return insightsList;
  }, [metrics]);

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
      "Log Count",
      "Error Count",
      "Warning Count",
      "Info Count",
    ];

    const rows = filteredAnalytics.map((item) => {
      const logs = parseConsoleLogs(item.consoleLogs);
      return [
        item.createdAt,
        item.userId,
        item.vehicleId,
        item.status,
        item.durationMs,
        logs.length,
        logs.filter((l) => l.level === "error").length,
        logs.filter((l) => l.level === "warn").length,
        logs.filter((l) => l.level === "info").length,
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
  }, [filteredAnalytics, parseConsoleLogs]);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (authLoading || loading) {
    return <Loader />;
  }

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
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Log Level</label>
                <div className="relative">
                  <select
                    value={filters.logLevel}
                    onChange={(e) => setFilters({ ...filters, logLevel: e.target.value })}
                    className="w-full appearance-none px-3 py-2 pr-10 text-sm border rounded-md bg-background cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Has Errors</label>
                <div className="relative">
                  <select
                    value={filters.hasErrors}
                    onChange={(e) => setFilters({ ...filters, hasErrors: e.target.value })}
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
                <label className="text-xs font-medium text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="User ID, Vehicle ID, or log content"
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

          <Card className="border-2 border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                    {metrics.totalLogs}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500/30 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Error Logs</p>
                  <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                    {metrics.errorLogs}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Warning Logs</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">
                    {metrics.warnLogs}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Info Logs</p>
                  <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                    {metrics.infoLogs}
                  </p>
                </div>
                <Info className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-500/30 bg-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Logs/Route</p>
                  <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                    {metrics.avgLogsPerRoute.toFixed(1)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500/30 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Routes w/ Errors</p>
                  <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                    {metrics.routesWithErrors}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Routes w/ Warnings</p>
                  <p className="text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">
                    {metrics.routesWithWarnings}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500/50" />
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
                        insight.type === "error" && "bg-red-500/10 border-red-500/30",
                        insight.type === "warning" && "bg-orange-500/10 border-orange-500/30",
                        insight.type === "info" && "bg-blue-500/10 border-blue-500/30"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0 mt-0.5",
                          insight.type === "error" && "text-red-500",
                          insight.type === "warning" && "text-orange-500",
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
          {/* Log Levels Distribution */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Log Levels Distribution</CardTitle>
              <CardDescription>Breakdown of log types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={logLevelData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {logLevelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Logs Over Time */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">Logs Over Time</CardTitle>
              <CardDescription>Log activity by level</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={logsOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="info" stroke="#3b82f6" strokeWidth={2} name="Info" />
                  <Line type="monotone" dataKey="warn" stroke="#f59e0b" strokeWidth={2} name="Warning" />
                  <Line type="monotone" dataKey="error" stroke="#ef4444" strokeWidth={2} name="Error" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

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
                    <th
                      className="text-left p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("logCount")}
                    >
                      <div className="flex items-center gap-2">
                        Log Count
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-left p-3">Log Levels</th>
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
                      const logs = parseConsoleLogs(item.consoleLogs);
                      const errorCount = logs.filter((l) => l.level === "error").length;
                      const warnCount = logs.filter((l) => l.level === "warn").length;
                      const infoCount = logs.filter((l) => l.level === "info").length;

                      return (
                        <tr
                          key={item._id}
                          className={cn(
                            "border-b hover:bg-muted/50 transition-colors",
                            errorCount > 0 && "bg-red-500/5"
                          )}
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
                          <td className="p-3 font-semibold">{logs.length}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {errorCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {errorCount}E
                                </Badge>
                              )}
                              {warnCount > 0 && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                  {warnCount}W
                                </Badge>
                              )}
                              {infoCount > 0 && (
                                <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">
                                  {infoCount}I
                                </Badge>
                              )}
                              {logs.length === 0 && (
                                <span className="text-xs text-muted-foreground">No logs</span>
                              )}
                            </div>
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

                {/* Structured Route Data */}
                {(() => {
                  const routeData = parseStructuredRouteData(selectedItem.consoleLogs);
                  const extractedMetrics = extractMetrics(selectedItem.consoleLogs);
                  
                  return (
                    <>
                      {/* Route Information */}
                      {routeData.routeInfo && (
                        <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                          <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            Route Information
                          </h4>
                          <div className="space-y-3">
                            {routeData.routeInfo.from && (
                              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs text-muted-foreground mb-1">From</p>
                                <p className="text-sm font-semibold">{routeData.routeInfo.from.address}</p>
                                {routeData.routeInfo.from.lat && routeData.routeInfo.from.lng && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {routeData.routeInfo.from.lat.toFixed(6)}, {routeData.routeInfo.from.lng.toFixed(6)}
                                  </p>
                                )}
                              </div>
                            )}
                            {routeData.routeInfo.to && (
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-xs text-muted-foreground mb-1">To</p>
                                <p className="text-sm font-semibold">{routeData.routeInfo.to.address}</p>
                                {routeData.routeInfo.to.lat && routeData.routeInfo.to.lng && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {routeData.routeInfo.to.lat.toFixed(6)}, {routeData.routeInfo.to.lng.toFixed(6)}
                                  </p>
                                )}
                              </div>
                            )}
                            {routeData.departureTime && (
                              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Departure Time</p>
                                <p className="text-sm font-semibold">{routeData.departureTime}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Vehicle Information */}
                      {routeData.vehicleInfo && (
                        <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                          <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <Car className="h-4 w-4 text-primary" />
                            Vehicle Details
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {routeData.vehicleInfo.make && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Make</p>
                                <p className="text-sm font-semibold">{routeData.vehicleInfo.make}</p>
                              </div>
                            )}
                            {routeData.vehicleInfo.model && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Model</p>
                                <p className="text-sm font-semibold">{routeData.vehicleInfo.model}</p>
                              </div>
                            )}
                            {routeData.vehicleInfo.variant && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Variant</p>
                                <p className="text-sm font-semibold">{routeData.vehicleInfo.variant}</p>
                              </div>
                            )}
                            {routeData.vehicleInfo.range && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Range</p>
                                <p className="text-sm font-semibold">{routeData.vehicleInfo.range} km</p>
                              </div>
                            )}
                            {routeData.vehicleInfo.battery && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Battery</p>
                                <p className="text-sm font-semibold">{routeData.vehicleInfo.battery} kWh</p>
                              </div>
                            )}
                            {routeData.vehicleInfo.type && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Type</p>
                                <p className="text-sm font-semibold">{routeData.vehicleInfo.type}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Battery Management */}
                      {routeData.batteryInfo && (
                        <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                          <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <Battery className="h-4 w-4 text-primary" />
                            Battery Management
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {routeData.batteryInfo.startBattery !== undefined && (
                              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Start Battery</p>
                                <p className="text-lg font-bold text-blue-600">{routeData.batteryInfo.startBattery}%</p>
                              </div>
                            )}
                            {routeData.batteryInfo.endBattery !== undefined && (
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-xs text-muted-foreground mb-1">End Battery</p>
                                <p className="text-lg font-bold text-green-600">{routeData.batteryInfo.endBattery}%</p>
                              </div>
                            )}
                            {routeData.batteryInfo.safeBattery !== undefined && (
                              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Safe Battery</p>
                                <p className="text-lg font-bold text-orange-600">{routeData.batteryInfo.safeBattery}%</p>
                              </div>
                            )}
                            {routeData.batteryInfo.availableRange !== undefined && (
                              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Available Range</p>
                                <p className="text-lg font-bold text-purple-600">{routeData.batteryInfo.availableRange.toFixed(1)} km</p>
                              </div>
                            )}
                            {routeData.batteryInfo.requiredRange !== undefined && (
                              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Required Range</p>
                                <p className="text-lg font-bold text-cyan-600">{routeData.batteryInfo.requiredRange.toFixed(1)} km</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Route Analysis */}
                      {routeData.routes && routeData.routes.length > 0 && (
                        <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                          <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <Route className="h-4 w-4 text-primary" />
                            Route Analysis
                          </h4>
                          <div className="space-y-3">
                            {routeData.routes.map((route, idx) => {
                              const isBest = routeData.bestRoute?.routeIndex === route.routeIndex;
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
                                      <h5 className="font-semibold">Route {route.routeIndex || idx + 1}</h5>
                                      {isBest && (
                                        <Badge className="bg-emerald-600 text-white">
                                          <Trophy className="h-3 w-3 mr-1" />
                                          Best Route
                                        </Badge>
                                      )}
                                      {route.score !== undefined && (
                                        <Badge variant="outline">Score: {route.score.toFixed(2)}</Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {route.distance !== undefined && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Distance</p>
                                        <p className="text-sm font-semibold">{route.distance.toFixed(1)} km</p>
                                      </div>
                                    )}
                                    {route.travelTime !== undefined && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Travel Time</p>
                                        <p className="text-sm font-semibold">{route.travelTime} min</p>
                                      </div>
                                    )}
                                    {route.chargingTime !== undefined && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Charging Time</p>
                                        <p className="text-sm font-semibold">{route.chargingTime} min</p>
                                      </div>
                                    )}
                                    {route.totalTime !== undefined && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Total Time</p>
                                        <p className="text-sm font-semibold">{route.totalTime} min</p>
                                      </div>
                                    )}
                                    {route.cost !== undefined && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">Cost</p>
                                        <p className="text-sm font-semibold">₹{route.cost.toFixed(2)}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Charging Stops */}
                      {routeData.bestRoute?.chargeStops && routeData.bestRoute.chargeStops.length > 0 && (
                        <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                          <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            Charging Stops ({routeData.bestRoute.chargeStops.length})
                          </h4>
                          <div className="space-y-3">
                            {routeData.bestRoute.chargeStops.map((stop, idx) => (
                              <div
                                key={idx}
                                className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h5 className="font-semibold text-green-600">Stop {idx + 1}</h5>
                                    {stop.distanceFromStart !== undefined && (
                                      <p className="text-xs text-muted-foreground">
                                        {stop.distanceFromStart.toFixed(1)} km from start
                                      </p>
                                    )}
                                  </div>
                                  {stop.batteryLevel !== undefined && (
                                    <Badge variant="outline" className="border-green-500 text-green-600">
                                      Battery: {stop.batteryLevel.toFixed(1)}%
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                                  {stop.requiredCharge !== undefined && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Required Charge</p>
                                      <p className="text-sm font-semibold">{stop.requiredCharge.toFixed(1)}%</p>
                                    </div>
                                  )}
                                  {stop.chargingTime !== undefined && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Charging Time</p>
                                      <p className="text-sm font-semibold">{stop.chargingTime} min</p>
                                    </div>
                                  )}
                                  {stop.cost !== undefined && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Cost</p>
                                      <p className="text-sm font-semibold">₹{stop.cost.toFixed(2)}</p>
                                    </div>
                                  )}
                                </div>
                                {stop.stationName && (
                                  <div className="p-3 rounded bg-background/50 border border-border/30">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-xs text-muted-foreground mb-1">Charging Station</p>
                                        <p className="text-sm font-semibold">{stop.stationName}</p>
                                        {stop.stationDistance !== undefined && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {stop.stationDistance.toFixed(1)} km away
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        {stop.connector && (
                                          <Badge variant="outline" className="text-xs mb-1">
                                            {stop.connector}
                                          </Badge>
                                        )}
                                        {stop.power !== undefined && (
                                          <p className="text-xs text-muted-foreground">
                                            {stop.power} kW
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* API Usage & Credits */}
                      {(routeData.apiUsage || routeData.credits) && (
                        <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                          <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            API Usage & Credits
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {routeData.apiUsage?.googleApiCalls !== undefined && (
                              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Google API Calls</p>
                                <p className="text-lg font-bold text-yellow-600">{routeData.apiUsage.googleApiCalls}</p>
                              </div>
                            )}
                            {routeData.apiUsage?.databaseQueries !== undefined && (
                              <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                                <p className="text-xs text-muted-foreground mb-1">DB Queries</p>
                                <p className="text-lg font-bold text-teal-600">{routeData.apiUsage.databaseQueries}</p>
                              </div>
                            )}
                            {routeData.credits?.available !== undefined && (
                              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Available Credits</p>
                                <p className="text-lg font-bold text-blue-600">{routeData.credits.available}</p>
                              </div>
                            )}
                            {routeData.credits?.consumed !== undefined && (
                              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Credits Consumed</p>
                                <p className="text-lg font-bold text-orange-600">{routeData.credits.consumed}</p>
                              </div>
                            )}
                            {routeData.credits?.remaining !== undefined && (
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Remaining Credits</p>
                                <p className="text-lg font-bold text-green-600">{routeData.credits.remaining}</p>
                              </div>
                            )}
                            {routeData.routeId && (
                              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                <p className="text-xs text-muted-foreground mb-1">Route ID</p>
                                <p className="text-xs font-mono font-semibold break-all">{routeData.routeId}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Console Logs - Collapsible */}
                {(() => {
                  const logs = parseConsoleLogs(selectedItem.consoleLogs);
                  const errorLogs = logs.filter((l) => l.level === "error");
                  const warnLogs = logs.filter((l) => l.level === "warn");
                  const infoLogs = logs.filter((l) => l.level === "info");
                  const debugLogs = logs.filter((l) => l.level === "debug");

                  return (
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/50">
                      <div
                        className="flex items-center justify-between cursor-pointer mb-4"
                        onClick={() => setLogsExpanded(!logsExpanded)}
                      >
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Console Logs Analysis
                          <Badge variant="outline" className="ml-2">
                            {logs.length} logs
                          </Badge>
                        </h4>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            logsExpanded && "rotate-180"
                          )}
                        />
                      </div>
                      {logsExpanded && (
                        <div className="space-y-4">
                          {/* Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="text-lg font-bold text-blue-600">{logs.length}</p>
                            </div>
                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                              <p className="text-xs text-muted-foreground">Errors</p>
                              <p className="text-lg font-bold text-red-600">{errorLogs.length}</p>
                            </div>
                            <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                              <p className="text-xs text-muted-foreground">Warnings</p>
                              <p className="text-lg font-bold text-orange-600">{warnLogs.length}</p>
                            </div>
                            <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                              <p className="text-xs text-muted-foreground">Info</p>
                              <p className="text-lg font-bold text-green-600">{infoLogs.length}</p>
                            </div>
                            <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                              <p className="text-xs text-muted-foreground">Debug</p>
                              <p className="text-lg font-bold text-purple-600">{debugLogs.length}</p>
                            </div>
                          </div>

                          {/* Logs List */}
                          {logs.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No logs found in consoleLogs field
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                              {logs.map((log, idx) => {
                                const getLevelColor = (level: ParsedLog["level"]) => {
                                  switch (level) {
                                    case "error":
                                      return "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
                                    case "warn":
                                      return "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400";
                                    case "info":
                                      return "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400";
                                    case "debug":
                                      return "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400";
                                    default:
                                      return "bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400";
                                  }
                                };

                                const IconComponent = log.icon;
                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "p-3 rounded-lg border text-sm",
                                      getLevelColor(log.level)
                                    )}
                                  >
                                    <div className="flex items-start gap-3">
                                      {IconComponent && (
                                        <div className={cn(
                                          "flex-shrink-0 mt-0.5",
                                          log.level === "error" && "text-red-600",
                                          log.level === "warn" && "text-orange-600",
                                          log.level === "info" && "text-blue-600",
                                          log.level === "debug" && "text-purple-600",
                                          !log.level || log.level === "unknown" ? "text-gray-600" : ""
                                        )}>
                                          <IconComponent className="h-4 w-4" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              log.level === "error" && "border-red-500 text-red-600",
                                              log.level === "warn" && "border-orange-500 text-orange-600",
                                              log.level === "info" && "border-blue-500 text-blue-600",
                                              log.level === "debug" && "border-purple-500 text-purple-600"
                                            )}
                                          >
                                            {log.level.toUpperCase()}
                                          </Badge>
                                          {log.timestamp && (
                                            <span className="text-xs text-muted-foreground">
                                              {log.timestamp}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs break-words whitespace-pre-wrap font-mono">{log.message}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Raw Console Logs */}
                          <div className="mt-4">
                            <h5 className="text-xs font-bold text-foreground mb-2">Raw Console Logs</h5>
                            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64 custom-scrollbar border border-border text-foreground font-mono whitespace-pre-wrap break-words">
                              {selectedItem.consoleLogs ? removeEmojis(selectedItem.consoleLogs) : "(empty)"}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
            </div>
          )}
        </Sheet>
      </div>
    </>
  );
}
