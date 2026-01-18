"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Bell,
    Send,
    Users,
    Loader2,
    AlertCircle,
    Check,
    X,
    Search,
    UserPlus,
    Trash2,
    Plus,
    ChevronDown,
    RefreshCw,
    Zap,
    MessageSquare,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { getManagedToken } from "@/lib/auth/tokenManager";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface MetaNotification {
    id: string;
    title: string;
    type: string;
    triggerEvent: string;
    message: string;
    priority: string;
    deeplink: string;
    userCategory: string;
    status: string;
    channel: string;
    deliveryType: string;
    expiryDurationMins: number;
    icon: string;
    createdBy: string;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
}

interface UserData {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    userStatus: string;
}

interface Variable {
    key: string;
    value: string;
}

export default function NotificationsPage() {
    const { isLoading: authLoading, isAuthenticated } = useAuthContext();

    // Meta notifications state
    const [metaNotifications, setMetaNotifications] = useState<MetaNotification[]>([]);
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [metaError, setMetaError] = useState<string | null>(null);

    // Send mode: 'single' or 'bulk'
    const [sendMode, setSendMode] = useState<'single' | 'bulk'>('single');

    // Single notification state
    const [singleUserId, setSingleUserId] = useState('');

    // Bulk notification state
    const [bulkUserIds, setBulkUserIds] = useState<string[]>([]);
    const [bulkUserInput, setBulkUserInput] = useState('');

    // Common state
    const [selectedTriggerEvent, setSelectedTriggerEvent] = useState('');
    const [variables, setVariables] = useState<Variable[]>([]);
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<any>(null);
    const [sendError, setSendError] = useState<string | null>(null);

    // User search and selection state
    const [showUserList, setShowUserList] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);

    // Dropdown state for trigger event selection
    const [showTriggerDropdown, setShowTriggerDropdown] = useState(false);
    const [triggerSearchQuery, setTriggerSearchQuery] = useState('');

    // Fetch meta notifications
    const fetchMetaNotifications = useCallback(async () => {
        setLoadingMeta(true);
        setMetaError(null);

        try {
            const token = await getManagedToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
                headers['x-jwt-token'] = token;
            }

            const response = await axios.get(`${API_URL}/meta/notifications`, { headers });
            setMetaNotifications(response.data.notifications || []);
        } catch (err: any) {
            console.error('[Notifications] Failed to fetch meta notifications:', err);
            setMetaError(err.response?.data?.message || 'Failed to fetch notification templates');
        } finally {
            setLoadingMeta(false);
        }
    }, []);

    // Fetch all users
    const fetchAllUsers = useCallback(async () => {
        setLoadingUsers(true);
        setUsersError(null);

        try {
            const token = await getManagedToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
                headers['x-jwt-token'] = token;
            }

            const response = await axios.get(`${API_URL}/users?limit=100`, { headers });
            setAllUsers(response.data.users || response.data || []);
        } catch (err: any) {
            console.error('[Notifications] Failed to fetch users:', err);
            setUsersError(err.response?.data?.message || 'Failed to fetch users');
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchMetaNotifications();
        }
    }, [isAuthenticated, fetchMetaNotifications]);

    // Extract variable placeholders from selected notification message
    const extractVariables = useCallback((message: string): string[] => {
        const regex = /\{\{(\w+)\}\}/g;
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(message)) !== null) {
            const captured = match[1];
            if (captured && !matches.includes(captured)) {
                matches.push(captured);
            }
        }
        return matches;
    }, []);

    // Update variables when trigger event changes
    useEffect(() => {
        if (selectedTriggerEvent) {
            const notification = metaNotifications.find(n => n.triggerEvent === selectedTriggerEvent);
            if (notification) {
                const variableKeys = extractVariables(notification.message);
                setVariables(variableKeys.map(key => ({ key, value: '' })));
            }
        } else {
            setVariables([]);
        }
    }, [selectedTriggerEvent, metaNotifications, extractVariables]);

    // Add user to bulk list
    const addUserToBulk = (userId: string) => {
        if (userId.trim() && !bulkUserIds.includes(userId.trim())) {
            setBulkUserIds([...bulkUserIds, userId.trim()]);
        }
        setBulkUserInput('');
    };

    // Remove user from bulk list
    const removeUserFromBulk = (userId: string) => {
        setBulkUserIds(bulkUserIds.filter(id => id !== userId));
    };

    // Handle user selection from list
    const selectUser = (user: UserData) => {
        if (sendMode === 'single') {
            setSingleUserId(user.id);
            setShowUserList(false);
        } else {
            addUserToBulk(user.id);
        }
    };

    // Send notification
    const sendNotification = async () => {
        setSending(true);
        setSendResult(null);
        setSendError(null);

        try {
            const token = await getManagedToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
                headers['x-jwt-token'] = token;
            }

            const variablesObj: Record<string, string> = {};
            variables.forEach(v => {
                if (v.key && v.value) {
                    variablesObj[v.key] = v.value;
                }
            });

            let response;

            if (sendMode === 'single') {
                // Single notification
                response = await axios.post(
                    `${API_URL}/notifications/send`,
                    {
                        userId: singleUserId,
                        triggerEvent: selectedTriggerEvent,
                        variables: variablesObj,
                    },
                    { headers }
                );
            } else {
                // Bulk notification
                response = await axios.post(
                    `${API_URL}/notifications/send-bulk`,
                    {
                        userIds: bulkUserIds,
                        triggerEvent: selectedTriggerEvent,
                        variables: variablesObj,
                    },
                    { headers }
                );
            }

            setSendResult(response.data);
            toast.success(
                sendMode === 'single'
                    ? 'Notification sent successfully'
                    : `Notifications sent to ${response.data.sentCount || bulkUserIds.length} users`
            );
        } catch (err: any) {
            console.error('[Notifications] Failed to send notification:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to send notification';
            setSendError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setSending(false);
        }
    };

    // Filter notifications by search query
    const filteredNotifications = metaNotifications.filter(n =>
        n.title.toLowerCase().includes(triggerSearchQuery.toLowerCase()) ||
        n.triggerEvent.toLowerCase().includes(triggerSearchQuery.toLowerCase()) ||
        n.type.toLowerCase().includes(triggerSearchQuery.toLowerCase())
    );

    // Filter users by search query
    const filteredUsers = allUsers.filter(u =>
        u.firstName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.phone?.includes(userSearchQuery) ||
        u.id?.toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    // Get selected notification details
    const selectedNotification = metaNotifications.find(n => n.triggerEvent === selectedTriggerEvent);

    // Check if form is valid
    const isFormValid = () => {
        if (!selectedTriggerEvent) return false;
        if (sendMode === 'single' && !singleUserId.trim()) return false;
        if (sendMode === 'bulk' && bulkUserIds.length === 0) return false;
        return true;
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Authentication Required</CardTitle>
                        <CardDescription>Please sign in to access Notifications</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (authLoading) {
        return (
            <div className="space-y-6 pb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-64" />
                            <Skeleton className="h-5 w-96" />
                        </div>
                    </div>
                </div>
                <Card className="border-2">
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-32 w-full" />
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
      `}</style>

            <div className="space-y-6 pb-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Bell className="h-10 w-10 text-primary" />
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Send Notifications</h1>
                        <p className="text-muted-foreground mt-1">
                            Send push notifications to users using predefined templates
                        </p>
                    </div>
                </div>

                {/* Send Mode Toggle */}
                <Card className="border-2">
                    <CardContent className="p-4">
                        <div className="flex gap-2">
                            <Button
                                variant={sendMode === 'single' ? 'default' : 'outline'}
                                onClick={() => setSendMode('single')}
                                className="flex-1 gap-2"
                            >
                                <Send className="h-4 w-4" />
                                Single User
                            </Button>
                            <Button
                                variant={sendMode === 'bulk' ? 'default' : 'outline'}
                                onClick={() => setSendMode('bulk')}
                                className="flex-1 gap-2"
                            >
                                <Users className="h-4 w-4" />
                                Bulk Send
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Selection */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                {sendMode === 'single' ? 'Select User' : 'Select Users'}
                            </CardTitle>
                            <CardDescription>
                                {sendMode === 'single'
                                    ? 'Enter user ID or select from the list'
                                    : 'Add multiple user IDs for bulk notification'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {sendMode === 'single' ? (
                                <>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Enter user ID"
                                            value={singleUserId}
                                            onChange={(e) => setSingleUserId(e.target.value)}
                                            className="flex-1 font-mono text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowUserList(!showUserList);
                                                if (!showUserList && allUsers.length === 0) {
                                                    fetchAllUsers();
                                                }
                                            }}
                                            className="gap-2"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            Browse
                                        </Button>
                                    </div>
                                    {singleUserId && (
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                                            <Check className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-mono flex-1 truncate">{singleUserId}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSingleUserId('')}
                                                className="h-6 w-6 p-0"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Enter user ID and press Enter or Add"
                                            value={bulkUserInput}
                                            onChange={(e) => setBulkUserInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && bulkUserInput.trim()) {
                                                    addUserToBulk(bulkUserInput);
                                                }
                                            }}
                                            className="flex-1 font-mono text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => bulkUserInput.trim() && addUserToBulk(bulkUserInput)}
                                            className="gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowUserList(!showUserList);
                                                if (!showUserList && allUsers.length === 0) {
                                                    fetchAllUsers();
                                                }
                                            }}
                                            className="gap-2"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            Browse
                                        </Button>
                                    </div>

                                    {/* Selected Users List */}
                                    {bulkUserIds.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">
                                                    {bulkUserIds.length} user{bulkUserIds.length !== 1 ? 's' : ''} selected
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setBulkUserIds([])}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Clear All
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-2 rounded-lg border bg-muted/20">
                                                {bulkUserIds.map((id) => (
                                                    <Badge
                                                        key={id}
                                                        variant="secondary"
                                                        className="gap-1 font-mono text-xs"
                                                    >
                                                        {id.slice(0, 8)}...
                                                        <button
                                                            onClick={() => removeUserFromBulk(id)}
                                                            className="ml-1 hover:text-destructive"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* User List Dropdown */}
                            {showUserList && (
                                <Card className="border-primary/30 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <CardContent className="p-3 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Search className="h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search users by name, email, phone, or ID..."
                                                value={userSearchQuery}
                                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                                className="flex-1 h-8 text-sm"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={fetchAllUsers}
                                                disabled={loadingUsers}
                                                className="h-8 w-8 p-0"
                                            >
                                                <RefreshCw className={cn("h-4 w-4", loadingUsers && "animate-spin")} />
                                            </Button>
                                        </div>

                                        {loadingUsers ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            </div>
                                        ) : usersError ? (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <span className="text-sm">{usersError}</span>
                                            </div>
                                        ) : (
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                                                {filteredUsers.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground text-center py-4">
                                                        No users found
                                                    </p>
                                                ) : (
                                                    filteredUsers.map((user) => (
                                                        <button
                                                            key={user.id}
                                                            onClick={() => selectUser(user)}
                                                            className={cn(
                                                                "w-full p-2 rounded-lg text-left transition-all",
                                                                "hover:bg-primary/10 border border-transparent hover:border-primary/20",
                                                                (sendMode === 'single' && singleUserId === user.id) ||
                                                                    (sendMode === 'bulk' && bulkUserIds.includes(user.id))
                                                                    ? "bg-primary/10 border-primary/30"
                                                                    : ""
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm font-medium">
                                                                        {user.firstName} {user.lastName}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {user.email || user.phone}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {user.userStatus}
                                                                    </Badge>
                                                                    {((sendMode === 'single' && singleUserId === user.id) ||
                                                                        (sendMode === 'bulk' && bulkUserIds.includes(user.id))) && (
                                                                            <Check className="h-4 w-4 text-primary" />
                                                                        )}
                                                                </div>
                                                            </div>
                                                            <p className="text-xs font-mono text-muted-foreground mt-1">
                                                                {user.id}
                                                            </p>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </CardContent>
                    </Card>

                    {/* Trigger Event Selection */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="h-5 w-5 text-yellow-500" />
                                Notification Template
                            </CardTitle>
                            <CardDescription>
                                Select a notification template to send
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingMeta ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : metaError ? (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm">{metaError}</span>
                                    <Button variant="ghost" size="sm" onClick={fetchMetaNotifications}>
                                        Retry
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/* Trigger Event Dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowTriggerDropdown(!showTriggerDropdown)}
                                            className={cn(
                                                "w-full p-3 rounded-lg border text-left transition-all",
                                                "hover:border-primary/50 flex items-center justify-between",
                                                selectedTriggerEvent ? "border-primary/30 bg-primary/5" : "border-border"
                                            )}
                                        >
                                            {selectedNotification ? (
                                                <div className="flex-1">
                                                    <p className="font-medium">{selectedNotification.title}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {selectedNotification.triggerEvent}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Select a notification template...</span>
                                            )}
                                            <ChevronDown className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform",
                                                showTriggerDropdown && "rotate-180"
                                            )} />
                                        </button>

                                        {showTriggerDropdown && (
                                            <Card className="absolute z-50 w-full mt-1 border-primary/30 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <CardContent className="p-2 space-y-2">
                                                    <div className="flex items-center gap-2 p-1">
                                                        <Search className="h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            placeholder="Search templates..."
                                                            value={triggerSearchQuery}
                                                            onChange={(e) => setTriggerSearchQuery(e.target.value)}
                                                            className="flex-1 h-8 text-sm border-0 focus-visible:ring-0"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                                                        {filteredNotifications.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                                No templates found
                                                            </p>
                                                        ) : (
                                                            filteredNotifications.map((notification) => (
                                                                <button
                                                                    key={notification.id}
                                                                    onClick={() => {
                                                                        setSelectedTriggerEvent(notification.triggerEvent);
                                                                        setShowTriggerDropdown(false);
                                                                        setTriggerSearchQuery('');
                                                                    }}
                                                                    className={cn(
                                                                        "w-full p-2 rounded-lg text-left transition-all",
                                                                        "hover:bg-primary/10 border border-transparent hover:border-primary/20",
                                                                        selectedTriggerEvent === notification.triggerEvent
                                                                            ? "bg-primary/10 border-primary/30"
                                                                            : ""
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-medium">{notification.title}</p>
                                                                            <p className="text-xs text-muted-foreground font-mono">
                                                                                {notification.triggerEvent}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={cn(
                                                                                    "text-xs",
                                                                                    notification.status === 'active' && "border-green-500/50 text-green-500",
                                                                                    notification.status === 'inactive' && "border-yellow-500/50 text-yellow-500",
                                                                                    notification.status === 'deprecated' && "border-red-500/50 text-red-500"
                                                                                )}
                                                                            >
                                                                                {notification.status}
                                                                            </Badge>
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                {notification.type}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>

                                    {/* Selected Template Preview */}
                                    {selectedNotification && (
                                        <div className="p-4 rounded-lg border bg-muted/30 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-primary">{selectedNotification.title}</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        Type: {selectedNotification.type} | Priority: {selectedNotification.priority}
                                                    </p>
                                                </div>
                                                <Badge variant="outline">{selectedNotification.channel}</Badge>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted/30 border">
                                                <p className="text-sm flex items-start gap-2">
                                                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                    <span>{selectedNotification.message}</span>
                                                </p>
                                            </div>
                                            {selectedNotification.deeplink && (
                                                <p className="text-xs text-muted-foreground">
                                                    Deeplink: <code className="bg-muted px-1 rounded">{selectedNotification.deeplink}</code>
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Variables Section */}
                {variables.length > 0 && (
                    <Card className="border-2 animate-in fade-in slide-in-from-bottom-4">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings2Icon className="h-5 w-5 text-purple-500" />
                                Template Variables
                            </CardTitle>
                            <CardDescription>
                                Fill in the variable values for this notification template
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {variables.map((variable, index) => (
                                    <div key={variable.key} className="space-y-2">
                                        <Label htmlFor={`var-${variable.key}`} className="text-sm font-medium">
                                            {variable.key}
                                        </Label>
                                        <Input
                                            id={`var-${variable.key}`}
                                            placeholder={`Enter ${variable.key}...`}
                                            value={variable.value}
                                            onChange={(e) => {
                                                const newVars = [...variables];
                                                const targetVar = newVars[index];
                                                if (targetVar) {
                                                    targetVar.value = e.target.value;
                                                    setVariables(newVars);
                                                }
                                            }}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Send Button */}
                <Card className="border-2 border-primary/30">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold">Ready to Send</h3>
                                <p className="text-sm text-muted-foreground">
                                    {sendMode === 'single'
                                        ? singleUserId
                                            ? `Sending to 1 user: ${singleUserId.slice(0, 12)}...`
                                            : 'Select a user to continue'
                                        : bulkUserIds.length > 0
                                            ? `Sending to ${bulkUserIds.length} user${bulkUserIds.length !== 1 ? 's' : ''}`
                                            : 'Add users to continue'
                                    }
                                </p>
                            </div>
                            <Button
                                onClick={sendNotification}
                                disabled={!isFormValid() || sending}
                                className="gap-2 min-w-[160px]"
                                size="lg"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Send Notification
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Result Display */}
                {sendResult && (
                    <Card className="border-2 border-green-500/30 bg-green-500/5 animate-in fade-in slide-in-from-bottom-4">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-green-500">
                                <Check className="h-5 w-5" />
                                Notification Sent Successfully
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-xs text-muted-foreground">Notification ID</p>
                                    <p className="text-sm font-mono truncate">{sendResult.id}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <p className="text-xs text-muted-foreground">Sent</p>
                                    <p className="text-lg font-bold text-green-500">{sendResult.sentCount}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-xs text-muted-foreground">Failed</p>
                                    <p className="text-lg font-bold text-red-500">{sendResult.failedCount}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-xs text-muted-foreground">Message</p>
                                    <p className="text-sm">{sendResult.message}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Error Display */}
                {sendError && (
                    <Card className="border-2 border-destructive/30 bg-destructive/5 animate-in fade-in slide-in-from-bottom-4">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                            <div>
                                <p className="font-medium text-destructive">Failed to Send Notification</p>
                                <p className="text-sm text-muted-foreground">{sendError}</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSendError(null)}
                                className="ml-auto"
                            >
                                Dismiss
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

// Settings icon component
function Settings2Icon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M20 7h-9" />
            <path d="M14 17H5" />
            <circle cx="17" cy="17" r="3" />
            <circle cx="7" cy="7" r="3" />
        </svg>
    );
}
