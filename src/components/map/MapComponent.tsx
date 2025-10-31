import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Google Maps API Key - In production, this should be in environment variables
const GOOGLE_MAPS_API_KEY = "AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8";

interface MapComponentProps {
  area: string;
  trafficLevel?: "clear" | "moderate" | "heavy";
  latitude?: number;
  longitude?: number;
}

// Declare google maps types
declare global {
  interface Window {
    google: typeof google | undefined;
  }
}

export const MapComponent = ({ area, trafficLevel = "moderate", latitude, longitude }: MapComponentProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    loadGoogleMapsScript();
  }, []);

  const loadGoogleMapsScript = useCallback(() => {
    // Check if script is already loaded
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => setMapLoaded(true));
      return;
    }

    // Load script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => setMapLoaded(true));
    script.addEventListener("error", () => {
      setMapError(true);
      toast.error("Failed to load Google Maps");
    });
    document.head.appendChild(script);
  }, []);

  const initializeMap = useCallback(async () => {
    if (!mapRef.current || !window.google) return;

    try {
      const sanitizedArea = area.replace(/[<>"']/g, "");
      
      // Use provided coordinates if available, otherwise use geocoding
      if (latitude && longitude) {
        // Use direct coordinates from backend
        const location = { lat: latitude, lng: longitude };

        // Initialize map
        const map = new window.google.maps.Map(mapRef.current, {
          center: location,
          zoom: 15,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        googleMapRef.current = map;

        // Add marker
        new window.google.maps.Marker({
          position: location,
          map: map,
          title: sanitizedArea,
          animation: window.google.maps.Animation.DROP,
        });

        // Add traffic layer
        const trafficLayer = new window.google.maps.TrafficLayer();
        trafficLayer.setMap(map);
      } else {
        // Fallback to geocoding if coordinates not provided
        const geocoder = new window.google.maps.Geocoder();
        const query = `${sanitizedArea}, Mysore, Karnataka, India`;

        geocoder.geocode({ address: query }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          if (status === "OK" && results && results[0] && mapRef.current) {
            const location = results[0].geometry.location;

            // Initialize map
            const map = new window.google.maps.Map(mapRef.current, {
              center: location,
              zoom: 15,
              mapTypeControl: true,
              streetViewControl: true,
              fullscreenControl: true,
              zoomControl: true,
            });

            googleMapRef.current = map;

            // Add marker
            new window.google.maps.Marker({
              position: location,
              map: map,
              title: sanitizedArea,
              animation: window.google.maps.Animation.DROP,
            });

            // Add traffic layer
            const trafficLayer = new window.google.maps.TrafficLayer();
            trafficLayer.setMap(map);
          } else {
            console.error("Geocoding failed:", status);
            setMapError(true);
          }
        });
      }
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError(true);
    }
  }, [area, latitude, longitude]);

  useEffect(() => {
    loadGoogleMapsScript();
  }, [loadGoogleMapsScript]);

  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      // Re-initialize map when area or coordinates change
      googleMapRef.current = null;
      initializeMap();
    }
  }, [mapLoaded, initializeMap]);

  const handleMapClick = () => {
    // Sanitize input to prevent XSS
    const sanitizedArea = area.replace(/[<>"']/g, "");
    const query = encodeURIComponent(`${sanitizedArea}, Mysore, Karnataka, India`);
    window.open(
      `https://www.google.com/maps/search/${query}`,
      "_blank",
      "noopener,noreferrer"
    );
    toast.success("Opening in Google Maps");
  };

  const getTrafficColor = () => {
    switch (trafficLevel) {
      case "clear":
        return "bg-traffic-clear/20 border-traffic-clear";
      case "moderate":
        return "bg-traffic-moderate/20 border-traffic-moderate";
      case "heavy":
        return "bg-traffic-heavy/20 border-traffic-heavy";
    }
  };

  return (
    <div className="relative">
      <div
        className={`
          relative rounded-lg border-2 transition-all duration-300 overflow-hidden
          ${getTrafficColor()}
          ${isHovered ? "border-primary shadow-lg" : ""}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Google Map or Loading State */}
        {!mapLoaded || mapError ? (
          <div
            className="h-64 md:h-80 bg-muted/50 cursor-pointer group relative"
            onClick={handleMapClick}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              {!mapLoaded && !mapError ? (
                <>
                  <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Loading Google Maps...
                  </p>
                </>
              ) : (
                <>
                  <MapPin className="w-16 h-16 text-primary animate-bounce" />
                  <div className="text-center">
                    <p className="text-lg font-semibold mb-2 capitalize">{area}</p>
                    <p className="text-sm text-muted-foreground">
                      Click to view in Google Maps
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="group-hover:scale-105 transition-transform"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Google Maps
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Google Map Container */}
            <div ref={mapRef} className="h-64 md:h-80 w-full" />
            
            {/* Open in new tab button overlay */}
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 left-4 shadow-lg"
              onClick={handleMapClick}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Full Map
            </Button>
          </>
        )}

        {/* Traffic Level Badge */}
        <Badge
          className="absolute top-4 right-4 capitalize z-10"
          variant={
            trafficLevel === "clear"
              ? "default"
              : trafficLevel === "moderate"
              ? "secondary"
              : "destructive"
          }
        >
          {trafficLevel} Traffic
        </Badge>
      </div>

      {/* Map Info */}
      <div className="mt-3 text-xs text-muted-foreground text-center">
        Interactive map powered by Google Maps • {mapLoaded && !mapError ? "Live traffic layer enabled" : "Click to explore"}
      </div>
    </div>
  );
};
