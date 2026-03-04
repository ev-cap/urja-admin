"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Car,
    Bike,
    Plus,
    Loader2,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Battery,
    Zap,
    Gauge,
    Plug,
    Home,
    Timer,
    MapPin,
    X,
    Search,
    Filter,
    LayoutGrid,
    List,
    RefreshCcw,
    Trash2,
    Image as ImageIcon,
} from "lucide-react";
import axios from "axios";
import { getManagedToken } from "@/lib/auth/tokenManager";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Vehicle type options
const VEHICLE_TYPES = [
    { value: "car", label: "Car", icon: Car },
    { value: "bike", label: "Bike", icon: Bike },
    { value: "scooter", label: "Scooter", icon: Bike },
];

// Initial form state
const INITIAL_FORM_STATE = {
    title: "",
    vehicleType: "",
    make: "",
    model: "",
    variant: "",
    launch: "",
    imgurl: "",
    specifications: {
        batteryCapacityKWh: 0,
        fastCharging: false,
        motorPowerKW: 0,
        chargingPort: "",
        chargingAtHome: false,
        chargingAtStation: false,
    },
    charging: {
        chargingTime: "",
        chargingTime0To80: "",
        chargingTime0To100: "",
        chargingTimeAC: "",
        chargingTimeDC: "",
    },
    range: {
        rangeKm: 0,
        rangeKmEcoMode: 0,
        rangeKmNormalMode: 0,
        rangeKmSportMode: 0,
    },
};

type VehicleFormState = typeof INITIAL_FORM_STATE;

interface MetaVehicle {
    id: string;
    title: string;
    vehicleType: string;
    make: string;
    model: string;
    variant: string;
    launch: string;
    imgurl: string;
    specifications: {
        batteryCapacityKWh: number;
        fastCharging: boolean;
        motorPowerKW?: number;
        chargingPort?: string;
        chargingAtHome?: boolean;
        chargingAtStation?: boolean;
    };
    charging: {
        chargingTime?: string;
        chargingTime0To80?: string;
        chargingTime0To100?: string;
        chargingTimeAC?: string;
        chargingTimeDC?: string;
    };
    range: {
        rangeKm: number;
        rangeKmEcoMode?: number;
        rangeKmNormalMode?: number;
        rangeKmSportMode?: number;
    };
}

export default function MetaVehiclesPage() {
    const { isLoading: authLoading, isAuthenticated } = useAuthContext();

    // Form state
    const [formData, setFormData] = useState<VehicleFormState>(
        JSON.parse(JSON.stringify(INITIAL_FORM_STATE))
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    // Delete state
    const [deleteConfirmVehicle, setDeleteConfirmVehicle] = useState<MetaVehicle | null>(null);

    // List state
    const [vehicles, setVehicles] = useState<MetaVehicle[]>([]);
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Collapsible sections in form
    const [expandedSections, setExpandedSections] = useState({
        basic: true,
        specifications: true,
        charging: false,
        range: false,
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    // Fetch vehicles
    const fetchVehicles = useCallback(async () => {
        setIsLoadingVehicles(true);
        setLoadError(null);
        try {
            const token = await getManagedToken();
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
                headers["x-jwt-token"] = token;
            }

            const response = await axios.get(`${API_URL}/meta/vehicles`, {
                headers,
            });
            setVehicles(response.data.vehicles || []);
        } catch (err: any) {
            console.error("[MetaVehicles] Failed to fetch vehicles:", err);
            setLoadError(
                axios.isAxiosError(err)
                    ? err.response?.data?.message || err.message || "Failed to load vehicles"
                    : "An unexpected error occurred"
            );
        } finally {
            setIsLoadingVehicles(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchVehicles();
        }
    }, [isAuthenticated, fetchVehicles]);

    // Handle form field changes
    const handleChange = (
        field: string,
        value: string | number | boolean,
        section?: "specifications" | "charging" | "range"
    ) => {
        setFormError(null);
        setFormSuccess(null);

        if (section) {
            setFormData((prev) => ({
                ...prev,
                [section]: {
                    ...(prev[section] as Record<string, unknown>),
                    [field]: value,
                },
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [field]: value,
            }));
        }
    };

    // Auto-generate title from make + model + variant
    useEffect(() => {
        const { make, model, variant } = formData;
        if (make || model || variant) {
            const title = [make, model, variant].filter(Boolean).join(" ");
            setFormData((prev) => ({ ...prev, title }));
        }
    }, [formData.make, formData.model, formData.variant]);

    // Submit form
    const handleSubmit = async () => {
        // Validation
        if (!formData.vehicleType) {
            setFormError("Please select a vehicle type");
            return;
        }
        if (!formData.make.trim()) {
            setFormError("Please enter the manufacturer name");
            return;
        }
        if (!formData.model.trim()) {
            setFormError("Please enter the model name");
            return;
        }
        if (!formData.title.trim()) {
            setFormError("Please enter a display title");
            return;
        }

        setIsSubmitting(true);
        setFormError(null);
        setFormSuccess(null);

        try {
            const token = await getManagedToken();
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
                headers["x-jwt-token"] = token;
            }

            const response = await axios.post(`${API_URL}/meta/vehicles`, formData, {
                headers,
            });

            setFormSuccess(
                `Vehicle "${response.data.title || formData.title}" added successfully!`
            );
            toast.success("Meta vehicle created successfully!");

            // Reset form
            setFormData(JSON.parse(JSON.stringify(INITIAL_FORM_STATE)));

            // Refresh vehicles list
            fetchVehicles();

            // Collapse add form after success
            setTimeout(() => {
                setShowAddForm(false);
                setFormSuccess(null);
            }, 2000);
        } catch (err: any) {
            console.error("[MetaVehicles] Failed to add vehicle:", err);
            const errorMsg = axios.isAxiosError(err)
                ? err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Failed to add vehicle"
                : "An unexpected error occurred";
            setFormError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete vehicle (optimistic)
    const handleDelete = (vehicle: MetaVehicle) => {
        // Save a snapshot for rollback
        const previousVehicles = [...vehicles];

        // Optimistically remove from UI immediately
        setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
        setDeleteConfirmVehicle(null);
        toast.success(`"${vehicle.title}" deleted successfully!`);

        // Fire the API call in the background
        (async () => {
            try {
                const token = await getManagedToken();
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                };
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                    headers["x-jwt-token"] = token;
                }

                await axios.delete(`${API_URL}/meta/vehicles/${vehicle.id}`, {
                    headers,
                });
            } catch (err: any) {
                console.error("[MetaVehicles] Failed to delete vehicle:", err);
                const errorMsg = axios.isAxiosError(err)
                    ? err.response?.data?.message ||
                    err.response?.data?.error ||
                    err.message ||
                    "Failed to delete vehicle"
                    : "An unexpected error occurred";

                // Revert the optimistic removal
                setVehicles(previousVehicles);
                toast.error(`Delete failed: ${errorMsg}`);
            }
        })();
    };

    // Filter vehicles
    const filteredVehicles = vehicles.filter((v) => {
        const matchesSearch =
            !searchQuery ||
            v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.model.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || v.vehicleType === filterType;
        return matchesSearch && matchesType;
    });

    // Count by type
    const vehicleCounts = {
        all: vehicles.length,
        car: vehicles.filter((v) => v.vehicleType === "car").length,
        bike: vehicles.filter((v) => v.vehicleType === "bike").length,
        scooter: vehicles.filter((v) => v.vehicleType === "scooter").length,
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Authentication Required</CardTitle>
                        <CardDescription>
                            Please sign in to access Meta Vehicles
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (authLoading) {
        return (
            <div className="space-y-6 pb-8">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-64" />
                        <Skeleton className="h-5 w-96" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-64 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Car className="h-10 w-10 text-primary" />
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Meta Vehicles</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage EV vehicle metadata — add new vehicles and view existing
                            entries
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchVehicles}
                        disabled={isLoadingVehicles}
                        className="gap-2"
                    >
                        <RefreshCcw
                            className={cn("h-4 w-4", isLoadingVehicles && "animate-spin")}
                        />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => {
                            setShowAddForm(!showAddForm);
                            setFormError(null);
                            setFormSuccess(null);
                        }}
                        className="gap-2"
                    >
                        {showAddForm ? (
                            <>
                                <X className="h-4 w-4" />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                Add Vehicle
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    {
                        label: "Total",
                        count: vehicleCounts.all,
                        color: "from-blue-500/20 to-purple-500/20 border-blue-500/30",
                        textColor: "text-blue-600 dark:text-blue-400",
                    },
                    {
                        label: "Cars",
                        count: vehicleCounts.car,
                        color:
                            "from-emerald-500/20 to-green-500/20 border-emerald-500/30",
                        textColor: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                        label: "Bikes",
                        count: vehicleCounts.bike,
                        color:
                            "from-orange-500/20 to-amber-500/20 border-orange-500/30",
                        textColor: "text-orange-600 dark:text-orange-400",
                    },
                    {
                        label: "Scooters",
                        count: vehicleCounts.scooter,
                        color: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
                        textColor: "text-pink-600 dark:text-pink-400",
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className={cn(
                            "p-4 rounded-xl bg-gradient-to-br border transition-all hover:scale-[1.02]",
                            stat.color
                        )}
                    >
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                            {stat.label}
                        </p>
                        <p className={cn("text-2xl font-bold mt-1", stat.textColor)}>
                            {stat.count}
                        </p>
                    </div>
                ))}
            </div>

            {/* Add Vehicle Form */}
            {showAddForm && (
                <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent animate-in fade-in slide-in-from-top-4 duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Add New Meta Vehicle
                        </CardTitle>
                        <CardDescription>
                            Fill in the vehicle details below. Fields marked with * are
                            required.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Basic Information Section */}
                        <div className="space-y-4">
                            <button
                                onClick={() => toggleSection("basic")}
                                className="flex items-center justify-between w-full text-left"
                            >
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Car className="h-5 w-5 text-primary" />
                                    Basic Information
                                </h3>
                                {expandedSections.basic ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                            </button>

                            {expandedSections.basic && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    {/* Vehicle Type Selection */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Vehicle Type <span className="text-destructive">*</span>
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {VEHICLE_TYPES.map((type) => {
                                                const Icon = type.icon;
                                                const isSelected =
                                                    formData.vehicleType === type.value;
                                                return (
                                                    <button
                                                        key={type.value}
                                                        type="button"
                                                        onClick={() =>
                                                            handleChange("vehicleType", type.value)
                                                        }
                                                        className={cn(
                                                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                                            isSelected
                                                                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                                                                : "border-border hover:border-primary/50 hover:bg-accent"
                                                        )}
                                                    >
                                                        <Icon
                                                            className={cn(
                                                                "h-8 w-8",
                                                                isSelected
                                                                    ? "text-primary"
                                                                    : "text-muted-foreground"
                                                            )}
                                                        />
                                                        <span
                                                            className={cn(
                                                                "text-sm font-medium",
                                                                isSelected
                                                                    ? "text-primary"
                                                                    : "text-muted-foreground"
                                                            )}
                                                        >
                                                            {type.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Make, Model, Variant */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">
                                                Manufacturer (Make){" "}
                                                <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                                placeholder="e.g. Tata, Hyundai, Ather"
                                                value={formData.make}
                                                onChange={(e) => handleChange("make", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">
                                                Model <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                                placeholder="e.g. Nexon EV, Creta Electric"
                                                value={formData.model}
                                                onChange={(e) => handleChange("model", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">
                                                Variant
                                            </label>
                                            <Input
                                                placeholder="e.g. Adventure, Pro Pack"
                                                value={formData.variant}
                                                onChange={(e) =>
                                                    handleChange("variant", e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Title (auto-generated) */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Display Title{" "}
                                            <span className="text-destructive">*</span>
                                            <span className="text-xs text-muted-foreground ml-2">
                                                (auto-generated from Make + Model + Variant)
                                            </span>
                                        </label>
                                        <Input
                                            placeholder="e.g. Tata Nexon EV Adventure"
                                            value={formData.title}
                                            onChange={(e) => handleChange("title", e.target.value)}
                                        />
                                    </div>

                                    {/* Launch & Image URL */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground">
                                                Launch Date/Period
                                            </label>
                                            <Input
                                                placeholder="e.g. Jun 2025, Q3 2025"
                                                value={formData.launch}
                                                onChange={(e) =>
                                                    handleChange("launch", e.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-foreground flex items-center gap-1">
                                                <ImageIcon className="h-3 w-3" /> Image URL
                                            </label>
                                            <Input
                                                placeholder="https://example.com/vehicle-image.jpg"
                                                value={formData.imgurl}
                                                onChange={(e) =>
                                                    handleChange("imgurl", e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Image Preview */}
                                    {formData.imgurl && (
                                        <div className="flex items-center gap-4 p-3 rounded-xl border bg-muted/30">
                                            <img
                                                src={formData.imgurl}
                                                alt="Vehicle preview"
                                                className="w-24 h-16 object-cover rounded-lg border"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />
                                            <p className="text-xs text-muted-foreground truncate flex-1">
                                                {formData.imgurl}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Specifications Section */}
                        <div className="space-y-4 border-t pt-4">
                            <button
                                onClick={() => toggleSection("specifications")}
                                className="flex items-center justify-between w-full text-left"
                            >
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Battery className="h-5 w-5 text-green-500" />
                                    Specifications
                                </h3>
                                {expandedSections.specifications ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                            </button>

                            {expandedSections.specifications && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-1">
                                                <Battery className="h-3 w-3" /> Battery Capacity (kWh)
                                            </label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                placeholder="e.g. 45.0"
                                                value={
                                                    formData.specifications.batteryCapacityKWh || ""
                                                }
                                                onChange={(e) =>
                                                    handleChange(
                                                        "batteryCapacityKWh",
                                                        parseFloat(e.target.value) || 0,
                                                        "specifications"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-1">
                                                <Gauge className="h-3 w-3" /> Motor Power (kW)
                                            </label>
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 110"
                                                value={formData.specifications.motorPowerKW || ""}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "motorPowerKW",
                                                        parseInt(e.target.value) || 0,
                                                        "specifications"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-1">
                                                <Plug className="h-3 w-3" /> Charging Port
                                            </label>
                                            <Input
                                                placeholder="e.g. CCS-II, TYPE-II"
                                                value={formData.specifications.chargingPort}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "chargingPort",
                                                        e.target.value,
                                                        "specifications"
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Toggle switches */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                                            <label className="text-sm font-medium flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-yellow-500" />
                                                Fast Charging
                                            </label>
                                            <Switch
                                                checked={formData.specifications.fastCharging}
                                                onCheckedChange={(checked) =>
                                                    handleChange(
                                                        "fastCharging",
                                                        checked,
                                                        "specifications"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                                            <label className="text-sm font-medium flex items-center gap-2">
                                                <Home className="h-4 w-4 text-blue-500" />
                                                Charging at Home
                                            </label>
                                            <Switch
                                                checked={formData.specifications.chargingAtHome}
                                                onCheckedChange={(checked) =>
                                                    handleChange(
                                                        "chargingAtHome",
                                                        checked,
                                                        "specifications"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                                            <label className="text-sm font-medium flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-emerald-500" />
                                                Charging at Station
                                            </label>
                                            <Switch
                                                checked={formData.specifications.chargingAtStation}
                                                onCheckedChange={(checked) =>
                                                    handleChange(
                                                        "chargingAtStation",
                                                        checked,
                                                        "specifications"
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Charging Section */}
                        <div className="space-y-4 border-t pt-4">
                            <button
                                onClick={() => toggleSection("charging")}
                                className="flex items-center justify-between w-full text-left"
                            >
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Timer className="h-5 w-5 text-blue-500" />
                                    Charging Times
                                </h3>
                                {expandedSections.charging ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                            </button>

                            {expandedSections.charging && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Charging Time (General)
                                            </label>
                                            <Input
                                                placeholder="e.g. 40Min-60kW-(10-80%)"
                                                value={formData.charging.chargingTime}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "chargingTime",
                                                        e.target.value,
                                                        "charging"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                0 to 80% Charging Time
                                            </label>
                                            <Input
                                                placeholder="e.g. 3 Hrs"
                                                value={formData.charging.chargingTime0To80}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "chargingTime0To80",
                                                        e.target.value,
                                                        "charging"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                0 to 100% Charging Time
                                            </label>
                                            <Input
                                                placeholder="e.g. 5 Hrs"
                                                value={formData.charging.chargingTime0To100}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "chargingTime0To100",
                                                        e.target.value,
                                                        "charging"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                AC Charging Time
                                            </label>
                                            <Input
                                                placeholder="e.g. 6.5H-7.2kW-(10-100%)"
                                                value={formData.charging.chargingTimeAC}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "chargingTimeAC",
                                                        e.target.value,
                                                        "charging"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                DC Charging Time
                                            </label>
                                            <Input
                                                placeholder="e.g. 40Min-60kW-(10-80%)"
                                                value={formData.charging.chargingTimeDC}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "chargingTimeDC",
                                                        e.target.value,
                                                        "charging"
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Range Section */}
                        <div className="space-y-4 border-t pt-4">
                            <button
                                onClick={() => toggleSection("range")}
                                className="flex items-center justify-between w-full text-left"
                            >
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Gauge className="h-5 w-5 text-purple-500" />
                                    Range
                                </h3>
                                {expandedSections.range ? (
                                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                            </button>

                            {expandedSections.range && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Range (km)</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 430"
                                                value={formData.range.rangeKm || ""}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "rangeKm",
                                                        parseInt(e.target.value) || 0,
                                                        "range"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Eco Mode (km)
                                            </label>
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 500"
                                                value={formData.range.rangeKmEcoMode || ""}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "rangeKmEcoMode",
                                                        parseInt(e.target.value) || 0,
                                                        "range"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Normal Mode (km)
                                            </label>
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 400"
                                                value={formData.range.rangeKmNormalMode || ""}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "rangeKmNormalMode",
                                                        parseInt(e.target.value) || 0,
                                                        "range"
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Sport Mode (km)
                                            </label>
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="e.g. 350"
                                                value={formData.range.rangeKmSportMode || ""}
                                                onChange={(e) =>
                                                    handleChange(
                                                        "rangeKmSportMode",
                                                        parseInt(e.target.value) || 0,
                                                        "range"
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error & Success Messages */}
                        {formError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in duration-200">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <p className="text-sm">{formError}</p>
                            </div>
                        )}

                        {formSuccess && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 animate-in fade-in duration-200">
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                <p className="text-sm">{formSuccess}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="gap-2 flex-1 md:flex-none md:min-w-[200px]"
                                size="lg"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating Vehicle...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" />
                                        Create Meta Vehicle
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFormData(JSON.parse(JSON.stringify(INITIAL_FORM_STATE)));
                                    setFormError(null);
                                    setFormSuccess(null);
                                }}
                                size="lg"
                            >
                                Reset
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Vehicles List Section */}
            <Card className="border-2">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <LayoutGrid className="h-5 w-5 text-primary" />
                                All Meta Vehicles
                            </CardTitle>
                            <CardDescription>
                                {filteredVehicles.length} of {vehicles.length} vehicles
                                {searchQuery && ` matching "${searchQuery}"`}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={viewMode === "grid" ? "default" : "outline"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode("grid")}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "default" : "outline"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewMode("list")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title, make, or model..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {(
                                [
                                    { key: "all", label: "All" },
                                    { key: "car", label: "Cars" },
                                    { key: "bike", label: "Bikes" },
                                    { key: "scooter", label: "Scooters" },
                                ] as const
                            ).map((filter) => (
                                <Button
                                    key={filter.key}
                                    variant={filterType === filter.key ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setFilterType(filter.key)}
                                    className="gap-1"
                                >
                                    <Filter className="h-3 w-3" />
                                    {filter.label}
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 h-5 px-1.5 text-[10px]"
                                    >
                                        {vehicleCounts[filter.key]}
                                    </Badge>
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoadingVehicles ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-72 rounded-xl" />
                            ))}
                        </div>
                    ) : loadError ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <AlertCircle className="h-12 w-12 text-destructive/50" />
                            <p className="text-muted-foreground">{loadError}</p>
                            <Button variant="outline" onClick={fetchVehicles} className="gap-2">
                                <RefreshCcw className="h-4 w-4" />
                                Retry
                            </Button>
                        </div>
                    ) : filteredVehicles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Car className="h-12 w-12 text-muted-foreground/30" />
                            <p className="text-muted-foreground">
                                {searchQuery || filterType !== "all"
                                    ? "No vehicles match your search criteria"
                                    : "No meta vehicles found. Add one to get started!"}
                            </p>
                        </div>
                    ) : viewMode === "grid" ? (
                        /* Grid View */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredVehicles.map((vehicle) => (
                                <VehicleCard key={vehicle.id} vehicle={vehicle} onDelete={setDeleteConfirmVehicle} />
                            ))}
                        </div>
                    ) : (
                        /* List View */
                        <div className="space-y-3">
                            {filteredVehicles.map((vehicle) => (
                                <VehicleListItem key={vehicle.id} vehicle={vehicle} onDelete={setDeleteConfirmVehicle} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmVehicle} onOpenChange={(open) => !open && setDeleteConfirmVehicle(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Delete Vehicle
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to delete this meta vehicle? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {deleteConfirmVehicle && (
                        <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
                            {deleteConfirmVehicle.imgurl ? (
                                <img
                                    src={deleteConfirmVehicle.imgurl}
                                    alt={deleteConfirmVehicle.title}
                                    className="w-16 h-12 object-cover rounded-lg border"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                />
                            ) : (
                                <div className="w-16 h-12 rounded-lg bg-muted flex items-center justify-center">
                                    <Car className="h-6 w-6 text-muted-foreground/30" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{deleteConfirmVehicle.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {deleteConfirmVehicle.make} • {deleteConfirmVehicle.model}
                                    {deleteConfirmVehicle.variant ? ` • ${deleteConfirmVehicle.variant}` : ""}
                                </p>
                            </div>
                            <Badge className="capitalize text-[10px] flex-shrink-0">{deleteConfirmVehicle.vehicleType}</Badge>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmVehicle(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirmVehicle && handleDelete(deleteConfirmVehicle)}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Vehicle
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Vehicle Grid Card Component
function VehicleCard({ vehicle, onDelete }: { vehicle: MetaVehicle; onDelete: (v: MetaVehicle) => void }) {
    const typeColors: Record<string, string> = {
        car: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        bike: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
        scooter:
            "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30",
    };

    return (
        <div className="group relative rounded-xl border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
            {/* Vehicle Image */}
            <div className="relative h-40 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                {vehicle.imgurl ? (
                    <img
                        src={vehicle.imgurl}
                        alt={vehicle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Car className="h-16 w-16 text-muted-foreground/20" />
                    </div>
                )}
                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                    <Badge
                        className={cn(
                            "capitalize font-medium border",
                            typeColors[vehicle.vehicleType] || ""
                        )}
                    >
                        {vehicle.vehicleType}
                    </Badge>
                </div>
                {/* Fast Charging Badge */}
                {vehicle.specifications?.fastCharging && (
                    <div className="absolute top-3 right-3">
                        <Badge className="bg-yellow-500/90 text-yellow-950 border-yellow-600/30 gap-1">
                            <Zap className="h-3 w-3" />
                            Fast
                        </Badge>
                    </div>
                )}
            </div>

            {/* Vehicle Info */}
            <div className="p-4 space-y-3">
                <div>
                    <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {vehicle.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {vehicle.make} • {vehicle.model}
                        {vehicle.variant ? ` • ${vehicle.variant}` : ""}
                    </p>
                </div>

                {/* Key Specs */}
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                        <Battery className="h-3 w-3 mx-auto text-green-500 mb-1" />
                        <p className="text-xs font-bold">
                            {vehicle.specifications?.batteryCapacityKWh || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">kWh</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                        <Gauge className="h-3 w-3 mx-auto text-blue-500 mb-1" />
                        <p className="text-xs font-bold">
                            {vehicle.range?.rangeKm || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">km</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                        <Zap className="h-3 w-3 mx-auto text-purple-500 mb-1" />
                        <p className="text-xs font-bold">
                            {vehicle.specifications?.motorPowerKW || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">kW</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-[10px] text-muted-foreground">
                        {vehicle.launch || "TBA"}
                    </p>
                    <div className="flex items-center gap-1.5">
                        {vehicle.specifications?.chargingPort && (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                <Plug className="h-2.5 w-2.5 mr-0.5" />
                                {vehicle.specifications.chargingPort}
                            </Badge>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(vehicle);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete vehicle"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Vehicle List Item Component
function VehicleListItem({ vehicle, onDelete }: { vehicle: MetaVehicle; onDelete: (v: MetaVehicle) => void }) {
    const typeColors: Record<string, string> = {
        car: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
        bike: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
        scooter:
            "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30",
    };

    return (
        <div className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200">
            {/* Image */}
            <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {vehicle.imgurl ? (
                    <img
                        src={vehicle.imgurl}
                        alt={vehicle.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <Car className="h-6 w-6 text-muted-foreground/20" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {vehicle.title}
                    </h3>
                    <Badge
                        className={cn(
                            "capitalize text-[10px] h-5 px-1.5 border flex-shrink-0",
                            typeColors[vehicle.vehicleType] || ""
                        )}
                    >
                        {vehicle.vehicleType}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {vehicle.make} • {vehicle.model}
                    {vehicle.variant ? ` • ${vehicle.variant}` : ""} •{" "}
                    {vehicle.launch || "TBA"}
                </p>
            </div>

            {/* Specs */}
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                <div className="flex items-center gap-1">
                    <Battery className="h-3 w-3 text-green-500" />
                    <span className="font-medium">
                        {vehicle.specifications?.batteryCapacityKWh || "—"} kWh
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Gauge className="h-3 w-3 text-blue-500" />
                    <span className="font-medium">
                        {vehicle.range?.rangeKm || "—"} km
                    </span>
                </div>
                {vehicle.specifications?.fastCharging && (
                    <Badge className="bg-yellow-500/90 text-yellow-950 border-yellow-600/30 gap-1 h-5 text-[10px]">
                        <Zap className="h-2.5 w-2.5" />
                        Fast
                    </Badge>
                )}
                {vehicle.specifications?.chargingPort && (
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {vehicle.specifications.chargingPort}
                    </Badge>
                )}
            </div>

            {/* Delete Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(vehicle);
                }}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                title="Delete vehicle"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}
