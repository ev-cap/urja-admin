"use client";

import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Sparkles, Send, CheckCircle2, AlertCircle, RefreshCw, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { syncAndAssignAPIToRole } from "@/lib/services/rbacService";
import { cn } from "@/lib/utils";

export default function RBACSyncPage() {
    const { userData, isAuthenticated, isLoading: authLoading } = useAuthContext();
    const [role, setRole] = useState("admin");
    const [operationId, setOperationId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!operationId.trim()) {
            toast.error("Operation ID is required");
            return;
        }

        setIsLoading(true);
        setResult(null);
        try {
            const response = await syncAndAssignAPIToRole(role, operationId.trim());
            setResult(response);
            toast.success("Sync and Assign completed successfully");
        } catch (error: any) {
            console.error("[RBACSyncPage] Error:", error);
            toast.error(error.response?.data?.message || error.message || "Failed to sync and assign API");
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                            <div>
                                <h2 className="text-xl font-semibold">Access Denied</h2>
                                <p className="text-muted-foreground mt-2">
                                    Please sign in to access this page.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Check if user is superadmin
    const userRoleLower = (userData?.userRole || userData?.role || "").toLowerCase();
    const isSuperAdmin = userRoleLower === "superadmin";

    if (!isSuperAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <Shield className="h-12 w-12 text-destructive" />
                            <div>
                                <h2 className="text-xl font-semibold">Permission Denied</h2>
                                <p className="text-muted-foreground mt-2">
                                    Only users with the <strong>superadmin</strong> role can access this tool.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                    RBAC API Sync
                </h1>
                <p className="text-muted-foreground">
                    Sync new API endpoints and assign permissions to specific roles.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Form */}
                <Card className="border-primary/20 shadow-lg bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-primary" />
                            Sync Parameters
                        </CardTitle>
                        <CardDescription>
                            Enter the role and operation ID to sync and assign.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="flex flex-col gap-3">
                                <Label htmlFor="role">Target Role</Label>
                                <div className="flex flex-wrap gap-3">
                                    {["user", "admin"].map((r) => (
                                        <Button
                                            key={r}
                                            type="button"
                                            variant={role === r ? "default" : "outline"}
                                            onClick={() => setRole(r)}
                                            className={cn(
                                                "capitalize transition-all h-10 px-6",
                                                role === r && "ring-2 ring-primary ring-offset-2"
                                            )}
                                        >
                                            {r}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="operationId">Operation ID</Label>
                                <div className="relative">
                                    <Input
                                        id="operationId"
                                        placeholder="e.g. GET:routes.GetPlanRouteAnalyticsByID"
                                        value={operationId}
                                        onChange={(e) => setOperationId(e.target.value)}
                                        className="bg-background/50 border-primary/20 focus:border-primary pr-10"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Sparkles className="h-4 w-4 text-primary/40" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground italic">
                                    Format: METHOD:service.FunctionName
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Sync & Assign
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Results / Help */}
                <div className="space-y-6">
                    {result ? (
                        <Card className="border-emerald-500/20 shadow-lg bg-emerald-500/5 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Sync Result
                                </CardTitle>
                                <CardDescription>
                                    Details of the RBAC synchronization operation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Sync Status */}
                                <div className="p-4 rounded-lg bg-background/50 border border-emerald-500/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">Synchronization</span>
                                        <Badge variant={result.sync?.success ? "default" : "destructive"} className="bg-emerald-500">
                                            {result.sync?.success ? "Success" : "Failed"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{result.sync?.message}</p>
                                    {result.sync?.count !== undefined && (
                                        <div className="mt-2 text-xs font-mono bg-emerald-500/10 p-1.5 rounded inline-block text-emerald-600">
                                            Endpoints Synced: {result.sync.count}
                                        </div>
                                    )}
                                </div>

                                {/* Assign Status */}
                                <div className="p-4 rounded-lg bg-background/50 border border-emerald-500/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">Permission Assignment</span>
                                        <Badge variant={result.assign?.success ? "default" : "destructive"} className="bg-emerald-500">
                                            {result.assign?.success ? "Success" : "Failed"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{result.assign?.message}</p>
                                    {result.assign?.added !== undefined && (
                                        <div className="mt-2 text-xs font-mono bg-emerald-500/10 p-1.5 rounded inline-block text-emerald-600">
                                            APIs Added: {result.assign.added}
                                        </div>
                                    )}
                                </div>

                                {/* Refresh Status */}
                                <div className="p-4 rounded-lg bg-background/50 border border-emerald-500/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">Cache Refresh</span>
                                        <Badge variant={result.refresh?.success ? "default" : "destructive"} className="bg-emerald-500">
                                            {result.refresh?.success ? "Success" : "Failed"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{result.refresh?.message}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-muted/20 shadow-sm bg-muted/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-muted-foreground" />
                                    How it works
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        This tool allows you to manually sync new API endpoints from the backend services to the RBAC (Role-Based Access Control) system.
                                    </p>
                                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                                        <li>Syncs all available API endpoints to the Super Admin document.</li>
                                        <li>Assigns the specific <strong>Operation ID</strong> to the chosen role.</li>
                                        <li>Refreshes the RBAC cache globally for immediate effect.</li>
                                    </ul>
                                </div>
                                <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-xs text-amber-600 dark:text-amber-400 flex gap-2">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>Make sure the Operation ID matches exactly what is defined in the backend services.</span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
