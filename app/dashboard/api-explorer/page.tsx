"use client";

import { useEffect, useState } from "react";
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
  Code,
  BookOpen,
  Zap
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

const METHOD_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  GET: { bg: "bg-blue-500/10", text: "text-blue-600", badge: "bg-blue-500" },
  POST: { bg: "bg-green-500/10", text: "text-green-600", badge: "bg-green-500" },
  PUT: { bg: "bg-orange-500/10", text: "text-orange-600", badge: "bg-orange-500" },
  PATCH: { bg: "bg-purple-500/10", text: "text-purple-600", badge: "bg-purple-500" },
  DELETE: { bg: "bg-red-500/10", text: "text-red-600", badge: "bg-red-500" },
};

export default function APIExplorerPage() {
  const { permissions, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<ParsedAPIEndpoint[]>([]);
  const [groupedEndpoints, setGroupedEndpoints] = useState<Record<string, ParsedAPIEndpoint[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedEndpoint, setSelectedEndpoint] = useState<ParsedAPIEndpoint | null>(null);
  const [requestBody, setRequestBody] = useState<string>("");
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<{
    status: number;
    data: any;
    headers: any;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    totalRbac: number;
    matched: number;
    missing: number;
  } | null>(null);

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
        // Count total RBAC endpoints
        const totalRbac = Object.values(permissions.methods).reduce(
          (sum, paths) => sum + (paths?.length || 0), 
          0
        );

        // Parse endpoints from permissions
        const parsedEndpoints = getEndpointsFromPermissions(permissions.methods);
        const matched = parsedEndpoints.length;
        const missing = totalRbac - matched;
        
        setEndpoints(parsedEndpoints);
        setDiagnostics({ totalRbac, matched, missing });
        
        const grouped = groupEndpointsByTag(parsedEndpoints);
        setGroupedEndpoints(grouped);
        
        // Expand first group by default
        if (Object.keys(grouped).length > 0) {
          setExpandedGroups(new Set([Object.keys(grouped)[0]]));
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

  const selectEndpoint = (endpoint: ParsedAPIEndpoint) => {
    setSelectedEndpoint(endpoint);
    setResponse(null);
    
    // Generate example request body
    if (endpoint.requestBodySchema) {
      const example = endpoint.requestBodyExample || 
                     generateExampleFromSchema(endpoint.requestBodySchema);
      setRequestBody(JSON.stringify(example, null, 2));
    } else {
      setRequestBody("");
    }

    // Initialize path params
    const initialPathParams: Record<string, string> = {};
    if (endpoint.pathParams) {
      endpoint.pathParams.forEach(param => {
        initialPathParams[param.name] = "";
      });
    }
    setPathParams(initialPathParams);

    // Initialize query params
    const initialQueryParams: Record<string, string> = {};
    if (endpoint.queryParams) {
      endpoint.queryParams.forEach(param => {
        initialQueryParams[param.name] = "";
      });
    }
    setQueryParams(initialQueryParams);
  };

  const executeRequest = async () => {
    if (!selectedEndpoint || !API_URL) return;

    setIsExecuting(true);
    setResponse(null);

    try {
      // Build path with path params
      let path = selectedEndpoint.path;
      for (const [key, value] of Object.entries(pathParams)) {
        if (value) {
          path = path.replace(`{${key}}`, value);
        }
      }

      // Build query string
      const queryString = Object.entries(queryParams)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      const url = `${API_URL}${path}${queryString ? '?' + queryString : ''}`;

      // Get JWT token
      const token = await getManagedToken();

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers['x-jwt-token'] = token;
      }

      // Parse request body
      let data = undefined;
      if (requestBody && selectedEndpoint.method !== 'GET' && selectedEndpoint.method !== 'DELETE') {
        try {
          data = JSON.parse(requestBody);
        } catch (err) {
          throw new Error('Invalid JSON in request body');
        }
      }

      // Execute request
      const axiosConfig = {
        method: selectedEndpoint.method.toLowerCase(),
        url,
        headers,
        data,
      };

      const res = await axios(axiosConfig);

      setResponse({
        status: res.status,
        data: res.data,
        headers: res.headers,
      });
    } catch (err: any) {
      console.error('[APIExplorer] Request failed:', err);
      
      if (axios.isAxiosError(err)) {
        setResponse({
          status: err.response?.status || 500,
          data: err.response?.data || { error: err.message },
          headers: err.response?.headers || {},
        });
      } else {
        setResponse({
          status: 500,
          data: { error: err.message || 'Unknown error' },
          headers: {},
        });
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'body' | 'response') => {
    navigator.clipboard.writeText(text);
    if (type === 'body') {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    } else {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            API Explorer
          </h1>
          <p className="text-muted-foreground mt-1">
            Test and explore your allowed API endpoints
          </p>
        </div>
        
        {permissions && (
          <Badge variant="outline" className="text-sm">
            Role: {permissions.role}
          </Badge>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostics Info */}
      {diagnostics && diagnostics.missing > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-orange-600 dark:text-orange-400 mb-1">
                  Showing {diagnostics.matched} of {diagnostics.totalRbac} allowed endpoints
                </p>
                <p className="text-sm text-muted-foreground">
                  {diagnostics.missing} newer APIs from your permissions are not yet documented in the OpenAPI spec. 
                  The documented endpoints are fully functional.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Endpoints</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{endpoints.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(groupedEndpoints).length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Role</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions?.role || 'Unknown'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Sidebar - Endpoint List */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
            <CardDescription>Browse and select API endpoints</CardDescription>
            
            {/* Search */}
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search endpoints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          
          <CardContent className="max-h-[600px] overflow-y-auto space-y-2">
            {Object.keys(filteredGroups).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No endpoints found</p>
              </div>
            ) : (
              Object.entries(filteredGroups).map(([group, eps]) => (
                <div key={group} className="border rounded-lg overflow-hidden">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroups.has(group) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium">{group}</span>
                      <Badge variant="secondary" className="text-xs">
                        {eps.length}
                      </Badge>
                    </div>
                  </button>
                  
                  {/* Endpoints in Group */}
                  {expandedGroups.has(group) && (
                    <div className="border-t">
                      {eps.map((ep, idx) => {
                        const colors = METHOD_COLORS[ep.method] || METHOD_COLORS.GET;
                        const isSelected = selectedEndpoint?.path === ep.path && 
                                         selectedEndpoint?.method === ep.method;
                        
                        return (
                          <button
                            key={`${ep.method}-${ep.path}-${idx}`}
                            onClick={() => selectEndpoint(ep)}
                            className={cn(
                              "w-full text-left p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                              isSelected && "bg-primary/5 border-l-4 border-l-primary"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <Badge className={cn("text-xs font-mono", colors.badge)}>
                                {ep.method}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-mono truncate">{ep.path}</p>
                                {ep.summary && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {ep.summary}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Main Panel - Endpoint Details & Testing */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedEndpoint ? (
            <Card>
              <CardContent className="py-24 text-center">
                <Code className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-lg font-medium text-muted-foreground">
                  Select an endpoint to get started
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Choose an API endpoint from the list to test it
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Endpoint Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={METHOD_COLORS[selectedEndpoint.method].badge}>
                          {selectedEndpoint.method}
                        </Badge>
                        <code className="text-sm font-mono">{selectedEndpoint.path}</code>
                      </div>
                      {selectedEndpoint.summary && (
                        <CardDescription>{selectedEndpoint.summary}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Path Parameters */}
                  {selectedEndpoint.pathParams && selectedEndpoint.pathParams.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Path Parameters</h4>
                      <div className="space-y-2">
                        {selectedEndpoint.pathParams.map(param => (
                          <div key={param.name}>
                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                              {param.name}
                              {param.required && <span className="text-destructive">*</span>}
                            </label>
                            <Input
                              placeholder={param.description || param.name}
                              value={pathParams[param.name] || ""}
                              onChange={(e) => setPathParams({
                                ...pathParams,
                                [param.name]: e.target.value
                              })}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Query Parameters */}
                  {selectedEndpoint.queryParams && selectedEndpoint.queryParams.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Query Parameters</h4>
                      <div className="space-y-2">
                        {selectedEndpoint.queryParams.map(param => (
                          <div key={param.name}>
                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                              {param.name}
                              {param.required && <span className="text-destructive">*</span>}
                            </label>
                            <Input
                              placeholder={param.description || param.name}
                              value={queryParams[param.name] || ""}
                              onChange={(e) => setQueryParams({
                                ...queryParams,
                                [param.name]: e.target.value
                              })}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {requestBody && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Request Body</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(requestBody, 'body')}
                        >
                          {copiedBody ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        className="w-full h-48 p-3 font-mono text-sm border rounded-md bg-muted/30 resize-none"
                      />
                    </div>
                  )}

                  {/* Execute Button */}
                  <Button
                    onClick={executeRequest}
                    disabled={isExecuting}
                    className="w-full"
                  >
                    {isExecuting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Executing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Execute Request
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Response */}
              {response && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        Response
                        <Badge
                          variant={response.status >= 200 && response.status < 300 ? "default" : "destructive"}
                        >
                          {response.status}
                        </Badge>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(response.data, null, 2), 'response')}
                      >
                        {copiedResponse ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="w-full max-h-96 p-3 font-mono text-sm border rounded-md bg-muted/30 overflow-auto">
                      {JSON.stringify(response.data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

