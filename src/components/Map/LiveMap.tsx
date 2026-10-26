// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  Compass,
  Plus,
  Minus,
  Layers,
  MapPin,
  Flag,
  Crosshair,
  Ruler,
  X,
  AlertTriangle,
  Battery,
  BatteryCharging,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Search,
  Phone,
  ArrowRight,
  CheckCircle2,
  Radio,
  Car,
  HeartPulse,
  Eye,
  Shield,
  LocateFixed,
  Send,
  RotateCw,
  Footprints,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import { calculateHaversineDistance, formatDistance, formatCoordinates } from '../../utils/geo';
import type { TeamMember, Checkpoint, MedicalEmergency, LocationCoordinates, ThreatZone, GpsBreadcrumb } from '../../types';

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyC9O0NwHd9EjrGwH6BEgXHFjL9L1hOykBA';

// Quick Tactical Sector Jump Presets across India & High-Altitude Field Operations
const TACTICAL_JUMP_PRESETS = [
  { name: 'HQ Ridge Command', lat: 28.6139, lng: 77.2090, zoom: 15 },
  { name: 'Valley Ingress River', lat: 28.6115, lng: 77.2005, zoom: 16 },
  { name: 'Trauma Evac LZ Pad', lat: 28.6075, lng: 77.2135, zoom: 17 },
  { name: 'High Observation Ridge', lat: 28.6238, lng: 77.2012, zoom: 16 },
  { name: 'Ladakh Sector Base', lat: 34.1526, lng: 77.5771, zoom: 14 },
  { name: 'Kashmir Sector Base', lat: 34.0837, lng: 74.7973, zoom: 14 },
];

/**
 * Inner Component: Real Google Maps Directions / Tactical Route Polyline
 */
const TacticalRouteLayer: React.FC<{
  origin: LocationCoordinates;
  destination: LocationCoordinates | null;
  name: string;
}> = ({ origin, destination, name }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [fallbackPolyline, setFallbackPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !routesLib) return;
    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#2563EB',
        strokeWeight: 5,
        strokeOpacity: 0.85,
      },
    });
    setDirectionsRenderer(renderer);

    return () => {
      renderer.setMap(null);
    };
  }, [map, routesLib]);

  useEffect(() => {
    if (!map || !destination) {
      if (directionsRenderer) directionsRenderer.setDirections({ routes: [] } as any);
      if (fallbackPolyline) fallbackPolyline.setMap(null);
      return;
    }

    if (!routesLib || !directionsRenderer) {
      // Fallback straight-line polyline if routes service is pending
      if (fallbackPolyline) fallbackPolyline.setMap(null);
      const line = new google.maps.Polyline({
        path: [
          { lat: origin.lat, lng: origin.lng },
          { lat: destination.lat, lng: destination.lng },
        ],
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map,
      });
      setFallbackPolyline(line);
      return;
    }

    const directionsService = new routesLib.DirectionsService();
    directionsService.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          if (fallbackPolyline) fallbackPolyline.setMap(null);
        } else {
          // If walking route fails due to off-road terrain, draw straight tactical geodesic vector
          if (fallbackPolyline) fallbackPolyline.setMap(null);
          const line = new google.maps.Polyline({
            path: [
              { lat: origin.lat, lng: origin.lng },
              { lat: destination.lat, lng: destination.lng },
            ],
            strokeColor: '#EF4444',
            strokeOpacity: 0.8,
            strokeWeight: 4,
            geodesic: true,
            map,
          });
          setFallbackPolyline(line);
        }
      }
    );

    return () => {
      if (fallbackPolyline) fallbackPolyline.setMap(null);
    };
  }, [map, routesLib, directionsRenderer, origin.lat, origin.lng, destination?.lat, destination?.lng]);

  return null;
};

/**
 * Inner Component: Threat & Danger Geofence Circles on Google Maps
 */
const ThreatZonePolygons: React.FC<{
  threatZones: ThreatZone[];
  onSelectZone: (zone: ThreatZone) => void;
}> = ({ threatZones, onSelectZone }) => {
  const map = useMap();
  const circlesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear previous
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    threatZones.forEach((zone) => {
      const isHigh = zone.riskLevel === 'HIGH_RISK';
      const circle = new google.maps.Circle({
        strokeColor: isHigh ? '#DC2626' : '#F59E0B',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: isHigh ? '#EF4444' : '#FBBF24',
        fillOpacity: 0.22,
        map,
        center: { lat: zone.center.lat, lng: zone.center.lng },
        radius: zone.radiusMeters,
      });

      circle.addListener('click', () => {
        onSelectZone(zone);
      });

      circlesRef.current.push(circle);
    });

    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
      circlesRef.current = [];
    };
  }, [map, threatZones]);

  return null;
};

/**
 * Inner Component: Real Live Traffic Layer
 */
const GoogleTrafficOverlay: React.FC<{ visible: boolean }> = ({ visible }) => {
  const map = useMap();
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
    }

    if (visible) {
      trafficLayerRef.current.setMap(map);
    } else {
      trafficLayerRef.current.setMap(null);
    }

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    };
  }, [map, visible]);

  return null;
};

/**
 * Inner Component: User GPS Precision Accuracy Radius Circle
 */
const GPSAccuracyCircle: React.FC<{ location: LocationCoordinates }> = ({ location }) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    const circle = new google.maps.Circle({
      strokeColor: '#3B82F6',
      strokeOpacity: 0.5,
      strokeWeight: 1.5,
      fillColor: '#60A5FA',
      fillOpacity: 0.15,
      map,
      center: { lat: location.lat, lng: location.lng },
      radius: Math.max(15, location.accuracy || 25),
    });

    circleRef.current = circle;

    return () => {
      circle.setMap(null);
    };
  }, [map, location.lat, location.lng, location.accuracy]);

  return null;
};

/**
 * Inner Component: Live GPS Breadcrumb Trail on Google Map
 */
const GpsBreadcrumbTrailLayer: React.FC<{
  trail: GpsBreadcrumb[];
  isVisible: boolean;
}> = ({ trail, isVisible }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        map,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        geodesic: true,
      });
    }

    if (!isVisible || !trail || trail.length < 2) {
      polylineRef.current.setMap(null);
    } else {
      polylineRef.current.setMap(map);
      polylineRef.current.setPath(trail.map((p) => ({ lat: p.lat, lng: p.lng })));
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, trail, isVisible]);

  return null;
};

/**
 * Inner Component: Map Camera Controller for Centering & Follow-Me
 */
const MapCameraController: React.FC<{
  center: LocationCoordinates;
  zoom: number;
  tilt: number;
  heading: number;
}> = ({ center, zoom, tilt, heading }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo({ lat: center.lat, lng: center.lng });
  }, [map, center.lat, center.lng]);

  useEffect(() => {
    if (!map) return;
    map.setZoom(zoom);
  }, [map, zoom]);

  useEffect(() => {
    if (!map) return;
    map.setTilt(tilt);
  }, [map, tilt]);

  useEffect(() => {
    if (!map) return;
    map.setHeading(heading);
  }, [map, heading]);

  return null;
};

// Main LiveMap Component
export const LiveMap: React.FC = () => {
  const {
    currentUser,
    members,
    soldiers,
    medics,
    emergencies,
    checkpoints,
    threatZones,
    activeRoute,
    clearRoute,
    planRouteTo,
    startVoiceCall,
    acknowledgeEmergency,
    resolveEmergency,
    addCheckpoint,
    requestRealGeolocation,
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    isFollowMeActive,
    toggleFollowMe,
    selectedMemberId,
    setSelectedMemberId,
    isAuthorizedForEmergency,
    gpsTrail,
  } = useTeam();

  const containerRef = useRef<HTMLDivElement>(null);
  const [mapType, setMapType] = useState<'hybrid' | 'satellite' | 'terrain' | 'roadmap'>('hybrid');
  const [tilt, setTilt] = useState<number>(0); // 0 or 45 for 3D tilt
  const [heading, setHeading] = useState<number>(0);
  const [isTrafficVisible, setIsTrafficVisible] = useState<boolean>(false);
  const [isTrailVisible, setIsTrailVisible] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [unitFilter, setUnitFilter] = useState<'ALL' | 'SOLDIERS' | 'MEDICS' | 'EMERGENCIES'>('ALL');

  // Interactive Tools
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<LocationCoordinates[]>([]);
  const [isAddingCheckpoint, setIsAddingCheckpoint] = useState<boolean>(false);
  const [checkpointModalCoord, setCheckpointModalCoord] = useState<LocationCoordinates | null>(null);
  const [newCheckpointName, setNewCheckpointName] = useState<string>('');
  const [newCheckpointType, setNewCheckpointType] = useState<Checkpoint['type']>('RALLY_POINT');

  // Selected item popover
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'member' | 'emergency' | 'checkpoint' | 'threat';
    data: any;
  } | null>(null);

  // Filtered members based on unit filter
  const displayedMembers = useMemo(() => {
    if (unitFilter === 'SOLDIERS') return soldiers;
    if (unitFilter === 'MEDICS') return medics;
    if (unitFilter === 'EMERGENCIES') {
      const reportingIds = new Set(emergencies.map((e) => e.reportedBy));
      return members.filter((m) => reportingIds.has(m.id) || m.condition === 'MEDICAL_EMERGENCY');
    }
    return members;
  }, [members, soldiers, medics, emergencies, unitFilter]);

  // Recenter GPS
  const handleRecenter = () => {
    requestRealGeolocation();
    setMapCenter(currentUser.location);
  };

  // Toggle 3D Oblique View
  const toggleTilt = () => {
    setTilt((prev) => (prev === 0 ? 45 : 0));
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Distance of measurement points
  const measuredDistanceMeters = useMemo(() => {
    if (measurePoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < measurePoints.length - 1; i++) {
      total += calculateHaversineDistance(measurePoints[i], measurePoints[i + 1]);
    }
    return total;
  }, [measurePoints]);

  // Quick Sector Search / Coordinate Input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if input is "lat, lng" coordinates (e.g. 28.6139, 77.2090)
    const coordMatch = searchQuery.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setMapCenter({ lat, lng });
        setMapZoom(16);
        return;
      }
    }

    // Check presets
    const preset = TACTICAL_JUMP_PRESETS.find((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (preset) {
      setMapCenter({ lat: preset.lat, lng: preset.lng });
      setMapZoom(preset.zoom);
      return;
    }

    // Fallback: search members or checkpoints
    const matchMember = members.find((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matchMember) {
      setMapCenter(matchMember.location);
      setSelectedEntity({ type: 'member', data: matchMember });
      return;
    }

    const matchCheckpoint = checkpoints.find((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (matchCheckpoint) {
      setMapCenter(matchCheckpoint.location);
      setSelectedEntity({ type: 'checkpoint', data: matchCheckpoint });
      return;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] lg:min-h-[560px] rounded-3xl overflow-hidden shadow-md border border-slate-200 select-none bg-slate-900"
    >
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="gmp_mcp_codeassist_v1_aistudio">
        {/* Real Google Map Container - mandatory CSS height: 100% */}
        <div className="w-full h-full relative" style={{ height: '100%' }}>
          <Map
            id="main-map"
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            defaultCenter={{ lat: mapCenter.lat, lng: mapCenter.lng }}
            defaultZoom={mapZoom}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={true}
            style={{ width: '100%', height: '100%' }}
            onClick={(e) => {
              if (isAddingCheckpoint && e.detail.latLng) {
                setCheckpointModalCoord({
                  lat: e.detail.latLng.lat,
                  lng: e.detail.latLng.lng,
                });
                setNewCheckpointName(`Checkpoint ${checkpoints.length + 1}`);
                setIsAddingCheckpoint(false);
              } else if (isMeasuring && e.detail.latLng) {
                setMeasurePoints((prev) => [
                  ...prev,
                  { lat: e.detail.latLng!.lat, lng: e.detail.latLng!.lng },
                ]);
              }
            }}
          >
            {/* Map Camera Sync */}
            <MapCameraController
              center={mapCenter}
              zoom={mapZoom}
              tilt={tilt}
              heading={heading}
            />

            {/* User Real-Time GPS Precision Halo Circle */}
            <GPSAccuracyCircle location={currentUser.location} />

            {/* Live Traffic Overlay */}
            <GoogleTrafficOverlay visible={isTrafficVisible} />

            {/* Threat & Danger Geofence Circles */}
            <ThreatZonePolygons
              threatZones={threatZones}
              onSelectZone={(zone) => setSelectedEntity({ type: 'threat', data: zone })}
            />

            {/* Tactical Directions & Routes Polyline */}
            <TacticalRouteLayer
              origin={currentUser.location}
              destination={activeRoute ? activeRoute.destination : null}
              name={activeRoute?.name || 'Tactical Route'}
            />

            {/* Live GPS Patrol Breadcrumb Trail */}
            <GpsBreadcrumbTrailLayer trail={gpsTrail} isVisible={isTrailVisible} />

            {/* 1. Tactical Soldier & Medic Advanced Markers */}
            {displayedMembers.map((member) => {
              const isMedic = member.role === 'Medic';
              const isCurrent = member.isCurrent;
              const hasActiveEmergency = emergencies.some(
                (e) => e.reportedBy === member.id && e.status !== 'RESOLVED'
              );

              return (
                <AdvancedMarker
                  key={member.id}
                  position={{ lat: member.location.lat, lng: member.location.lng }}
                  onClick={() => {
                    setSelectedMemberId(member.id);
                    setSelectedEntity({ type: 'member', data: member });
                  }}
                  title={`${member.name} (${member.role})`}
                >
                  <div className="relative group cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition duration-200 hover:scale-110">
                    {/* Pulsing halo if in emergency */}
                    {hasActiveEmergency && (
                      <span className="absolute -inset-2 rounded-full bg-red-600/40 animate-ping" />
                    )}

                    {/* Outer Border Badge */}
                    <div
                      className={`relative flex items-center justify-center rounded-2xl p-1 shadow-lg border-2 ${
                        isCurrent
                          ? 'bg-blue-600 border-white text-white ring-2 ring-blue-400'
                          : isMedic
                          ? 'bg-white border-red-600 text-red-600 ring-2 ring-red-200'
                          : member.condition === 'CAUTION'
                          ? 'bg-amber-500 border-white text-white'
                          : 'bg-[#14243b] border-white text-white'
                      }`}
                    >
                      {/* Avatar Image */}
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center p-0.5">
                        <img
                          src={
                            isMedic
                              ? '/assets/aistudio/image_ba22c148.png'
                              : '/assets/aistudio/image_da532834.png'
                          }
                          alt={member.name}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Small Status Indicator Dot */}
                      <span
                        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          member.condition === 'ALL_CLEAR'
                            ? 'bg-emerald-500'
                            : member.condition === 'CAUTION'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                      />
                    </div>

                    {/* Name Pill Badge on Hover or Selection */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap shadow-md border border-slate-700/80 pointer-events-none flex items-center gap-1">
                      {isMedic && <HeartPulse className="w-3 h-3 text-red-400" />}
                      <span>{member.name.split(' ')[0]}</span>
                      {isCurrent && <span className="text-blue-400 text-[9px]">(You)</span>}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* 2. Medical Distress & Emergency Beacons */}
            {emergencies
              .filter((e) => e.status !== 'RESOLVED')
              .map((emg) => (
                <AdvancedMarker
                  key={emg.id}
                  position={{ lat: emg.location.lat, lng: emg.location.lng }}
                  onClick={() => setSelectedEntity({ type: 'emergency', data: emg })}
                >
                  <div className="relative cursor-pointer flex items-center gap-2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-14 h-14 rounded-full bg-red-600/30 animate-ping" />
                      <div className="relative w-10 h-10 rounded-full bg-red-600 border-2 border-white text-white flex items-center justify-center shadow-xl animate-pulse">
                        <Plus className="w-6 h-6 stroke-[3.5]" />
                      </div>
                    </div>
                    <div className="bg-slate-900/95 backdrop-blur-md text-white px-2.5 py-1 rounded-xl border border-red-500 shadow-lg text-[10px] font-bold whitespace-nowrap">
                      <span className="text-red-400">EMERGENCY</span> · {emg.reporterName}
                    </div>
                  </div>
                </AdvancedMarker>
              ))}

            {/* 3. Checkpoint Advanced Markers */}
            {checkpoints.map((chk) => (
              <AdvancedMarker
                key={chk.id}
                position={{ lat: chk.location.lat, lng: chk.location.lng }}
                onClick={() => setSelectedEntity({ type: 'checkpoint', data: chk })}
              >
                <div className="relative cursor-pointer flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-xl border-2 border-white transform transition group-hover:scale-110 ${
                      chk.isPrimaryAssembly
                        ? 'bg-amber-600 ring-2 ring-amber-300'
                        : chk.type === 'EXTRACTION_ZONE'
                        ? 'bg-red-600'
                        : chk.type === 'SUPPLY_DROP'
                        ? 'bg-emerald-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    <Flag className="w-4 h-4 fill-white" />
                  </div>
                  <div className="bg-slate-900/90 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-semibold mt-1 whitespace-nowrap shadow border border-slate-700">
                    {chk.name}
                  </div>
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </div>
      </APIProvider>

      {/* --- TOP FLOATING CONTROLS: SEARCH, MAP TYPE & TACTICAL FILTERS --- */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Tactical Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-slate-200/90 w-full sm:w-80 md:w-96 text-xs text-slate-800"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sector, soldier, medic or 'lat, lng'..."
              className="w-full bg-transparent outline-none placeholder-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Map Type Segmented Control (Hybrid Satellite / Terrain / Map) */}
          <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-slate-200/90 text-xs font-semibold">
            <button
              onClick={() => setMapType('hybrid')}
              className={`px-3 py-1.5 rounded-xl transition ${
                mapType === 'hybrid'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapType('terrain')}
              className={`px-3 py-1.5 rounded-xl transition ${
                mapType === 'terrain'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Terrain
            </button>
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-3 py-1.5 rounded-xl transition ${
                mapType === 'roadmap'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Roadmap
            </button>
          </div>
        </div>

        {/* Quick Sector Presets & Filter Pills */}
        <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-semibold no-scrollbar">
          {/* Unit Filters */}
          <div className="flex items-center bg-white/90 backdrop-blur-md p-1 rounded-xl shadow border border-slate-200 shrink-0">
            <button
              onClick={() => setUnitFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition ${
                unitFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              All Units ({members.length})
            </button>
            <button
              onClick={() => setUnitFilter('SOLDIERS')}
              className={`px-2.5 py-1 rounded-lg transition ${
                unitFilter === 'SOLDIERS' ? 'bg-blue-600 text-white' : 'text-slate-600'
              }`}
            >
              Soldiers ({soldiers.length})
            </button>
            <button
              onClick={() => setUnitFilter('MEDICS')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                unitFilter === 'MEDICS' ? 'bg-red-600 text-white' : 'text-slate-600'
              }`}
            >
              <HeartPulse className="w-3 h-3" />
              Medics ({medics.length})
            </button>
            {emergencies.filter((e) => e.status !== 'RESOLVED').length > 0 && (
              <button
                onClick={() => setUnitFilter('EMERGENCIES')}
                className={`px-2.5 py-1 rounded-lg transition animate-pulse ${
                  unitFilter === 'EMERGENCIES'
                    ? 'bg-red-600 text-white font-bold'
                    : 'text-red-600 bg-red-50'
                }`}
              >
                Alerts ({emergencies.filter((e) => e.status !== 'RESOLVED').length})
              </button>
            )}
          </div>

          {/* Quick Tactical Ingress Presets */}
          <div className="flex items-center gap-1.5 shrink-0">
            {TACTICAL_JUMP_PRESETS.slice(0, 4).map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setMapCenter({ lat: p.lat, lng: p.lng });
                  setMapZoom(p.zoom);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-mono shadow backdrop-blur-xs border border-slate-700/60 transition"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- RIGHT FLOATING MAP TOOLBAR: ZOOM, TILT, GPS, FOLLOW-ME, TRAFFIC, RULER --- */}
      <div className="absolute right-4 top-28 z-20 pointer-events-auto flex flex-col gap-2">
        {/* Follow Me Mode Button */}
        <button
          onClick={toggleFollowMe}
          title={isFollowMeActive ? 'Follow Me Active (Camera locks to real GPS)' : 'Enable Follow-Me Mode'}
          className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition border ${
            isFollowMeActive
              ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-300'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <LocateFixed className={`w-5 h-5 ${isFollowMeActive ? 'animate-pulse' : ''}`} />
        </button>

        {/* GPS Recenter */}
        <button
          onClick={handleRecenter}
          title="Recenter Map on Real Location"
          className="w-10 h-10 rounded-2xl bg-white/95 hover:bg-white text-slate-800 shadow-xl border border-slate-200 flex items-center justify-center transition"
        >
          <Crosshair className="w-5 h-5 text-blue-600" />
        </button>

        {/* 3D Oblique Tilt View (45°) */}
        <button
          onClick={toggleTilt}
          title="Toggle 3D Elevation / Oblique Angle (45°)"
          className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center text-xs font-bold transition border ${
            tilt > 0
              ? 'bg-indigo-600 text-white border-indigo-400'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          3D
        </button>

        {/* Real Live Traffic Layer */}
        <button
          onClick={() => setIsTrafficVisible(!isTrafficVisible)}
          title="Toggle Google Maps Live Traffic Layer"
          className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition border ${
            isTrafficVisible
              ? 'bg-amber-600 text-white border-amber-400'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Car className="w-4 h-4" />
        </button>

        {/* Distance Measure Tool */}
        <button
          onClick={() => {
            setIsMeasuring(!isMeasuring);
            setMeasurePoints([]);
          }}
          title="Measure Tactical Distances on Map"
          className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition border ${
            isMeasuring
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Ruler className="w-4 h-4" />
        </button>

        {/* Add Checkpoint Pin Mode */}
        <button
          onClick={() => setIsAddingCheckpoint(!isAddingCheckpoint)}
          title="Click to place new field rendezvous checkpoint"
          className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition border ${
            isAddingCheckpoint
              ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-300'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Flag className="w-4 h-4" />
        </button>

        {/* Patrol Breadcrumb Trail Toggle */}
        <button
          onClick={() => setIsTrailVisible(!isTrailVisible)}
          title={isTrailVisible ? `GPS Breadcrumb Trail Active (${gpsTrail.length} waypoints recorded)` : 'Show GPS Breadcrumb Trail'}
          className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center transition border ${
            isTrailVisible && gpsTrail.length > 0
              ? 'bg-blue-600 text-white border-blue-400'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Footprints className="w-4 h-4" />
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col bg-white/95 rounded-2xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          <button
            onClick={() => setMapZoom(Math.min(mapZoom + 1, 19))}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMapZoom(Math.max(mapZoom - 1, 10))}
            className="w-10 h-10 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          title="Fullscreen Map"
          className="w-10 h-10 rounded-2xl bg-white/95 hover:bg-white text-slate-700 shadow-xl border border-slate-200 flex items-center justify-center transition"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* --- BOTTOM FLOATING HUD: TELEMETRY, MEASUREMENT & ACTIVE ROUTE --- */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex flex-wrap items-end justify-between gap-3">
        {/* Real-time GPS Telemetry Chip */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="font-mono font-bold leading-none">
                {currentUser.location.lat.toFixed(5)}° N, {currentUser.location.lng.toFixed(5)}° E
              </div>
              <div className="text-[10px] text-slate-400 leading-none mt-1 flex items-center gap-2">
                <span>Precision: ±{currentUser.location.accuracy || 8}m</span>
                <span>·</span>
                <span>Speed: {currentUser.location.speed || 0} km/h</span>
                <span>·</span>
                <span>Heading: {currentUser.location.heading || 0}°</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-700" />

          <button
            onClick={handleRecenter}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] transition"
          >
            Lock GPS
          </button>
        </div>

        {/* Active Route Vector Notification Card */}
        {activeRoute && (
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md text-slate-900 px-4 py-3 rounded-2xl border border-blue-200 shadow-2xl flex items-center gap-4 text-xs">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">
                Route to: {activeRoute.name}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Distance: <span className="font-bold text-blue-600">{activeRoute.formattedDistance}</span> · Est: {activeRoute.estimatedTime}
              </div>
            </div>
            <button
              onClick={clearRoute}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
            >
              Clear Route
            </button>
          </div>
        )}

        {/* Distance Measurement Output */}
        {isMeasuring && (
          <div className="pointer-events-auto bg-emerald-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl border border-emerald-500 shadow-2xl flex items-center gap-3 text-xs">
            <div>
              <div className="font-bold">Tactical Ruler Active</div>
              <div className="text-[10px] text-emerald-200 font-mono mt-0.5">
                {measurePoints.length} point(s) clicked · Total: {formatDistance(measuredDistanceMeters)}
              </div>
            </div>
            <button
              onClick={() => setMeasurePoints([])}
              className="text-[10px] bg-emerald-700 px-2 py-1 rounded-lg font-semibold hover:bg-emerald-600 transition"
            >
              Reset Points
            </button>
            <button
              onClick={() => setIsMeasuring(false)}
              className="text-emerald-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* --- ADD CHECKPOINT MODAL MODAL (WHEN MAP IS CLICKED) --- */}
      {checkpointModalCoord && (
        <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-xs space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-blue-600" />
                Place Google Map Checkpoint
              </h4>
              <button
                onClick={() => setCheckpointModalCoord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Checkpoint Name</label>
              <input
                type="text"
                value={newCheckpointName}
                onChange={(e) => setNewCheckpointName(e.target.value)}
                placeholder="Rally Point Charlie"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Tactical Type</label>
              <select
                value={newCheckpointType}
                onChange={(e) => setNewCheckpointType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white"
              >
                <option value="RALLY_POINT">Rally Point (Team Assembly)</option>
                <option value="EXTRACTION_ZONE">Extraction LZ (Casualty / Air Pickup)</option>
                <option value="SUPPLY_DROP">Supply Drop (Ammo, Water, Medical Packs)</option>
                <option value="OBSERVATION_POST">Observation Post (Tactical Lookout)</option>
                <option value="CUSTOM">Custom Tactical Pin</option>
              </select>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl font-mono text-[10px] text-slate-600">
              Selected GPS: {checkpointModalCoord.lat.toFixed(5)}° N, {checkpointModalCoord.lng.toFixed(5)}° E
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCheckpointModalCoord(null)}
                className="flex-1 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newCheckpointName.trim() && checkpointModalCoord) {
                    addCheckpoint({
                      name: newCheckpointName.trim(),
                      location: checkpointModalCoord,
                      type: newCheckpointType,
                    });
                    setCheckpointModalCoord(null);
                  }
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow"
              >
                Save Marker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SELECTED ENTITY COMMAND POPOVER --- */}
      {selectedEntity && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-6 right-6 z-40 pointer-events-auto bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 w-80 max-w-[90vw] text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-200 text-xs space-y-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              {selectedEntity.type === 'member'
                ? selectedEntity.data.role === 'Medic'
                  ? 'Medical Paramedic Unit'
                  : 'Combat Soldier Unit'
                : selectedEntity.type === 'emergency'
                ? 'Active Distress Alert'
                : selectedEntity.type === 'threat'
                ? 'Hazard / Threat Geofence'
                : 'Checkpoint Details'}
            </span>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Member Details */}
          {selectedEntity.type === 'member' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-1">
                  <img
                    src={
                      selectedEntity.data.role === 'Medic'
                        ? '/assets/aistudio/image_ba22c148.png'
                        : '/assets/aistudio/image_da532834.png'
                    }
                    alt={selectedEntity.data.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {selectedEntity.data.name}{' '}
                    {selectedEntity.data.isCurrent && (
                      <span className="text-blue-600 font-normal text-xs">(You)</span>
                    )}
                  </h4>
                  <p className="text-slate-500 text-[11px] font-semibold">{selectedEntity.data.role}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <span>
                      Dist: {formatDistance(calculateHaversineDistance(currentUser.location, selectedEntity.data.location))}
                    </span>
                    <span>·</span>
                    <span>Battery: {selectedEntity.data.batteryLevel ?? 90}%</span>
                  </div>
                </div>
              </div>

              {selectedEntity.data.conditionNote && (
                <p className="p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 border border-slate-100 italic">
                  "{selectedEntity.data.conditionNote}"
                </p>
              )}

              {!selectedEntity.data.isCurrent && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      startVoiceCall(selectedEntity.data.id);
                      setSelectedEntity(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call Voice
                  </button>
                  <button
                    onClick={() => {
                      planRouteTo(selectedEntity.data.location, selectedEntity.data.name);
                      setSelectedEntity(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Route Vector
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Emergency Details */}
          {selectedEntity.type === 'emergency' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600 font-extrabold text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{selectedEntity.data.severity}: {selectedEntity.data.message}</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Reported by {selectedEntity.data.reporterName} ({selectedEntity.data.reporterRole}) at{' '}
                {new Date(selectedEntity.data.timestamp).toLocaleTimeString()}
              </p>

              {!isAuthorizedForEmergency && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-tight">
                  🔒 Triage restricted: Only authorized roles (<span className="font-bold">Team Leader</span> or <span className="font-bold">Medic</span>) can acknowledge or resolve emergencies. Your role is <span className="font-bold">{currentUser.role}</span>.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {selectedEntity.data.status !== 'ACKNOWLEDGED' && (
                  <button
                    disabled={!isAuthorizedForEmergency}
                    onClick={async () => {
                      const ok = await acknowledgeEmergency(selectedEntity.data.id);
                      if (ok) setSelectedEntity(null);
                    }}
                    className={`flex-1 py-2 text-white rounded-xl font-bold transition ${
                      isAuthorizedForEmergency
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  disabled={!isAuthorizedForEmergency}
                  onClick={async () => {
                    const ok = await resolveEmergency(selectedEntity.data.id);
                    if (ok) setSelectedEntity(null);
                  }}
                  className={`flex-1 py-2 text-white rounded-xl font-bold transition ${
                    isAuthorizedForEmergency
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  Mark Resolved
                </button>
              </div>

              <button
                onClick={() => {
                  planRouteTo(
                    selectedEntity.data.location,
                    `Rescue: ${selectedEntity.data.reporterName}`
                  );
                  setSelectedEntity(null);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                Dispatch Extraction Route
              </button>
            </div>
          )}

          {/* Checkpoint Details */}
          {selectedEntity.type === 'checkpoint' && (
            <div className="space-y-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">{selectedEntity.data.name}</h4>
                <p className="text-slate-500 text-[11px] mt-0.5">{selectedEntity.data.description}</p>
                <div className="mt-2 text-[10px] font-mono text-slate-600">
                  GPS: {selectedEntity.data.location.lat.toFixed(5)}° N, {selectedEntity.data.location.lng.toFixed(5)}° E
                </div>
              </div>

              <button
                onClick={() => {
                  planRouteTo(selectedEntity.data.location, selectedEntity.data.name);
                  setSelectedEntity(null);
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                Plan Route to Rendezvous
              </button>
            </div>
          )}

          {/* Threat Zone Details */}
          {selectedEntity.type === 'threat' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      selectedEntity.data.riskLevel === 'HIGH_RISK'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedEntity.data.riskLevel.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Radius: {selectedEntity.data.radiusMeters}m
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mt-1">{selectedEntity.data.name}</h4>
                <p className="text-slate-600 text-xs mt-1">{selectedEntity.data.description}</p>
              </div>

              <button
                onClick={() => {
                  setMapCenter(selectedEntity.data.center);
                  setSelectedEntity(null);
                }}
                className="w-full py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold transition"
              >
                Center Threat Perimeter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
