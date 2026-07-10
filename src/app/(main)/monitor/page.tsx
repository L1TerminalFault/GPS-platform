"use client";

import Map, { Marker, Popup, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import { useState, useEffect, useMemo, useRef } from "react";
import { FiLayers, FiList, FiNavigation, FiMaximize, FiMinimize, FiBox } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";

const mapStyles = {
  liberty: { name: "Liberty", url: "https://tiles.openfreemap.org/styles/liberty" },
  bright: { name: "Bright", url: "https://tiles.openfreemap.org/styles/bright" },
  positron: { name: "Positron", url: "https://tiles.openfreemap.org/styles/positron" },
  dark: { name: "Dark", url: "https://tiles.openfreemap.org/styles/dark" },
  fiord: { name: "Fiord", url: "https://tiles.openfreemap.org/styles/fiord" },
  americana: { name: "Americana 3D", url: "https://americanamap.org/style.json" },
  versatiles: { name: "Versatiles Colorful", url: "https://tiles.versatiles.org/assets/styles/colorful/style.json" },
  cartopositron: { name: "Carto Positron", url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
  cartodark: { name: "Carto Dark Matter", url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
  cartovoyager: { name: "Carto Voyager", url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" },
};

type VehicleData = {
  _id: string;
  carGPSIMEI: string;
  latitude: string;
  longitude: string;
  updatedAt: string;
};

// Custom Hook to manage fetching and paths
function useVehicleTracker() {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [history, setHistory] = useState<Record<string, number[][]>>({});

  useEffect(() => {
    let active = true;
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/logs");
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        
        if (active) {
          setVehicles(data);
          setHistory(prev => {
            const next = { ...prev };
            data.forEach((v: VehicleData) => {
              if (!next[v.carGPSIMEI]) next[v.carGPSIMEI] = [];
              next[v.carGPSIMEI] = [...next[v.carGPSIMEI], [parseFloat(v.longitude), parseFloat(v.latitude)]];
              // Keep last hour of points (visually limited to 60 for performance in UI)
              if (next[v.carGPSIMEI].length > 60) {
                next[v.carGPSIMEI] = next[v.carGPSIMEI].slice(-60);
              }
            });
            return next;
          });
        }
      } catch (err) {
        console.error("Error fetching vehicles:", err);
      }
    };

    fetchLocations();
    const interval = setInterval(fetchLocations, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { vehicles, history };
}

export default function Home() {
  const { vehicles, history } = useVehicleTracker();
  const [selected, setSelected] = useState<VehicleData | null>(null);
  
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
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && mapContainerRef.current) {
       mapContainerRef.current.requestFullscreen().catch(err => console.error(err));
    } else if (document.fullscreenElement) {
       document.exitFullscreen();
    }
  };

  // Generate GeoJSON for paths
  const pathGeoJson = useMemo(() => {
    return {
      type: "FeatureCollection" as const,
      features: Object.entries(history).map(([key, coords]) => ({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: coords,
        },
        properties: { id: key }
      }))
    };
  }, [history]);

  return (
    <div ref={containerRef} className="flex flex-col w-full h-[calc(100vh-100px)] p-6 pt-2">
      {/* Global styles to override mapbox popup defaults */}
      <style dangerouslySetInnerHTML={{__html: `
        .maplibregl-popup-content, .mapboxgl-popup-content {
           background: transparent !important;
           padding: 0 !important;
           box-shadow: none !important;
        }
        .maplibregl-popup-tip, .mapboxgl-popup-tip {
           display: none !important;
        }
      `}} />

      {/* Header */}
      <div className="flex w-full items-end justify-between border-b border-theme-border/50 pb-4 mb-4 shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <FiNavigation className="text-theme-accent" /> Fleet Monitor
          </h2>
          <p className="text-theme-text/50">Tracking {vehicles.length} components ({vehicles.length / 2} vehicles) in real-time</p>
        </div>
        
        <div className="flex items-center gap-3 relative">
          
          <button 
             onClick={() => setIs3D(!is3D)}
             className={`px-4 py-2 border rounded-full font-bold text-sm transition-colors ${is3D ? 'bg-theme-accent text-white border-theme-accent/50' : 'bg-theme-card border-theme-border text-theme-text/60'}`}
          >
             {is3D ? '3D View' : '2D View'}
          </button>
          
          <button 
             onClick={toggleFullscreen}
             className="p-2 border border-theme-border rounded-full hover:bg-theme-card transition-colors shadow-sm bg-theme-background"
          >
             {isFullscreen ? <FiMinimize /> : <FiMaximize />}
          </button>

          {/* Map Style Selector */}
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
                  className="absolute right-0 top-full bg-[#0f0f11bc] mt-2 z-50 min-w-[220px] /bg-theme-card border border-theme-border/50 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl"
                >
                  <div className="p-3 border-b border-theme-border/50">
                    <span className="text-xs uppercase tracking-widest font-bold text-theme-text/50">Map Style</span>
                  </div>
                  {Object.entries(mapStyles).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => { setCurrentStyle(key); setShowStylePicker(false); }}
                      className={`w-full text-left px-4 py-3 hover:bg-theme-accent/10 transition-colors ${key === currentStyle ? "bg-theme-accent/20 text-theme-accent font-bold" : "text-theme-text"}`}
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

      <div ref={mapContainerRef} className={`w-full flex-1 bg-theme-card overflow-hidden shadow-xl border border-theme-border/30 relative ${isFullscreen ? 'rounded-none' : 'rounded-[32px]'}`}>
        <Map
          initialViewState={{
            latitude: 9.03,
            longitude: 38.75,
            zoom: 12,
            pitch: is3D ? 45 : 0, 
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyles[currentStyle as keyof typeof mapStyles].url}
        >
          <NavigationControl position="bottom-right" />
          
          {/* Paths Layer */}
          <Source id="paths" type="geojson" data={pathGeoJson}>
            <Layer 
              id="path-lines" 
              type="line" 
              source="paths" 
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{ "line-color": "#0ea5e9", "line-width": 4, "line-opacity": 0.8 }} 
            />
          </Source>

          {vehicles.map((v) => {
             const isSecret = v.carGPSIMEI.startsWith('SEC_');
             const carId = v.carGPSIMEI.split('_')[1];
             return (
              <Marker
                key={v._id}
                latitude={parseFloat(v.latitude)}
                longitude={parseFloat(v.longitude)}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelected({ ...v, carGPSIMEI: `${isSecret ? 'Secret Backup' : 'Primary GPS'} (Car ${carId})` });
                }}
              >
                <div className={`relative group cursor-pointer drop-shadow-xl hover:scale-110 transition-transform ${isSecret ? 'opacity-80 scale-75' : ''}`}>
                  {/* 3D styling pulse effect */}
                  <span className={`absolute w-3 h-3 rounded-full animate-ping -z-10 bottom-1 left-1/2 -translateX-1/2 ${isSecret ? 'bg-red-500/40' : 'bg-theme-accent/60'}`} />
                  <div className="flex flex-col items-center">
                    {!isSecret && (
                       <div className="bg-[#111] text-emerald-400 border border-theme-border/30 font-black text-[10px] px-1.5 py-0.5 rounded shadow mb-1">
                         CAR-{carId}
                       </div>
                    )}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 21.5C12.5 21.5 21.5 12 21.5 7.5C21.5 3.5 17.5 -0.5 12 -0.5C6.5 -0.5 2.5 3.5 2.5 7.5C2.5 12 11.5 21.5 12 21.5Z"
                        fill={isSecret ? "#ef4444" : "#0ea5e9"}
                      />
                      <circle cx="12" cy="7.5" r="4" fill="#111" />
                    </svg>
                  </div>
                </div>
              </Marker>
             );
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
              <div className="bg-[#0f0f11] text-white border border-[#222] p-4 rounded-3xl shadow-2xl flex flex-col gap-3 min-w-[240px]">
                <div className="flex justify-between items-start gap-4 pb-3 border-b border-[#222]">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-[#aaa] font-bold">Tracker Type</span>
                    <span className="font-extrabold text-lg flex items-center gap-2">
                       <FiBox className="text-theme-accent" /> {selected.carGPSIMEI}
                    </span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1" />
                </div>
                
                <div className="flex flex-col gap-1 text-sm bg-[#18181A] p-3 rounded-xl border border-[#222]">
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-[#888] font-semibold">Current Renter</span>
                     <span className="font-bold text-[#eee]">{parseInt(selected.carGPSIMEI.replace(/\D/g, '')) % 2 === 0 ? "John Doe (user_1)" : "Available"}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                     <span className="text-xs text-[#888] font-semibold">Location Prefix</span>
                     <span className="font-mono text-sky-400 font-bold">{parseFloat(selected.latitude).toFixed(4)}, {parseFloat(selected.longitude).toFixed(4)}</span>
                  </div>
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
        
        {/* Floating Stat Overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
          <div className="backdrop-blur-md /bg-theme-card/80 bg-[#0f0f11bc] border border-theme-border/50 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
             <div className="p-2 bg-theme-accent/20 rounded-full text-theme-accent">
               <FiList />
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] font-bold uppercase tracking-widest text-theme-text/60">Live Feed</span>
               <span className="font-black text-theme-text text-xl leading-none">{vehicles.length / 2} Cars Tracked</span>
             </div>
          </div>
          <p className="text-[10px] uppercase font-bold text-theme-text/30 bg-[#0f0f11bc] /bg-theme-card/80 px-2 py-1 rounded-lg backdrop-blur-md">Last Hour Trajectories</p>
        </div>
      </div>
    </div>
  );
}
