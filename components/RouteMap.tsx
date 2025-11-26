"use client";

import { useEffect, Fragment } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { decode } from "@mapbox/polyline";

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});


interface RouteData {
  _id?: string;
  apiResponse?: {
    input?: {
      from?: { lat: number; lng: number; address?: string };
      to?: { lat: number; lng: number; address?: string };
    };
    routeAnalyses?: Array<{
      route?: {
        routePolyline?: string;
        distanceKm?: number;
      };
      chargeStops?: Array<{
        location?: { lat: number; lng: number };
        batteryLevel?: number;
        estimatedChargingTime?: number;
        bestStation?: {
          name?: string;
          address?: string;
        };
      }>;
    }>;
  };
}

interface RouteMapProps {
  routes: RouteData[];
}

// Component to fit map bounds to show all routes
function FitBounds({ routes }: { routes: RouteData[] }) {
  const map = useMap();

  useEffect(() => {
    if (routes.length === 0) {
      // Default to India center and zoom
      map.setView([20.5937, 78.9629], 5);
      return;
    }

    const bounds: L.LatLngExpression[] = [];

    routes.forEach((route) => {
      const from = route?.apiResponse?.input?.from;
      const to = route?.apiResponse?.input?.to;
      const routeAnalysis = route?.apiResponse?.routeAnalyses?.[0];

      if (from) bounds.push([from.lat, from.lng]);
      if (to) bounds.push([to.lat, to.lng]);

      // Add charging stations
      routeAnalysis?.chargeStops?.forEach((stop) => {
        if (stop.location) {
          bounds.push([stop.location.lat, stop.location.lng]);
        }
      });

      // Decode polyline and add sample points for bounds
      if (routeAnalysis?.route?.routePolyline) {
        try {
          const decoded = decode(routeAnalysis.route.routePolyline);
          // Sample every 20th point for bounds calculation to avoid too many points
          decoded.forEach((point, index) => {
            if (index % 20 === 0) {
              bounds.push([point[0], point[1]]);
            }
          });
        } catch (e) {
          console.error("Error decoding polyline:", e);
        }
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, {
        padding: [50, 50],
        maxZoom: 8,
      });
    } else {
      // Default to India center if no bounds
      map.setView([20.5937, 78.9629], 5);
    }
  }, [routes, map]);

  return null;
}

export default function RouteMap({ routes }: RouteMapProps) {
  const routeColors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
  ];

  if (routes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/30 rounded-lg">
        <p className="text-muted-foreground text-sm">No routes to display</p>
      </div>
    );
  }

  return (
    <>
      <div 
        className="h-full w-full rounded-lg overflow-hidden border border-border" 
        style={{ position: 'relative', minHeight: '400px' }}
      >
        <MapContainer
        center={[20.5937, 78.9629]} // Center of India
        zoom={5}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        scrollWheelZoom={true}
        whenCreated={(map) => {
          // Ensure map is properly initialized
          setTimeout(() => {
            map.invalidateSize();
          }, 100);
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds routes={routes} />

        {routes.map((route, routeIndex) => {
          const routeId = route._id || `route-${routeIndex}`;
          const routeAnalysis = route?.apiResponse?.routeAnalyses?.[0];
          const from = route?.apiResponse?.input?.from;
          const to = route?.apiResponse?.input?.to;
          const polyline = routeAnalysis?.route?.routePolyline;
          const color = routeColors[routeIndex % routeColors.length];

          let polylinePoints: [number, number][] = [];

          if (polyline) {
            try {
              const decoded = decode(polyline);
              polylinePoints = decoded.map((point) => [point[0], point[1]]);
            } catch (e) {
              console.error("Error decoding polyline:", e);
            }
          }

          return (
            <Fragment key={routeId}>
              {/* Route Polyline */}
              {polylinePoints.length > 0 && (
                <Polyline
                  key={`${routeId}-polyline`}
                  positions={polylinePoints}
                  pathOptions={{
                    color,
                    weight: 4,
                    opacity: 0.7,
                  }}
                />
              )}
            </Fragment>
          );
        })}
        </MapContainer>
      </div>
    </>
  );
}
