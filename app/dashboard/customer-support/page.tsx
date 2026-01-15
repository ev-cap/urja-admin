"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Sheet from "@/components/ui/native-swipeable-sheets";
import { useDebounce } from "@/hooks/useDebounce";
import { apiCache, generateCacheKey } from "@/lib/cache/apiCache";
import toast from "react-hot-toast";
import {
  MessageSquare,
  AlertCircle,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
  Smartphone,
  Calendar,
  User,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  RefreshCw,
  Download,
  Eye,
  Lightbulb,
  Mail,
  Loader2,
  UserCircle,
  CheckCircle2,
  Send,
} from "lucide-react";
import axios from "axios";
import { getManagedToken } from "@/lib/auth/tokenManager";
import { cn } from "@/lib/utils";
import { UserIdDisplay } from "@/components/ui/user-id-display";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const CUSTOMER_SUPPORT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

interface Issue {
  id: string;
  userId: string;
  issueType: string;
  description: string;
  source: string;
  attachments?: Array<{
    filename: string;
    url: string;
  }>;
  status: string;
  priority: string;
  submittedAt: string;
  updatedAt: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  logs?: any;
}

interface IssuesResponse {
  issues: Issue[];
  count: number;
}

interface UserBasicInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface IssueResponse {
  issue: Issue;
}

const PRIORITY_CONFIG = {
  high: {
    label: "High",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    icon: AlertCircle,
  },
  medium: {
    label: "Medium",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
    icon: Clock,
  },
  low: {
    label: "Low",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    icon: CheckCircle,
  },
  "": {
    label: "None",
    color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30",
    icon: Clock,
  },
};

const STATUS_CONFIG = {
  submitted: {
    label: "Submitted",
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  resolved: {
    label: "Resolved",
    color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  },
  closed: {
    label: "Closed",
    color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30",
  },
};

export default function CustomerSupportPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [suggestions, setSuggestions] = useState<Issue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"issues" | "suggestions">("issues");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  
  // User Info Modal State
  const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userBasicInfo, setUserBasicInfo] = useState<UserBasicInfo | null>(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);

  // Resolve Issue State
  const [resolveSheetOpen, setResolveSheetOpen] = useState(false);
  const [selectedIssueForResolve, setSelectedIssueForResolve] = useState<Issue | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolvingIssue, setResolvingIssue] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      if (!API_URL) {
        throw new Error('API_URL is not defined');
      }

      // Check cache first
      const issuesCacheKey = generateCacheKey(`${API_URL}/userissues/all`);
      const suggestionsCacheKey = generateCacheKey(`${API_URL}/userissues/app-suggestions`);
      
      const cachedIssues = apiCache.get<Issue[]>(issuesCacheKey);
      const cachedSuggestions = apiCache.get<Issue[]>(suggestionsCacheKey);

      if (cachedIssues && cachedSuggestions) {
        setIssues(cachedIssues);
        setSuggestions(cachedSuggestions);
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

      const [issuesRes, suggestionsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/userissues/all`, { headers }),
        axios.get(`${API_URL}/userissues/app-suggestions`, { headers }),
      ]);

      let issuesData: Issue[] = [];
      let suggestionsData: Issue[] = [];

      if (issuesRes.status === "fulfilled") {
        issuesData = issuesRes.value.data.issues || [];
        setIssues(issuesData);
        apiCache.set(issuesCacheKey, issuesData, CUSTOMER_SUPPORT_CACHE_TTL);
      } else {
        console.error("[CustomerSupport] Failed to fetch issues:", issuesRes.reason);
        if (axios.isAxiosError(issuesRes.reason) && issuesRes.reason.response?.status === 403) {
          toast.error("You don't have permission to view customer issues");
        }
      }

      if (suggestionsRes.status === "fulfilled") {
        suggestionsData = suggestionsRes.value.data.issues || [];
        setSuggestions(suggestionsData);
        apiCache.set(suggestionsCacheKey, suggestionsData, CUSTOMER_SUPPORT_CACHE_TTL);
      } else {
        console.warn("[CustomerSupport] Failed to fetch suggestions:", suggestionsRes.reason);
        // Don't set error for suggestions 403 - it's optional data
        if (axios.isAxiosError(suggestionsRes.reason) && suggestionsRes.reason.response?.status !== 403) {
          console.error("[CustomerSupport] Non-403 error fetching suggestions:", suggestionsRes.reason);
        }
      }

      // Only set error if both failed with non-permission errors
      if (issuesRes.status === "rejected" && suggestionsRes.status === "rejected") {
        const issuesIs403 = axios.isAxiosError(issuesRes.reason) && issuesRes.reason.response?.status === 403;
        const suggestionsIs403 = axios.isAxiosError(suggestionsRes.reason) && suggestionsRes.reason.response?.status === 403;
        
        if (!issuesIs403 && !suggestionsIs403) {
          // Both failed with non-permission errors
          toast.error("Failed to fetch customer support data");
        }
        // Permission errors are already handled above with specific messages
      }
    } catch (err: any) {
      console.error("[CustomerSupport] Error fetching data:", err);
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchData();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  const fetchUserBasicInfo = async (userId: string) => {
    setLoadingUserInfo(true);
    setUserBasicInfo(null);

    try {
      const token = await getManagedToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers["x-jwt-token"] = token;
      }

      const response = await axios.get(`${API_URL}/users/${userId}/basic-info`, { headers });
      setUserBasicInfo(response.data);
    } catch (err: any) {
      console.error("[CustomerSupport] Error fetching user basic info:", err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message || "Failed to fetch user information");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoadingUserInfo(false);
    }
  };

  const handleUserIdClick = (userId: string) => {
    setSelectedUserId(userId);
    setUserInfoModalOpen(true);
    fetchUserBasicInfo(userId);
  };

  const handleResolveIssue = async () => {
    if (!selectedIssueForResolve) return;

    setResolvingIssue(true);

    try {
      const token = await getManagedToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers["x-jwt-token"] = token;
      }

      const response = await axios.put(
        `${API_URL}/userissues/issue/${selectedIssueForResolve.id}/resolve`,
        { resolutionNotes },
        { headers }
      );

      // Update the issue in the state
      const updatedIssue = response.data.issue;
      
      if (activeTab === "issues") {
        setIssues((prevIssues) =>
          prevIssues.map((issue) =>
            issue.id === updatedIssue.id ? updatedIssue : issue
          )
        );
      } else {
        setSuggestions((prevSuggestions) =>
          prevSuggestions.map((issue) =>
            issue.id === updatedIssue.id ? updatedIssue : issue
          )
        );
      }

      toast.success("Issue resolved successfully!");
      setTimeout(() => {
        setResolveSheetOpen(false);
        setResolutionNotes("");
        setSelectedIssueForResolve(null);
      }, 1000);
    } catch (err: any) {
      console.error("[CustomerSupport] Error resolving issue:", err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message || "Failed to resolve issue");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setResolvingIssue(false);
    }
  };

  const openResolveSheet = (issue: Issue) => {
    setSelectedIssueForResolve(issue);
    setResolutionNotes(issue.resolutionNotes || "");
    setResolveSheetOpen(true);
  };

  const filteredData = (activeTab === "issues" ? issues : suggestions).filter((item) => {
    const matchesSearch =
      item.issueType.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      item.userId.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

    const matchesPriority = filterPriority === "all" || item.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const stats = {
    total: issues.length,
    high: issues.filter((i) => i.priority === "high").length,
    medium: issues.filter((i) => i.priority === "medium").length,
    low: issues.filter((i) => i.priority === "low").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
    suggestions: suggestions.length,
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access Customer Support</CardDescription>
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
          <Skeleton className="h-10 w-24" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
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

        {/* Issues List Skeleton */}
        <Card className="border-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between mb-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
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
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <MessageSquare className="h-10 w-10 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Customer Support</h1>
              <p className="text-muted-foreground mt-1">
                Manage and track customer issues and suggestions
              </p>
            </div>
          </div>
          <Button onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Issues</p>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500/30 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{stats.high}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Medium Priority</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">{stats.medium}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Low Priority</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{stats.low}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-500/30 bg-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Suggestions</p>
                  <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{stats.suggestions}</p>
                </div>
                <Lightbulb className="h-8 w-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex gap-2">
                <Button
                  variant={activeTab === "issues" ? "default" : "outline"}
                  onClick={() => setActiveTab("issues")}
                  className="gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Issues ({issues.length})
                </Button>
                <Button
                  variant={activeTab === "suggestions" ? "default" : "outline"}
                  onClick={() => setActiveTab("suggestions")}
                  className="gap-2"
                  disabled={suggestions.length === 0}
                  title={suggestions.length === 0 ? "No suggestions available or insufficient permissions" : ""}
                >
                  <Lightbulb className="h-4 w-4" />
                  Suggestions ({suggestions.length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by issue type, description, or user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="appearance-none pl-3 pr-10 py-2 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="appearance-none pl-3 pr-10 py-2 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="all">All Statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Issues/Suggestions List */}
            <div className="space-y-3 max-h-[calc(100vh-32rem)] overflow-y-auto custom-scrollbar pr-2">
              {(activeTab === "issues" ? issues : suggestions).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium mb-1">No {activeTab} available</p>
                  {activeTab === "suggestions" && (
                    <p className="text-xs">
                      This may be due to insufficient permissions or no suggestions have been submitted
                    </p>
                  )}
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No {activeTab} match your filters</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSearchQuery("");
                      setFilterPriority("all");
                      setFilterStatus("all");
                    }}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                filteredData.map((item) => {
                  const isExpanded = expandedIssue === item.id;
                  const priorityConfig = PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG[""];
                  const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.submitted;
                  const PriorityIcon = priorityConfig.icon;

                  return (
                    <Card
                      key={item.id}
                      className="border-2 hover:border-primary/50 transition-all cursor-pointer"
                      onClick={() => setExpandedIssue(isExpanded ? null : item.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-base">{item.issueType}</h3>
                                {item.priority && (
                                  <Badge className={cn("gap-1", priorityConfig.color)}>
                                    <PriorityIcon className="h-3 w-3" />
                                    {priorityConfig.label}
                                  </Badge>
                                )}
                                <Badge className={statusConfig.color}>
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {item.description || "No description provided"}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {/* Quick Info */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span className="font-mono">{item.id.slice(0, 10)}...</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <UserIdDisplay userId={item.userId} variant="inline" textClassName="text-xs" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUserIdClick(item.userId);
                                }}
                                className="hover:text-primary transition-colors cursor-pointer"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(item.submittedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Smartphone className="h-3 w-3" />
                              <span className="capitalize">{item.source.replace("_", " ")}</span>
                            </div>
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                <span>{item.attachments.length} attachment(s)</span>
                              </div>
                            )}
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-300">
                              {/* Full Description */}
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                                <p className="text-sm bg-muted/50 p-3 rounded-lg">
                                  {item.description || "User did not provide additional details"}
                                </p>
                              </div>

                              {/* Attachments */}
                              {item.attachments && item.attachments.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">Attachments</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {item.attachments.map((attachment, idx) => (
                                      <a
                                        key={idx}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary/50 bg-muted/30 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ImageIcon className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-mono truncate flex-1">
                                          {attachment.filename}
                                        </span>
                                        <Eye className="h-3 w-3 text-muted-foreground" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Device Info */}
                              {item.logs?.deviceInfo && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2">Device Information</p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    <div className="p-2 rounded-lg bg-muted/50">
                                      <p className="text-muted-foreground">Platform</p>
                                      <p className="font-semibold capitalize">{item.logs.deviceInfo.platform}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-muted/50">
                                      <p className="text-muted-foreground">Brand</p>
                                      <p className="font-semibold">{item.logs.deviceInfo.deviceBrand}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-muted/50">
                                      <p className="text-muted-foreground">OS Version</p>
                                      <p className="font-semibold">{item.logs.deviceInfo.systemVersion}</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-muted/50">
                                      <p className="text-muted-foreground">App Version</p>
                                      <p className="font-semibold">{item.logs.deviceInfo.appVersion}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Additional Details */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                                <div className="p-2 rounded-lg bg-muted/50">
                                  <p className="text-muted-foreground flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Issue ID
                                  </p>
                                  <p className="font-mono font-semibold">{item.id}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-muted/50 hover:bg-muted hover:border-primary/50 border border-transparent transition-all text-left group">
                                  <p className="text-muted-foreground flex items-center gap-1 mb-1">
                                    <User className="h-3 w-3" />
                                    User ID
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUserIdClick(item.userId);
                                      }}
                                      className="ml-auto"
                                    >
                                      <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  </p>
                                  <UserIdDisplay userId={item.userId} variant="compact" textClassName="font-semibold" />
                                </div>
                                <div className="p-2 rounded-lg bg-muted/50">
                                  <p className="text-muted-foreground">Last Updated</p>
                                  <p className="font-semibold">
                                    {new Date(item.updatedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              {/* Resolution Notes */}
                              {item.resolutionNotes && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-muted-foreground">Resolution Notes</p>
                                    {item.resolvedAt && (
                                      <p className="text-xs text-muted-foreground">
                                        Resolved on {new Date(item.resolvedAt).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  <p className="text-sm bg-green-500/10 p-3 rounded-lg border border-green-500/30">
                                    {item.resolutionNotes}
                                  </p>
                                </div>
                              )}

                              {/* Resolve Button */}
                              {item.status !== "resolved" && item.status !== "closed" && (
                                <div className="pt-4 border-t">
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openResolveSheet(item);
                                    }}
                                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Resolve Issue
                                  </Button>
                                </div>
                              )}

                              {/* Resolved Badge */}
                              {item.status === "resolved" && (
                                <div className="pt-4 border-t">
                                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                      Issue Resolved
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Results Count */}
            {filteredData.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
                <span>
                  Showing {filteredData.length} of {activeTab === "issues" ? issues.length : suggestions.length} {activeTab}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Info Sheet */}
      <Sheet
        open={userInfoModalOpen}
        close={() => {
          setUserInfoModalOpen(false);
          setUserBasicInfo(null);
        }}
        title="User Information"
      >
        <div className="flex flex-col gap-6 p-6 pt-12">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-d-fg">User Information</h3>
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
                <div className="rounded-lg bg-d-muted p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">User ID</p>
                  </div>
                  <UserIdDisplay userId={selectedUserId} textClassName="text-d-fg" />
                </div>
              )}

              {/* Name */}
              <div className="rounded-lg bg-d-muted p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCircle className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</p>
                </div>
                <p className="text-lg font-bold text-d-fg">
                  {userBasicInfo.firstName} {userBasicInfo.lastName}
                </p>
              </div>

              {/* Email */}
              <div className="rounded-lg bg-d-muted p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Address</p>
                </div>
                <a
                  href={`mailto:${userBasicInfo.email}`}
                  className="text-sm font-medium text-d-fg hover:underline break-all"
                >
                  {userBasicInfo.email}
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedUserId || "");
                  }}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <User className="h-4 w-4" />
                  Copy User ID
                </Button>
                <Button
                  onClick={() => {
                    if (userBasicInfo.email) {
                      window.location.href = `mailto:${userBasicInfo.email}`;
                    }
                  }}
                  className="flex-1 gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </Button>
              </div>
            </div>
          )}
        </div>
      </Sheet>

      {/* Resolve Issue Sheet */}
      <Sheet
        open={resolveSheetOpen}
        close={() => {
          setResolveSheetOpen(false);
          setResolutionNotes("");
          setSelectedIssueForResolve(null);
        }}
        title="Resolve Issue"
      >
        <div className="flex flex-col gap-6 p-6 pt-12">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-d-fg">Resolve Issue</h3>
              <p className="text-sm text-muted-foreground">Mark this issue as resolved</p>
            </div>
          </div>

          {/* Issue Details */}
          {selectedIssueForResolve && (
            <div className="space-y-4">
              {/* Issue Type */}
              <div className="rounded-lg bg-d-muted p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Issue Type</p>
                <p className="text-sm font-bold text-d-fg">{selectedIssueForResolve.issueType}</p>
              </div>

              {/* Issue Description */}
              <div className="rounded-lg bg-d-muted p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-d-fg">
                  {selectedIssueForResolve.description || "User did not provide additional details"}
                </p>
              </div>

              {/* Resolution Notes Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-d-fg">
                  Resolution Notes
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Enter resolution notes describing how the issue was resolved..."
                  className="w-full min-h-[120px] p-3 rounded-lg border border-d-border bg-background text-d-fg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  disabled={resolvingIssue}
                />
                <p className="text-xs text-muted-foreground">
                  Provide details about how the issue was resolved
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setResolveSheetOpen(false);
                    setResolutionNotes("");
                    setSelectedIssueForResolve(null);
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={resolvingIssue}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResolveIssue}
                  disabled={!resolutionNotes.trim() || resolvingIssue}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {resolvingIssue ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Resolve Issue
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}

