"use client";

import Map, { Marker, Popup, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import { useState, useEffect, useMemo, useRef, Fragment, useCallback } from "react";
import { FiLayers, FiList, FiNavigation, FiMaximize, FiMinimize, FiBox, FiSearch, FiMapPin, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { io } from "socket.io-client";
import { useAppStore } from "@/lib/store";
import { PlaceName } from "@/components/PlaceName";
import { useUser } from "@clerk/nextjs";

const mapStyles = {
  cartodark: { name: "Carto Dark Matter", url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
  cartopositron: { name: "Carto Positron", url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
  cartovoyager: { name: "Carto Voyager", url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" },
  positron: { name: "Positron", url: "https://tiles.openfreemap.org/styles/positron" },
  dark: { name: "Dark", url: "https://tiles.openfreemap.org/styles/dark" },
  fiord: { name: "Fiord", url: "https://tiles.openfreemap.org/styles/fiord" },
  americana: { name: "Americana 3D", url: "https://americanamap.org/style.json" },
  versatiles: { name: "Versatiles Colorful", url: "https://tiles.versatiles.org/assets/styles/colorful/style.json" },
  liberty: { name: "Liberty", url: "https://tiles.openfreemap.org/styles/liberty" },
  bright: { name: "Bright", url: "https://tiles.openfreemap.org/styles/bright" },
};

type VehicleData = {
  _id: string;
  carGPSIMEI: string;
  latitude: string;
  longitude: string;
  updatedAt: string;
};

type PlaceItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  kind: string;
};

const PLACE_COLORS: Record<string, string> = {
  fuel: "#f59e0b",
  food: "#ef4444",
  cafe: "#f97316",
  health: "#dc2626",
  bank: "#10b981",
  parking: "#64748b",
  lodging: "#3b82f6",
  shop: "#a855f7",
  tourism: "#06b6d4",
  search: "#ec4899",
  place: "#94a3b8",
};

const PLACE_GLYPHS: Record<string, string> = {
  fuel: "G",
  food: "R",
  cafe: "C",
  health: "+",
  bank: "$",
  parking: "P",
  lodging: "H",
  shop: "S",
  tourism: "*",
  search: "•",
  place: "•",
};

function useVehicleTracker(enableLiveStream: boolean) {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [history, setHistory] = useState<Record<string, number[][]>>({});

  useEffect(() => {
    fetch("/api/logs").then((r) => r.json()).then((lgs) => {
      if (Array.isArray(lgs)) {
        const initialHistory: Record<string, number[][]> = {};
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const sorted = lgs
          .filter((l: any) => new Date(l.createdAt).getTime() > oneHourAgo)
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        sorted.forEach((l: any) => {
          if (!initialHistory[l.carGPSIMEI]) initialHistory[l.carGPSIMEI] = [];
          initialHistory[l.carGPSIMEI].push([parseFloat(l.longitude), parseFloat(l.latitude)]);
        });
        setHistory(initialHistory);
        setVehicles(
          Object.values(
            sorted.reduce((latest: Record<string, VehicleData>, log: any) => {
              latest[log.carGPSIMEI] = log;
              return latest;
            }, {})
          )
        );
      }
    });

    if (!enableLiveStream) return;

    // const socket = io(`http://localhost:4000`);
    const socket = io("/dashboard");
    socket.on("gps-update", (data: VehicleData[]) => {
      setVehicles(data);
      setHistory((prev) => {
        const next = { ...prev };
        data.forEach((v: VehicleData) => {
          if (!next[v.carGPSIMEI]) next[v.carGPSIMEI] = [];
          next[v.carGPSIMEI] = [...next[v.carGPSIMEI], [parseFloat(v.longitude), parseFloat(v.latitude)]];
          if (next[v.carGPSIMEI].length > 60) {
            next[v.carGPSIMEI] = next[v.carGPSIMEI].slice(-60);
          }
        });
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [enableLiveStream]);

  return { vehicles, history };
}

export default function MonitorPage() {
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";
  const { vehicles, history } = useVehicleTracker(isAdmin);
  const { usersMap: userMap, resolveUsers, rentals, ensureRentals } = useAppStore();
  const [privateMonitorRentals, setPrivateMonitorRentals] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  const [viewState, setViewState] = useState({
    latitude: 9.03,
    longitude: 38.75,
    zoom: 13,
    pitch: 45,
    bearing: 0,
  });

  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceItem[]>([]);
  const [showPlaces, setShowPlaces] = useState(true);
  const [placeSearch, setPlaceSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const placesAbort = useRef<AbortController | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesCenter = useRef({ lat: 9.03, lng: 38.75, zoom: 13 });

  useEffect(() => {
    ensureRentals()
      .then((rentalsData) => {
        const clerkIds = [
          ...new Set([
            ...rentalsData.map((r: any) => r.carOwnerClerkId),
            ...rentalsData.map((r: any) => r.renteeClerkId),
          ].filter(Boolean)),
        ];
        resolveUsers(clerkIds);
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    fetch("/api/monitor")
      .then((response) => response.json())
      .then((data) => setPrivateMonitorRentals(Array.isArray(data) ? data : []))
      .catch(() => setPrivateMonitorRentals([]));
  }, [isAdmin]);

  const loadNearby = useCallback(
    async (lat: number, lng: number, zoom: number) => {
      if (!showPlaces || zoom < 12) {
        setNearbyPlaces([]);
        return;
      }
      placesAbort.current?.abort();
      const ctrl = new AbortController();
      placesAbort.current = ctrl;
      try {
        const radius = zoom >= 15 ? 800 : zoom >= 13 ? 1400 : 2200;
        const res = await fetch(`/api/places?mode=nearby&lat=${lat}&lng=${lng}&radius=${radius}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (Array.isArray(data)) setNearbyPlaces(data);
      } catch (err: any) {
        if (err?.name !== "AbortError") console.error(err);
      }
    },
    [showPlaces]
  );

  useEffect(() => {
    loadNearby(placesCenter.current.lat, placesCenter.current.lng, placesCenter.current.zoom);
  }, [loadNearby]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = placeSearch.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?mode=search&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [placeSearch]);

  const pairedVehicles = useMemo(() => {
    if (!isAdmin) {
      return privateMonitorRentals.map((rental) => ({
        groupId: rental._id,
        pub: vehicles.find((vehicle) => vehicle.carGPSIMEI === rental.carGPSId) || null,
        sec: null,
        diverge: rental.stolen,
        isUnregistered: false,
        isAssigned: true,
        rental: { ...rental, carImageURLs: rental.carImageURL ? [rental.carImageURL] : [] },
        owner: rental.owner,
        renter: rental.renter,
      }));
    }
    const map: Record<string, any> = {};
    vehicles.forEach((v) => {
      const rental = rentals.find((r) => r.carGPSId === v.carGPSIMEI || r.carGPSSecretId === v.carGPSIMEI);
      const groupId = rental ? rental._id : v.carGPSIMEI;
      const isSecret = rental ? rental.carGPSSecretId === v.carGPSIMEI : false;

      if (!map[groupId]) {
        map[groupId] = {
          pub: null,
          sec: null,
          diverge: false,
          isUnregistered: !rental,
          isAssigned: !!rental,
          renteeClerkId: rental?.renteeClerkId,
        };
      }

      if (isSecret) map[groupId].sec = v;
      else map[groupId].pub = v;
    });

    const results = [];
    for (const key in map) {
      const g = map[key];
      if (g.pub && g.sec) {
        const dist = Math.sqrt(
          Math.pow(parseFloat(g.pub.latitude) - parseFloat(g.sec.latitude), 2) +
            Math.pow(parseFloat(g.pub.longitude) - parseFloat(g.sec.longitude), 2)
        );
        if (dist > 0.005) g.diverge = true;
      }
      results.push({ groupId: key, ...g });
    }
    return results;
  }, [vehicles, rentals, isAdmin, privateMonitorRentals]);

  const assignedCars = useMemo(() => pairedVehicles.filter((p) => p.isAssigned).length, [pairedVehicles]);
  const unassignedUnits = useMemo(() => pairedVehicles.filter((p) => p.isUnregistered).length, [pairedVehicles]);

  const [currentStyle, setCurrentStyle] = useState(Object.keys(mapStyles)[0]);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [is3D, setIs3D] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" });
    }
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    setViewState((v) => ({ ...v, pitch: is3D ? 45 : 0 }));
  }, [is3D]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && mapContainerRef.current) {
      mapContainerRef.current.requestFullscreen().catch(console.error);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const goToPlace = (place: PlaceItem) => {
    setSelected(null);
    setSelectedPlace(place);
    setViewState((v) => ({
      ...v,
      latitude: place.lat,
      longitude: place.lng,
      zoom: Math.max(v.zoom, 15),
    }));
    setSearchOpen(false);
    setPlaceSearch(place.name);
  };

  const pathGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: Object.entries(history).map(([key, coords]) => ({
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: coords },
        properties: { id: key },
      })),
    }),
    [history]
  );

  const visiblePlaces = showPlaces ? nearbyPlaces : [];

  return (
    <div ref={containerRef} className="flex flex-col w-full h-[calc(100vh-100px)] p-6 pt-2">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .maplibregl-popup-content, .mapboxgl-popup-content {
           background: transparent !important;
           padding: 0 !important;
           box-shadow: none !important;
        }
        .maplibregl-popup-tip, .mapboxgl-popup-tip {
           display: none !important;
        }
      `,
        }}
      />

      <div className="flex w-full items-end justify-between border-b border-theme-border/50 pb-4 mb-4 shrink-0 gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <FiNavigation className="text-theme-accent" /> Fleet Monitor
          </h2>
          <p className="text-theme-text/50">
            Tracking {assignedCars} {assignedCars === 1 ? "car" : "cars"}
            <span className="text-theme-text/35 text-sm ml-1.5">
              · {unassignedUnits} unassigned {unassignedUnits === 1 ? "unit" : "units"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 relative flex-wrap justify-end">
          <div className="relative">
            <div className="flex items-center gap-2 bg-theme-background border border-theme-border rounded-full px-3 py-2 min-w-[220px]">
              <FiSearch className="text-theme-text/40 shrink-0" />
              <input
                value={placeSearch}
                onChange={(e) => setPlaceSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder="Search places..."
                className="bg-transparent outline-none text-sm w-40 sm:w-52"
              />
              {placeSearch && (
                <button
                  onClick={() => {
                    setPlaceSearch("");
                    setSearchResults([]);
                    setSelectedPlace(null);
                  }}
                  className="p-0.5 rounded-full hover:bg-theme-card"
                >
                  <FiX className="text-sm text-theme-text/50" />
                </button>
              )}
            </div>
            <AnimatePresence>
              {searchOpen && (searchResults.length > 0 || searching) && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-0 right-0 top-full mt-2 z-50 bg-theme-card border border-theme-border/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl max-h-64 overflow-y-auto"
                >
                  {searching && <div className="px-4 py-3 text-xs text-theme-text/50">Searching…</div>}
                  {searchResults.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => goToPlace(place)}
                      className="w-full text-left px-4 py-3 hover:bg-theme-accent/10 transition-colors flex items-start gap-2 border-b border-theme-border/20 last:border-0"
                    >
                      <FiMapPin className="text-pink-400 mt-0.5 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold truncate">{place.name}</span>
                        <span className="text-[10px] uppercase tracking-widest text-theme-text/40">{place.kind}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setShowPlaces((v) => !v)}
            className={`px-4 py-2 border rounded-full font-bold text-sm transition-colors ${
              showPlaces ? "bg-pink-500/20 text-pink-300 border-pink-500/40" : "bg-theme-card border-theme-border text-theme-text/60"
            }`}
          >
            Places {showPlaces ? "On" : "Off"}
          </button>

          {isAdmin && false && <button
            onClick={() => setIs3D(!is3D)}
            className={`px-4 py-2 border rounded-full font-bold text-sm transition-colors ${
              is3D ? "bg-theme-accent text-white border-theme-accent/50" : "bg-theme-card border-theme-border text-theme-text/60"
            }`}
          >
            {is3D ? "3D View" : "2D View"}
          </button>}

          <button
            onClick={toggleFullscreen}
            className="p-2 border border-theme-border rounded-full hover:bg-theme-card transition-colors shadow-sm bg-theme-background"
          >
            {isFullscreen ? <FiMinimize /> : <FiMaximize />}
          </button>

          <button
            onClick={() => setShowStylePicker(!showStylePicker)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-background border border-theme-border rounded-full hover:bg-theme-card transition-colors"
          >
            <FiLayers />
            <span className="text-sm font-semibold">{mapStyles[currentStyle as keyof typeof mapStyles].name}</span>
          </button>

          <AnimatePresence>
            {showStylePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStylePicker(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-full bg-[#0f0f11bc] mt-2 z-50 min-w-[220px] border border-theme-border/50 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl"
                >
                  <div className="p-3 border-b border-theme-border/50">
                    <span className="text-xs uppercase tracking-widest font-bold text-theme-text/50">Map Style</span>
                  </div>
                  {Object.entries(mapStyles).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setCurrentStyle(key);
                        setShowStylePicker(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-theme-accent/10 transition-colors ${
                        key === currentStyle ? "bg-theme-accent/20 text-theme-accent font-bold" : "text-theme-text"
                      }`}
                    >
                      {value.name}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className={`w-full flex-1 bg-theme-card overflow-hidden shadow-xl border border-theme-border/30 relative ${
          isFullscreen ? "rounded-none" : "rounded-[32px]"
        }`}
      >
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onMoveEnd={(evt) => {
            placesCenter.current = {
              lat: evt.viewState.latitude,
              lng: evt.viewState.longitude,
              zoom: evt.viewState.zoom,
            };
            loadNearby(evt.viewState.latitude, evt.viewState.longitude, evt.viewState.zoom);
          }}
          onClick={() => setSelectedPlace(null)}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyles[currentStyle as keyof typeof mapStyles].url}
        >
          <NavigationControl position="bottom-right" />

          <Source id="paths" type="geojson" data={pathGeoJson}>
            <Layer
              id="path-lines"
              type="line"
              source="paths"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{ "line-color": "#0ea5e9", "line-width": 4, "line-opacity": 0.8 }}
            />
          </Source>

          {visiblePlaces.map((place) => {
            const color = PLACE_COLORS[place.category] || PLACE_COLORS.place;
            const glyph = PLACE_GLYPHS[place.category] || PLACE_GLYPHS.place;
            return (
              <Marker
                key={place.id}
                latitude={place.lat}
                longitude={place.lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelected(null);
                  setSelectedPlace(place);
                }}
              >
                <div className="flex flex-col items-center cursor-pointer hover:scale-110 transition-transform drop-shadow-lg">
                  <div
                    className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-black shadow"
                    style={{ backgroundColor: color, color: "#fff" }}
                    title={place.name}
                  >
                    {glyph}
                  </div>
                  {viewState.zoom >= 14.5 && (
                    <span className="mt-0.5 max-w-[90px] truncate text-[9px] font-bold bg-[#111]/90 text-white px-1.5 py-0.5 rounded border border-white/10">
                      {place.name}
                    </span>
                  )}
                </div>
              </Marker>
            );
          })}

          {selectedPlace && (
            <Popup
              latitude={selectedPlace.lat}
              longitude={selectedPlace.lng}
              anchor="bottom"
              closeButton={false}
              closeOnClick={false}
              offset={18}
              className="z-50"
            >
              <div className="bg-[#0f0f11] text-white border border-[#333] p-3 rounded-2xl shadow-2xl min-w-[180px] max-w-[240px]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#888] font-bold">
                      {selectedPlace.kind.replace(/_/g, " ")}
                    </span>
                    <p className="font-bold text-sm mt-0.5">{selectedPlace.name}</p>
                  </div>
                  <button onClick={() => setSelectedPlace(null)} className="text-[#888] hover:text-white">
                    <FiX />
                  </button>
                </div>
              </div>
            </Popup>
          )}

          {pairedVehicles.map((p) => {
            const isStolen = p.diverge;
            const isUnregistered = p.isUnregistered;

            const renderMarker = (displayV: any, label: string, isSecretMarker: boolean, isStolenState: boolean) => {
              if (!displayV) return null;
              return (
                <Marker
                  key={`${p.groupId}-${label}`}
                  latitude={parseFloat(displayV.latitude)}
                  longitude={parseFloat(displayV.longitude)}
                  anchor="bottom"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    const rental = p.rental || rentals.find((r) => r._id === p.groupId);
                    setSelectedPlace(null);
                    setSelected({
                      ...displayV,
                      isStolen,
                      groupId: p.groupId,
                      pub: p.pub,
                      sec: p.sec,
                      renteeClerkId: p.renteeClerkId,
                      owner: p.owner,
                      renter: p.renter,
                      isUnregistered,
                      rental,
                    });
                  }}
                >
                  <div
                    className={`relative group cursor-pointer drop-shadow-xl hover:scale-110 transition-transform ${
                      isStolenState ? "animate-pulse" : ""
                    }`}
                  >
                    {!isUnregistered && p.renteeClerkId && (
                      <div className="absolute -top-[52px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 z-10">
                        {userMap[p.renteeClerkId] && (
                          <img
                            src={userMap[p.renteeClerkId].imageUrl}
                            className="w-7 h-7 rounded-full border-2 border-theme-accent object-cover shadow-lg bg-black"
                            alt="driver"
                          />
                        )}
                        <span className="bg-[#111]/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap max-w-[100px] truncate border border-theme-border/40">
                          {userMap[p.renteeClerkId]?.name || p.renteeClerkId}
                        </span>
                      </div>
                    )}

                    <span
                      className={`absolute size-4 rounded-full animate-ping -z-10 bottom-0 left-[40%] ${
                        isStolenState && isSecretMarker
                          ? "bg-red-500/80"
                          : isStolenState && !isSecretMarker
                            ? "bg-purple-500/80"
                            : isUnregistered
                              ? "bg-gray-500/80"
                              : "bg-sky-400/40"
                      }`}
                    />
                    <div className="flex flex-col items-center">
                      <div
                        className={`bg-[#111] text-emerald-400 border border-theme-border/30 font-black text-[10px] px-1.5 py-0.5 rounded shadow mb-1 whitespace-nowrap ${
                          isStolenState && isSecretMarker
                            ? "text-red-500 border-red-500"
                            : isStolenState && !isSecretMarker
                              ? "text-purple-400 border-purple-500"
                              : isUnregistered
                                ? "text-gray-400 border-gray-500"
                                : ""
                        }`}
                      >
                        {isUnregistered
                          ? "UNREGISTERED"
                          : isStolenState
                            ? isAdmin
                              ? isSecretMarker ? "SECRET REAL" : "PUB DIVERGED"
                              : "POSSIBLE THEFT"
                            : `RENTAL-${String(p.groupId).slice(-4)}`}
                      </div>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 21.5C12.5 21.5 21.5 12 21.5 7.5C21.5 3.5 17.5 -0.5 12 -0.5C6.5 -0.5 2.5 3.5 2.5 7.5C2.5 12 11.5 21.5 12 21.5Z"
                          fill={
                            isStolenState && isSecretMarker
                              ? "#ef4444"
                              : isStolenState && !isSecretMarker
                                ? "#a855f7"
                                : isUnregistered
                                  ? "#6b7280"
                                  : "#0ea5e9"
                          }
                        />
                        <circle cx="12" cy="7.5" r="4" fill="#111" />
                      </svg>
                    </div>
                  </div>
                </Marker>
              );
            };

            if (isStolen && p.pub && p.sec) {
              return (
                <Fragment key={p.groupId}>
                  {renderMarker(p.sec, "SECRET", true, true)}
                  {renderMarker(p.pub, "PUBLIC", false, true)}
                </Fragment>
              );
            }
            const displayV = p.pub || p.sec;
            if (!displayV) return null;
            return <Fragment key={p.groupId}>{renderMarker(displayV, "MAIN", false, isStolen)}</Fragment>;
          })}

          {selected && (
            <Popup
              latitude={parseFloat(selected.latitude)}
              longitude={parseFloat(selected.longitude)}
              anchor="bottom"
              closeButton={false}
              closeOnClick={false}
              className="z-50"
              offset={20}
            >
              <div
                className={`bg-[#0f0f11] text-white border ${
                  selected.isStolen ? "border-red-500 shadow-red-500/20" : "border-[#222]"
                } p-4 rounded-3xl shadow-2xl flex flex-col gap-3 min-w-[240px]`}
              >
                <div
                  className={`flex justify-between items-start gap-4 pb-3 border-b ${
                    selected.isStolen ? "border-red-500/30" : "border-[#222]"
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span
                      className={`text-[10px] uppercase tracking-widest font-bold ${
                        selected.isStolen ? "text-red-400" : "text-[#aaa]"
                      }`}
                    >
                      Status
                    </span>
                    <span className="font-extrabold text-lg flex items-center gap-2">
                      <FiBox className={selected.isStolen ? "text-red-500" : "text-theme-accent"} />
                      {selected.isStolen ? "THEFT DIVERGENCE" : "Tracking OK"}
                    </span>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${selected.isStolen ? "bg-red-500" : "bg-emerald-500"} animate-pulse mt-1`}
                  />
                </div>

                <div
                  className={`flex flex-col gap-1 text-sm bg-[#18181A] p-3 rounded-xl border ${
                    selected.isStolen
                      ? "border-red-500/30"
                      : selected.isUnregistered
                        ? "border-gray-500/30"
                        : "border-[#222]"
                  }`}
                >
                  {selected.isUnregistered ? (
                    <div className="flex flex-col items-center justify-center py-4 opacity-50">
                      <span className="font-bold text-[#888]">GPS NOT REGISTERED</span>
                      <span className="text-xs">No driver info available</span>
                    </div>
                  ) : (
                    <>
                      {selected.rental?.carImageURLs?.length > 0 && (
                        <div className="w-full h-[100px] mb-2 rounded-lg overflow-hidden border border-[#333]">
                          <img src={selected.rental.carImageURLs[0]} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#888] font-semibold">Car</span>
                        <span className="font-bold text-sky-400">
                          {selected.rental ? `${selected.rental.carName} ${selected.rental.carModel}` : "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#333]">
                        <span className="text-xs text-[#888] font-semibold">Driver</span>
                        {selected.renter ? (
                          <div className="flex items-center gap-2">
                            {selected.renter.imageUrl && <img src={selected.renter.imageUrl} className="w-5 h-5 rounded-full object-cover" alt="" />}
                            <span className="font-bold text-[#eee]">{selected.renter.name}</span>
                          </div>
                        ) : selected.renteeClerkId && userMap[selected.renteeClerkId] ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={userMap[selected.renteeClerkId].imageUrl}
                              className="w-5 h-5 rounded-full object-cover"
                              alt=""
                            />
                            <span className="font-bold text-[#eee]">{userMap[selected.renteeClerkId].name}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-[#eee]">{selected.renteeClerkId || "No active renter"}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#888] font-semibold">Owner</span>
                        {selected.owner ? (
                          <div className="flex items-center gap-2">
                            {selected.owner.imageUrl && <img src={selected.owner.imageUrl} className="w-5 h-5 rounded-full object-cover" alt="" />}
                            <span className="font-bold text-[#aaa] text-xs">{selected.owner.name}</span>
                          </div>
                        ) : selected.rental?.carOwnerClerkId && userMap[selected.rental.carOwnerClerkId] ? (
                          <span className="font-bold text-[#aaa] text-xs">
                            {userMap[selected.rental.carOwnerClerkId].name}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-1 gap-3">
                        <span className="text-xs text-[#888] font-semibold shrink-0">PUB Track</span>
                        <span
                          className={`font-bold text-right text-xs ${
                            selected.pub ? (selected.isStolen ? "text-purple-400" : "text-sky-400") : "text-[#555]"
                          }`}
                        >
                          {selected.pub ? (
                            <PlaceName lat={selected.pub.latitude} lng={selected.pub.longitude} className="font-bold" />
                          ) : (
                            "OFFLINE"
                          )}
                        </span>
                      </div>
                      {isAdmin && <div className="flex justify-between items-center mt-1 gap-3">
                        <span className="text-xs text-[#888] font-semibold shrink-0">SEC Track</span>
                        <span
                          className={`font-bold text-right text-xs ${
                            selected.sec ? (selected.isStolen ? "text-red-400" : "text-sky-400") : "text-[#555]"
                          }`}
                        >
                          {selected.sec ? (
                            <PlaceName lat={selected.sec.latitude} lng={selected.sec.longitude} className="font-bold" />
                          ) : (
                            "OFFLINE"
                          )}
                        </span>
                      </div>}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[#666] flex items-center gap-1 uppercase tracking-widest font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Sync: {new Date(selected.updatedAt).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-xs font-bold px-3 py-1 bg-[#222] text-[#eee] rounded-full hover:bg-[#333] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {isAdmin && <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
          <div className="backdrop-blur-md bg-[#0f0f11bc] border border-theme-border/50 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
            <div className="p-2 bg-theme-accent/20 rounded-full text-theme-accent">
              <FiList />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-theme-text/60">Live Feed</span>
              <span className="font-black text-theme-text text-xl leading-none">
                {assignedCars} {assignedCars === 1 ? "Car" : "Cars"}
              </span>
              <span className="text-[10px] text-theme-text/45 font-semibold mt-0.5">
                {unassignedUnits} unassigned {unassignedUnits === 1 ? "unit" : "units"}
              </span>
            </div>
          </div>
          {showPlaces && (
            <p className="text-[10px] uppercase font-bold text-theme-text/40 bg-[#0f0f11bc] px-2 py-1 rounded-lg backdrop-blur-md">
              {nearbyPlaces.length} nearby places
            </p>
          )}
          <p className="text-[10px] uppercase font-bold text-theme-text/30 bg-[#0f0f11bc] px-2 py-1 rounded-lg backdrop-blur-md">
            Last Hour Trajectories
          </p>
        </div>}
      </div>
    </div>
  );
}
