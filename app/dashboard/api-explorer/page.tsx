"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Send, 
  Copy, 
  Check,
  AlertCircle,
  Info,
  Code2,
  BookOpen,
  Zap,
  X,
  Plus,
  Clock,
  Database,
  FileCode,
  Sparkles,
  Terminal,
  Braces,
  PlayCircle,
  Settings2
} from "lucide-react";
import { 
  getEndpointsFromPermissions, 
  groupEndpointsByTag,
  generateExampleFromSchema,
  type ParsedAPIEndpoint 
} from "@/lib/utils/openapiParser";
import { cn } from "@/lib/utils";
import axios from "axios";
import { getManagedToken } from "@/lib/auth/tokenManager";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const DEFAULT_METHOD_COLOR = { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500", hover: "hover:bg-blue-500/20" };

const METHOD_COLORS: Record<string, { bg: string; text: string; badge: string; hover: string }> = {
  GET: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500", hover: "hover:bg-blue-500/20" },
  POST: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400", badge: "bg-green-500", hover: "hover:bg-green-500/20" },
  PUT: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", badge: "bg-orange-500", hover: "hover:bg-orange-500/20" },
  PATCH: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", badge: "bg-purple-500", hover: "hover:bg-purple-500/20" },
  DELETE: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", badge: "bg-red-500", hover: "hover:bg-red-500/20" },
};

interface RequestTab {
  id: string;
  endpoint: ParsedAPIEndpoint;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  requestBody: string;
  response: {
    status: number;
    data: any;
    headers: any;
    time: number;
    size: number;
  } | null;
}

export default function APIExplorerPage() {
  const { permissions, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<ParsedAPIEndpoint[]>([]);
  const [groupedEndpoints, setGroupedEndpoints] = useState<Record<string, ParsedAPIEndpoint[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Tabs & Multi-request support
  const [tabs, setTabs] = useState<RequestTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  
  // UI State
  const [activeView, setActiveView] = useState<'request' | 'code'>('request');
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');
  
  // Request execution
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  const [diagnostics, setDiagnostics] = useState<{
    totalRbac: number;
    matched: number;
    missing: number;
  } | null>(null);

  // Active tab management
  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setError('Please sign in to use API Explorer');
        setLoading(false);
        return;
      }

      if (!permissions) {
        setError('Loading permissions...');
        return;
      }

      try {
        const totalRbac = Object.values(permissions.methods).reduce(
          (sum, paths) => sum + (paths?.length || 0), 
          0
        );

        const parsedEndpoints = getEndpointsFromPermissions(permissions.methods);
        const matched = parsedEndpoints.length;
        const missing = totalRbac - matched;
        
        setEndpoints(parsedEndpoints);
        setDiagnostics({ totalRbac, matched, missing });
        
        const grouped = groupEndpointsByTag(parsedEndpoints);
        setGroupedEndpoints(grouped);
        
        const groupKeys = Object.keys(grouped);
        if (groupKeys.length > 0 && groupKeys[0]) {
          setExpandedGroups(new Set([groupKeys[0]]));
        }
        
        console.log('[APIExplorer] Diagnostics:', { totalRbac, matched, missing });
        
        setLoading(false);
      } catch (err) {
        console.error('[APIExplorer] Error parsing endpoints:', err);
        setError('Failed to parse API endpoints');
        setLoading(false);
      }
    }
  }, [permissions, authLoading, isAuthenticated]);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const createTab = useCallback((endpoint: ParsedAPIEndpoint) => {
    const tabId = `${endpoint.method}-${endpoint.path}-${Date.now()}`;
    
    // Generate example request body
    let requestBody = "";
    if (endpoint.requestBodySchema) {
      const example = endpoint.requestBodyExample || 
                     generateExampleFromSchema(endpoint.requestBodySchema);
      requestBody = JSON.stringify(example, null, 2);
    }

    // Initialize path params
    const pathParams: Record<string, string> = {};
    if (endpoint.pathParams) {
      endpoint.pathParams.forEach(param => {
        pathParams[param.name] = "";
      });
    }

    // Initialize query params
    const queryParams: Record<string, string> = {};
    if (endpoint.queryParams) {
      endpoint.queryParams.forEach(param => {
        queryParams[param.name] = "";
      });
    }

    const newTab: RequestTab = {
      id: tabId,
      endpoint,
      pathParams,
      queryParams,
      headers: {},
      requestBody,
      response: null,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);
  }, []);

  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && filtered.length > 0) {
        const lastTab = filtered[filtered.length - 1];
        if (lastTab) setActiveTabId(lastTab.id);
      } else if (filtered.length === 0) {
        setActiveTabId(null);
      }
      return filtered;
    });
  };

  const updateTab = (tabId: string, updates: Partial<RequestTab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  };

  const executeRequest = async () => {
    if (!activeTab || !API_URL) return;

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      // Build path with path params
      let path = activeTab.endpoint.path;
      for (const [key, value] of Object.entries(activeTab.pathParams)) {
        if (value) {
          path = path.replace(`{${key}}`, value);
        }
      }

      // Build query string
      const queryString = Object.entries(activeTab.queryParams)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      const url = `${API_URL}${path}${queryString ? '?' + queryString : ''}`;

      // Get JWT token
      const token = await getManagedToken();

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...activeTab.headers,
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers['x-jwt-token'] = token;
      }

      // Parse request body
      let data = undefined;
      if (activeTab.requestBody && activeTab.endpoint.method !== 'GET' && activeTab.endpoint.method !== 'DELETE') {
        try {
          data = JSON.parse(activeTab.requestBody);
        } catch (err) {
          throw new Error('Invalid JSON in request body');
        }
      }

      // Execute request
      const axiosConfig = {
        method: activeTab.endpoint.method.toLowerCase(),
        url,
        headers,
        data,
      };

      const res = await axios(axiosConfig);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Calculate response size
      const responseSize = new Blob([JSON.stringify(res.data)]).size;

      const response = {
        status: res.status,
        data: res.data,
        headers: res.headers,
        time: responseTime,
        size: responseSize,
      };

      updateTab(activeTab.id, { response });
      
    } catch (err: any) {
      console.error('[APIExplorer] Request failed:', err);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let response;
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data || { error: err.message };
        response = {
          status: err.response?.status || 500,
          data: responseData,
          headers: err.response?.headers || {},
          time: responseTime,
          size: new Blob([JSON.stringify(responseData)]).size,
        };
      } else {
        const errorData = { error: err.message || 'Unknown error' };
        response = {
          status: 500,
          data: errorData,
          headers: {},
          time: responseTime,
          size: new Blob([JSON.stringify(errorData)]).size,
        };
      }

      updateTab(activeTab.id, { response });
      
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateCodeSnippet = useCallback(() => {
    if (!activeTab || !API_URL) return '';

    let path = activeTab.endpoint.path;
    for (const [key, value] of Object.entries(activeTab.pathParams)) {
      if (value) {
        path = path.replace(`{${key}}`, value);
      }
    }

    const queryString = Object.entries(activeTab.queryParams)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    const url = `${API_URL}${path}${queryString ? '?' + queryString : ''}`;

    if (codeLanguage === 'curl') {
      let curl = `curl -X ${activeTab.endpoint.method} "${url}"`;
      curl += ` \\\n  -H "Content-Type: application/json"`;
      
      Object.entries(activeTab.headers).forEach(([key, value]) => {
        if (value) curl += ` \\\n  -H "${key}: ${value}"`;
      });

      if (activeTab.requestBody && activeTab.endpoint.method !== 'GET') {
        curl += ` \\\n  -d '${activeTab.requestBody}'`;
      }
      return curl;
    } else if (codeLanguage === 'javascript') {
      let code = `const response = await fetch("${url}", {\n`;
      code += `  method: "${activeTab.endpoint.method}",\n`;
      code += `  headers: {\n`;
      code += `    "Content-Type": "application/json",\n`;
      
      Object.entries(activeTab.headers).forEach(([key, value]) => {
        if (value) code += `    "${key}": "${value}",\n`;
      });
      
      code += `  },\n`;
      
      if (activeTab.requestBody && activeTab.endpoint.method !== 'GET') {
        code += `  body: JSON.stringify(${activeTab.requestBody})\n`;
      }
      
      code += `});\n\nconst data = await response.json();`;
      return code;
    } else { // python
      let code = `import requests\n\n`;
      code += `url = "${url}"\n`;
      code += `headers = {\n`;
      code += `    "Content-Type": "application/json",\n`;
      
      Object.entries(activeTab.headers).forEach(([key, value]) => {
        if (value) code += `    "${key}": "${value}",\n`;
      });
      
      code += `}\n\n`;
      
      if (activeTab.requestBody && activeTab.endpoint.method !== 'GET') {
        code += `data = ${activeTab.requestBody}\n\n`;
        code += `response = requests.${activeTab.endpoint.method.toLowerCase()}(url, headers=headers, json=data)`;
      } else {
        code += `response = requests.${activeTab.endpoint.method.toLowerCase()}(url, headers=headers)`;
      }
      
      return code;
    }
  }, [activeTab, API_URL, codeLanguage]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // JSON Syntax Highlighter
  const highlightJSON = (json: string) => {
    try {
      // Validate JSON first
      JSON.parse(json);
      
      return json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
          let cls = 'text-orange-400'; // numbers
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'text-blue-400 font-semibold'; // keys
              return `<span class="${cls}">${match}</span>`;
            } else {
              cls = 'text-green-400'; // string values
              return `<span class="${cls}">${match}</span>`;
            }
          } else if (/true|false/.test(match)) {
            cls = 'text-purple-400 font-semibold'; // booleans
          } else if (/null/.test(match)) {
            cls = 'text-red-400 font-semibold'; // null
          }
          return `<span class="${cls}">${match}</span>`;
        });
    } catch (e) {
      return json;
    }
  };

  const formatJSON = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return value;
    }
  };

  const filteredGroups = Object.entries(groupedEndpoints).reduce((acc, [group, eps]) => {
    const filtered = eps.filter(ep => {
      const searchLower = searchQuery.toLowerCase();
      return (
        ep.path.toLowerCase().includes(searchLower) ||
        ep.method.toLowerCase().includes(searchLower) ||
        ep.summary?.toLowerCase().includes(searchLower) ||
        ep.description?.toLowerCase().includes(searchLower) ||
        group.toLowerCase().includes(searchLower)
      );
    });
    
    if (filtered.length > 0) {
      acc[group] = filtered;
    }
    
    return acc;
  }, {} as Record<string, ParsedAPIEndpoint[]>);

  if (authLoading || loading) {
    return <Loader />;
  }

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 container mx-auto max-w-7xl rounded-lg shadow-md">
        {/* Top Bar */}
      <div className="flex-none border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                API Explorer
              </h1>
              <p className="text-xs text-muted-foreground">Professional API Testing Suite</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {permissions && (
              <Badge variant="outline" className="text-sm gap-2">
                <Settings2 className="h-3 w-3" />
                {permissions.role}
              </Badge>
            )}
          </div>
        </div>

        {/* Diagnostics Banner */}
        {diagnostics && diagnostics.missing > 0 && (
          <div className="px-6 pb-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-border shadow-sm">
              <Info className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {diagnostics.matched} of {diagnostics.totalRbac}
                </span> endpoints documented • {diagnostics.missing} newer APIs pending documentation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden gap-2 p-2 pt-4 mt-2 bg-card rounded-lg border border-border shadow-md relative z-10">
        {/* Sidebar */}
        <div className="flex-none w-96 bg-transparent backdrop-blur-sm overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Search */}
            <div className="flex-none p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search endpoints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-border shadow-sm">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{endpoints.length}</div>
                  <div className="text-muted-foreground mt-0.5">Endpoints</div>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-border shadow-sm">
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{Object.keys(groupedEndpoints).length}</div>
                  <div className="text-muted-foreground mt-0.5">Groups</div>
                </div>
                <div className="p-2.5 rounded-lg bg-green-500/10 border border-border shadow-sm">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">{tabs.length}</div>
                  <div className="text-muted-foreground mt-0.5">Active</div>
                </div>
              </div>
            </div>

            {/* Endpoint List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {Object.keys(filteredGroups).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No endpoints found</p>
                </div>
              ) : (
                Object.entries(filteredGroups).map(([group, eps]) => (
                  <div key={group} className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center gap-2">
                        {expandedGroups.has(group) ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-sm">{group}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs h-6 px-2">
                        {eps.length}
                      </Badge>
                    </button>
                    
                    {expandedGroups.has(group) && (
                      <div className="border-t border-border">
                        {eps.map((ep, idx) => {
                          const colors = METHOD_COLORS[ep.method] ?? DEFAULT_METHOD_COLOR;
                          const isInActiveTab = tabs.some(t => t.endpoint.path === ep.path && t.endpoint.method === ep.method);
                          
                          return (
                            <button
                              key={`${ep.method}-${ep.path}-${idx}`}
                              onClick={() => createTab(ep)}
                              className={cn(
                                "w-full text-left p-3 border-b last:border-b-0 transition-all group relative first:rounded-t-lg last:rounded-b-lg",
                                colors.hover,
                                isInActiveTab && "bg-primary/5 border-l-2 border-l-primary"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <Badge
                                  className={cn(
                                    "text-xs font-bold flex-shrink-0",
                                    colors.badge,
                                    "w-[5rem] justify-center shadow-sm group-hover:shadow-md transition-shadow"
                                  )}
                                >
                                  {ep.method}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-mono break-words group-hover:text-primary transition-colors">{ep.path}</p>
                                  {ep.summary && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {ep.summary}
                                    </p>
                                  )}
                                </div>
                                {isInActiveTab && (
                                  <div className="flex-shrink-0">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                  </div>
                                )}
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
          {/* Tabs Bar */}
          {tabs.length > 0 && (
            <div className="flex-none border-b border-border bg-gradient-to-b from-muted/40 to-muted/20 overflow-x-auto custom-scrollbar-thin">
              <div className="flex items-center gap-1 px-4 py-2 min-w-max">
                {tabs.map(tab => {
                  const colors = METHOD_COLORS[tab.endpoint.method] ?? DEFAULT_METHOD_COLOR;
                  const isActive = activeTabId === tab.id;
                  return (
                    <div
                      key={tab.id}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-1.5 rounded-lg border-b-2 transition-all cursor-pointer relative",
                        isActive
                          ? "bg-background border-primary shadow-sm scale-105"
                          : "bg-transparent border-transparent hover:bg-muted/50 hover:scale-102"
                      )}
                      onClick={() => setActiveTabId(tab.id)}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-t-lg" />
                      )}
                      <Badge className={cn("text-xs h-5 relative z-10 shadow-sm", colors.badge)}>
                        {tab.endpoint.method}
                      </Badge>
                      <span className={cn(
                        "text-sm font-mono max-w-[250px] truncate relative z-10",
                        isActive && "font-semibold"
                      )}>
                        {tab.endpoint.path}
                      </span>
                      {tab.response && (
                        <div className={cn(
                          "h-1.5 w-1.5 rounded-full relative z-10",
                          tab.response.status >= 200 && tab.response.status < 300
                            ? "bg-green-500"
                            : "bg-red-500"
                        )} />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className={cn(
                          "hover:bg-destructive/20 rounded p-0.5 transition-all relative z-10",
                          isActive ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70 group-hover:hover:opacity-100"
                        )}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex items-center gap-1 ml-2">
                  <div className="h-6 w-px bg-border" />
                  <Badge variant="outline" className="text-xs h-6">
                    {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Request Panel */}
          {!activeTab ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md space-y-4">
                <div className="relative inline-block">
                  <Terminal className="h-24 w-24 text-muted-foreground/20" />
                  <Sparkles className="h-8 w-8 text-primary/40 absolute -top-2 -right-2 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Ready to Test APIs</h3>
                  <p className="text-sm text-muted-foreground">
                    Select an endpoint from the sidebar to create a new request tab
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Fast • Reliable • Secure</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* View Toggle & Request Info */}
              <div className="flex-none border-b border-border bg-card/50 backdrop-blur-sm rounded-t-lg">
                <div className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Badge className={(METHOD_COLORS[activeTab.endpoint.method] ?? DEFAULT_METHOD_COLOR).badge}>
                      {activeTab.endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono text-muted-foreground">
                      {activeTab.endpoint.path}
                    </code>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={activeView === 'request' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('request')}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Request
                    </Button>
                    <Button
                      variant={activeView === 'code' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('code')}
                      className="gap-2"
                    >
                      <FileCode className="h-4 w-4" />
                      Code
                    </Button>
                  </div>
                </div>
              </div>

              {/* Loading Overlay */}
              {isExecuting && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                      <Zap className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">Executing Request</p>
                      <p className="text-sm text-muted-foreground">Please wait...</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Builder */}
              {activeView === 'request' ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {/* Path Parameters */}
                  {activeTab.endpoint.pathParams && activeTab.endpoint.pathParams.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Braces className="h-4 w-4 text-primary" />
                        Path Parameters
                      </h3>
                      <div className="space-y-2">
                        {activeTab.endpoint.pathParams.map(param => (
                          <div key={param.name} className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              {param.name}
                              {param.required && <span className="text-destructive">*</span>}
                            </label>
                            <Input
                              placeholder={param.description || param.name}
                              value={activeTab.pathParams[param.name] || ""}
                              onChange={(e) => updateTab(activeTab.id, {
                                pathParams: { ...activeTab.pathParams, [param.name]: e.target.value }
                              })}
                              className="bg-background/50 font-mono text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Query Parameters */}
                  {activeTab.endpoint.queryParams && activeTab.endpoint.queryParams.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Search className="h-4 w-4 text-primary" />
                        Query Parameters
                      </h3>
                      <div className="space-y-2">
                        {activeTab.endpoint.queryParams.map(param => (
                          <div key={param.name} className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              {param.name}
                              {param.required && <span className="text-destructive">*</span>}
                            </label>
                            <Input
                              placeholder={param.description || param.name}
                              value={activeTab.queryParams[param.name] || ""}
                              onChange={(e) => updateTab(activeTab.id, {
                                queryParams: { ...activeTab.queryParams, [param.name]: e.target.value }
                              })}
                              className="bg-background/50 font-mono text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {activeTab.requestBody && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-primary" />
                          Request Body
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateTab(activeTab.id, { requestBody: formatJSON(activeTab.requestBody) })}
                            className="h-7 gap-2"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span className="text-xs">Format</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(activeTab.requestBody, 'body')}
                            className="h-7 gap-2"
                          >
                            {copied === 'body' ? (
                              <>
                                <Check className="h-3 w-3 text-green-500" />
                                <span className="text-xs">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span className="text-xs">Copy</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="relative rounded-lg border border-border bg-slate-950 overflow-hidden shadow-sm">
                        {/* Line Numbers */}
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-900/50 border-r border-border p-4 text-right select-none overflow-hidden z-10 custom-scrollbar-thin rounded-l-lg">
                          {activeTab.requestBody.split('\n').map((_, i) => (
                            <div key={i} className="font-mono text-xs text-slate-500 leading-6">
                              {i + 1}
                            </div>
                          ))}
                        </div>
                        <div className="relative h-64">
                          {/* Editor */}
                          <textarea
                            value={activeTab.requestBody}
                            onChange={(e) => updateTab(activeTab.id, { requestBody: e.target.value })}
                            placeholder='{"key": "value"}'
                            className="relative w-full h-full pl-16 pr-4 py-4 font-mono text-sm bg-transparent text-slate-200 placeholder:text-slate-600 caret-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 leading-6 selection:bg-blue-500/30 z-20 custom-scrollbar"
                            spellCheck={false}
                            style={{ caretColor: 'white' }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Press Format to beautify JSON • Supports auto-completion
                      </p>
                    </div>
                  )}

                  {/* Execute Button */}
                  <div className="pt-4">
                    <Button
                      onClick={executeRequest}
                      disabled={isExecuting}
                      size="lg"
                      className="w-full gap-3 text-base h-12 font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-200 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      {isExecuting ? (
                        <>
                          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Executing Request...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                          Execute Request
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Response Section */}
                  {activeTab.response && (
                    <div className="space-y-3 pt-6 border-t border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Database className="h-4 w-4 text-primary" />
                          Response
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <Badge
                            variant={activeTab.response.status >= 200 && activeTab.response.status < 300 ? "default" : "destructive"}
                            className="gap-1 font-semibold animate-in zoom-in duration-300"
                          >
                            {activeTab.response.status}
                          </Badge>
                          <Badge variant="outline" className="gap-1 animate-in slide-in-from-right-2 duration-300 delay-75">
                            <Clock className="h-3 w-3" />
                            {formatTime(activeTab.response.time)}
                          </Badge>
                          <Badge variant="outline" className="gap-1 animate-in slide-in-from-right-2 duration-300 delay-100">
                            <Database className="h-3 w-3" />
                            {formatBytes(activeTab.response.size)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(activeTab.response?.data, null, 2), 'response')}
                            className="h-7 gap-2 animate-in slide-in-from-right-2 duration-300 delay-150"
                          >
                            {copied === 'response' ? (
                              <>
                                <Check className="h-3 w-3 text-green-500" />
                                <span className="text-xs">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span className="text-xs">Copy</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="relative rounded-lg border border-border bg-slate-950 overflow-hidden shadow-sm">
                          {/* Line Numbers */}
                          <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-900/50 border-r border-border p-4 text-right select-none overflow-hidden custom-scrollbar-thin rounded-l-lg">
                            {JSON.stringify(activeTab.response.data, null, 2).split('\n').map((_, i) => (
                              <div key={i} className="font-mono text-xs text-slate-500 leading-6">
                                {i + 1}
                              </div>
                            ))}
                          </div>
                          {/* Syntax Highlighted Response */}
                          <pre className="w-full max-h-96 pl-16 pr-4 py-4 font-mono text-sm text-slate-200 overflow-auto leading-6 custom-scrollbar">
                            <code 
                              dangerouslySetInnerHTML={{ 
                                __html: highlightJSON(JSON.stringify(activeTab.response.data, null, 2))
                              }}
                            />
                          </pre>
                        </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className={cn(
                          "flex items-center gap-1 font-medium",
                          activeTab.response.status >= 200 && activeTab.response.status < 300
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}>
                          {activeTab.response.status >= 200 && activeTab.response.status < 300 ? (
                            <>
                              <Check className="h-3 w-3" />
                              Response received successfully
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" />
                              Request failed
                            </>
                          )}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Code Generation View */
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-primary" />
                      Generate Code Snippet
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={codeLanguage === 'curl' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCodeLanguage('curl')}
                        className="gap-2"
                      >
                        <Terminal className="h-3 w-3" />
                        cURL
                      </Button>
                      <Button
                        variant={codeLanguage === 'javascript' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCodeLanguage('javascript')}
                      >
                        JavaScript
                      </Button>
                      <Button
                        variant={codeLanguage === 'python' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCodeLanguage('python')}
                      >
                        Python
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative rounded-lg border border-border bg-slate-950 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-border rounded-t-lg">
                      <span className="text-xs font-medium text-slate-400">
                        {codeLanguage === 'curl' ? 'Shell' : codeLanguage === 'javascript' ? 'JavaScript' : 'Python'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generateCodeSnippet(), 'code')}
                        className="h-6 gap-2 hover:bg-slate-800"
                      >
                        {copied === 'code' ? (
                          <>
                            <Check className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-400">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                    {/* Line Numbers */}
                    <div className="absolute left-0 top-10 bottom-0 w-12 bg-slate-900/50 border-r border-border p-4 text-right select-none overflow-hidden custom-scrollbar-thin rounded-bl-lg">
                      {generateCodeSnippet().split('\n').map((_, i) => (
                        <div key={i} className="font-mono text-xs text-slate-500 leading-6">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <pre className="w-full min-h-[300px] pl-16 pr-4 py-4 font-mono text-sm text-slate-200 overflow-auto leading-6 custom-scrollbar">
                      {generateCodeSnippet()}
                    </pre>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Copy this code snippet to use in your application
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      </div>
    </>
  );
}

