"use client";

import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Phone,
  IdCard,
  Mail,
  Calendar,
  Award,
  Bell,
  Car,
  Heart,
  BarChart3,
  Settings2,
  Search,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Code2,
  MapPin,
} from "lucide-react";
import axios from "axios";
import { getManagedToken } from "@/lib/auth/tokenManager";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function UserManagementPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuthContext();
  const [userSearchType, setUserSearchType] = useState<'phone' | 'userId'>('phone');
  const [userSearchValue, setUserSearchValue] = useState('');
  const [userSearching, setUserSearching] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  
  // Additional user data from new endpoints
  const [userInterests, setUserInterests] = useState<any>(null);
  const [userFavouriteStations, setUserFavouriteStations] = useState<any>(null);
  const [userProfileImage, setUserProfileImage] = useState<any>(null);
  const [userProfileStatus, setUserProfileStatus] = useState<any>(null);
  const [loadingAdditionalData, setLoadingAdditionalData] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const highlightJSON = (json: string) => {
    try {
      JSON.parse(json);
      
      return json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
          let cls = 'text-orange-400';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'text-blue-400 font-semibold';
              return `<span class="${cls}">${match}</span>`;
            } else {
              cls = 'text-green-400';
              return `<span class="${cls}">${match}</span>`;
            }
          } else if (/true|false/.test(match)) {
            cls = 'text-purple-400 font-semibold';
          } else if (/null/.test(match)) {
            cls = 'text-red-400 font-semibold';
          }
          return `<span class="${cls}">${match}</span>`;
        });
    } catch (e) {
      return json;
    }
  };

  const searchUser = async () => {
    if (!userSearchValue.trim()) {
      setUserSearchError('Please enter a phone number or user ID');
      return;
    }

    setUserSearching(true);
    setUserSearchError(null);
    setUserData(null);

    try {
      const token = await getManagedToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers['x-jwt-token'] = token;
      }

      let userId = userSearchValue;

      if (userSearchType === 'phone') {
        const checkResponse = await axios.post(
          `${API_URL}/user-exists`,
          { phone: userSearchValue },
          { headers }
        );

        if (checkResponse.data.exists && checkResponse.data.userId) {
          userId = checkResponse.data.userId;
        } else {
          setUserSearchError('User not found with the provided phone number');
          setUserSearching(false);
          return;
        }
      }

      const userResponse = await axios.get(
        `${API_URL}/users/${userId}`,
        { headers }
      );

      setUserData(userResponse.data);
      
      // Fetch additional user data from new endpoints
      setLoadingAdditionalData(true);
      try {
        // Fetch all additional data in parallel
        const [interestsRes, stationsRes, imageRes, statusRes] = await Promise.allSettled([
          axios.get(`${API_URL}/users/${userId}/interests`, { headers }),
          axios.get(`${API_URL}/users/${userId}/favourite-stations`, { headers }),
          axios.get(`${API_URL}/users/${userId}/image`, { headers }),
          axios.get(`${API_URL}/user/profile-status/${userId}`, { headers }),
        ]);

        // Set data if requests succeeded
        if (interestsRes.status === 'fulfilled') {
          setUserInterests(interestsRes.value.data);
        }
        if (stationsRes.status === 'fulfilled') {
          setUserFavouriteStations(stationsRes.value.data);
        }
        if (imageRes.status === 'fulfilled') {
          setUserProfileImage(imageRes.value.data);
        }
        if (statusRes.status === 'fulfilled') {
          setUserProfileStatus(statusRes.value.data);
        }
      } catch (additionalErr) {
        console.warn('[UserManagement] Some additional data failed to load:', additionalErr);
      } finally {
        setLoadingAdditionalData(false);
      }
      
    } catch (err: any) {
      console.error('[UserManagement] Search failed:', err);
      if (axios.isAxiosError(err)) {
        setUserSearchError(err.response?.data?.message || err.message || 'Failed to fetch user data');
      } else {
        setUserSearchError('An unexpected error occurred');
      }
      setUserData(null);
      setUserInterests(null);
      setUserFavouriteStations(null);
      setUserProfileImage(null);
      setUserProfileStatus(null);
    } finally {
      setUserSearching(false);
    }
  };

  if (authLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access User Management</CardDescription>
          </CardHeader>
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

        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.2);
          border-radius: 3px;
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.4);
          border-radius: 3px;
        }
        
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.7);
        }
      `}</style>

      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Users className="h-10 w-10 text-primary" />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Search and view detailed user information
            </p>
          </div>
        </div>

        {/* Search Form */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg">Search User</CardTitle>
            <CardDescription>Enter a phone number or user ID to view user information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Type Toggle */}
            <div className="flex gap-2">
              <Button
                variant={userSearchType === 'phone' ? 'default' : 'outline'}
                onClick={() => {
                  setUserSearchType('phone');
                  setUserSearchValue('');
                  setUserData(null);
                  setUserSearchError(null);
                }}
                className="flex-1 gap-2"
              >
                <Phone className="h-4 w-4" />
                Phone Number
              </Button>
              <Button
                variant={userSearchType === 'userId' ? 'default' : 'outline'}
                onClick={() => {
                  setUserSearchType('userId');
                  setUserSearchValue('');
                  setUserData(null);
                  setUserSearchError(null);
                }}
                className="flex-1 gap-2"
              >
                <IdCard className="h-4 w-4" />
                User ID
              </Button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <Input
                placeholder={
                  userSearchType === 'phone'
                    ? 'Enter phone number (e.g., +15555550111)'
                    : 'Enter user ID'
                }
                value={userSearchValue}
                onChange={(e) => {
                  setUserSearchValue(e.target.value);
                  setUserSearchError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    searchUser();
                  }
                }}
                className="flex-1"
                disabled={userSearching}
              />
              <Button onClick={searchUser} disabled={userSearching} className="gap-2">
                {userSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Submit
                  </>
                )}
              </Button>
            </div>

            {/* Error Message */}
            {userSearchError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{userSearchError}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading Additional Data */}
        {loadingAdditionalData && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Loading additional user data...</p>
                <p className="text-xs text-muted-foreground">
                  Fetching interests, favourite stations, profile image, and completion status
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Data Display */}
        {userData && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <IdCard className="h-3 w-3" />
                    User ID
                  </p>
                  <p className="font-mono text-sm font-semibold">{userData.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Full Name
                  </p>
                  <p className="text-sm font-semibold">
                    {userData.firstName} {userData.lastName}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </p>
                  <p className="text-sm break-all">{userData.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </p>
                  <p className="text-sm font-mono">{userData.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Referral Code
                  </p>
                  <p className="text-sm font-mono font-semibold text-primary">
                    {userData.referralCode}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Reward Points
                  </p>
                  <p className="text-sm font-semibold">{userData.rewardPoints}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Settings2 className="h-3 w-3" />
                    Status
                  </p>
                  <Badge variant={userData.userStatus === 'active' ? 'default' : 'secondary'}>
                    {userData.userStatus}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Settings2 className="h-3 w-3" />
                    Role
                  </p>
                  <Badge variant="outline">{userData.userRole}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created At
                  </p>
                  <p className="text-sm">
                    {new Date(userData.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Updated At
                  </p>
                  <p className="text-sm">
                    {new Date(userData.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Energy Analytics */}
            {userData.energyAnalytics && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    Energy Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-muted-foreground">CO₂ Saved</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {userData.energyAnalytics.co2Saved.toFixed(2)} kg
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-muted-foreground">Trees Saved</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {userData.energyAnalytics.treesSaved.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-muted-foreground">Total Sessions</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {userData.energyAnalytics.totalSessions}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-muted-foreground">Energy (kWh)</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {userData.energyAnalytics.totalEnergyKWh.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notification Settings */}
            {userData.notificationSettings && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(userData.notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 rounded-lg border">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          value ? 'bg-green-500' : 'bg-gray-400'
                        )}
                      />
                      <p className="text-xs capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Profile Image */}
            {userProfileImage && userProfileImage.imageData && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Profile Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center p-6 bg-gradient-to-br from-slate-950 to-slate-900 rounded-lg border">
                    <div className="relative group">
                      <img 
                        src={`data:${userProfileImage.imageType};base64,${userProfileImage.imageData}`}
                        alt="User Profile"
                        className="max-w-xs max-h-80 rounded-lg shadow-2xl border-2 border-primary/20 group-hover:border-primary/40 transition-all"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end justify-center pb-4">
                        <Badge variant="secondary" className="backdrop-blur-sm">
                          {userProfileImage.imageType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profile Completion Status */}
            {userProfileStatus && userProfileStatus.profileStatus && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Profile Completion Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progress Overview */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold">Overall Progress</h4>
                      <p className="text-sm text-muted-foreground">Track profile setup completion</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">
                        {Math.round((userProfileStatus.profileStatus.totalScore / userProfileStatus.profileStatus.maxScore) * 100)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {userProfileStatus.profileStatus.totalScore} / {userProfileStatus.profileStatus.maxScore} points
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-1000"
                      style={{ width: `${(userProfileStatus.profileStatus.totalScore / userProfileStatus.profileStatus.maxScore) * 100}%` }}
                    />
                  </div>
                  
                  {/* Steps */}
                  <div className="space-y-2">
                    {userProfileStatus.profileStatus.steps.map((step: any) => (
                      <div 
                        key={step.stepKey}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all",
                          step.completed 
                            ? "bg-green-500/10 border-green-500/30" 
                            : "bg-muted/50 border-border"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                            step.completed 
                              ? "bg-green-500 text-white" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            {step.completed ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-bold">{step.weightage}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{step.description}</p>
                            {step.updatedAt && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Completed on {new Date(step.updatedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={step.completed ? "default" : "outline"} className="ml-2">
                          {step.weightage} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  {/* Additional Info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                    <span>Created: {new Date(userProfileStatus.profileStatus.createdAt).toLocaleDateString()}</span>
                    <span>Droplets seen: {userProfileStatus.profileStatus.hasSeenDroplets ? 'Yes' : 'No'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Interests from API */}
            {userInterests && userInterests.interests && userInterests.interests.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    User Interests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {userInterests.interests.map((interest: string) => (
                      <Badge key={interest} variant="secondary" className="capitalize">
                        {interest.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fallback to basic user data interests if API endpoint doesn't return */}
            {(!userInterests || !userInterests.interests) && userData.interests && userData.interests.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Interests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {userData.interests.map((interest: string) => (
                      <Badge key={interest} variant="secondary" className="capitalize">
                        {interest.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Favourite Stations from API */}
            {userFavouriteStations && userFavouriteStations.stations && userFavouriteStations.stations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Favourite Charging Stations
                  </CardTitle>
                  <CardDescription>
                    {userFavouriteStations.stations.length} favourite station{userFavouriteStations.stations.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {userFavouriteStations.stations.map((station: any) => (
                    <div 
                      key={station._id}
                      className="p-4 rounded-lg border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 hover:border-primary/50 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-primary">{station.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {station.address.line}, {station.address.city}, {station.address.state}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {station.address.pincode} • {station.phoneNumber}
                            </p>
                          </div>
                          <Badge 
                            variant={station.status === 'OPERATIONAL' ? 'default' : 'secondary'}
                            className="ml-2"
                          >
                            {station.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">Rating:</span>
                            <span className="text-yellow-500">★ {station.averageRating}/5</span>
                            <span>({station.totalRatings})</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">Connectors:</span>
                            <span>{station.connectors.length}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">Hours:</span>
                            <span>{station.workingHours.isOpen24x7 ? '24/7' : `${station.workingHours.open}-${station.workingHours.close}`}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">Booking:</span>
                            <span>{station.allowBooking ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                        
                        {station.connectors.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {station.connectors.map((connector: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {connector.connectorType} • {connector.powerKW}kW
                                {connector.available && <span className="ml-1 text-green-500">✓</span>}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {station.amenities && station.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground mr-1">Amenities:</span>
                            {station.amenities.map((amenity: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Vehicles */}
            {userData.vehicles && userData.vehicles.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    Vehicles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userData.vehicles.map((vehicleId: string, index: number) => (
                      <div
                        key={vehicleId}
                        className="p-3 rounded-lg border bg-muted/50 font-mono text-sm"
                      >
                        Vehicle {index + 1}: {vehicleId}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Favourite Stations */}
            {userData.favouriteStations && userData.favouriteStations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Favourite Stations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userData.favouriteStations.map((stationId: string, index: number) => (
                      <div
                        key={stationId}
                        className="p-3 rounded-lg border bg-muted/50 font-mono text-sm"
                      >
                        Station {index + 1}: {stationId}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* App Settings */}
            {userData.appSettings && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    App Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Display Mode</p>
                    <Badge>{userData.appSettings.displayMode}</Badge>
                  </div>
                  {userData.appSettings.locationAndData && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Location & Data</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full',
                              userData.appSettings.locationAndData.locationServices
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            )}
                          />
                          Location Services
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full',
                              userData.appSettings.locationAndData.dataSynchronization
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            )}
                          />
                          Data Sync
                        </div>
                      </div>
                    </div>
                  )}
                  {userData.appSettings.chargingPreferences && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Charging Preferences</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full',
                              userData.appSettings.chargingPreferences.autoConnectToStations
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            )}
                          />
                          Auto Connect
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg border text-sm">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full',
                              userData.appSettings.chargingPreferences.saveChargingHistory
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            )}
                          />
                          Save History
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Raw JSON Response */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-primary" />
                    Raw JSON Response
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(userData, null, 2), 'userdata')}
                    className="gap-2"
                  >
                    {copied === 'userdata' ? (
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
              </CardHeader>
              <CardContent>
                <div className="relative rounded-lg border border-border bg-slate-950 overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-900/50 border-r border-border p-4 text-right select-none overflow-hidden custom-scrollbar-thin">
                    {JSON.stringify(userData, null, 2).split('\n').map((_, i) => (
                      <div key={i} className="font-mono text-xs text-slate-500 leading-6">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <pre className="w-full max-h-96 pl-16 pr-4 py-4 font-mono text-sm text-slate-200 overflow-auto leading-6 custom-scrollbar">
                    <code 
                      dangerouslySetInnerHTML={{ 
                        __html: highlightJSON(JSON.stringify(userData, null, 2))
                      }}
                    />
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

