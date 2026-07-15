"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  FiActivity, FiBox, FiMapPin, FiTrendingUp, FiNavigation, FiCalendar, FiDollarSign,
  FiBell, FiUsers, FiAlertTriangle, FiCheckCircle, FiClock, FiShield, FiX, FiPlus, FiSave
} from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Link from 'next/link';
import { io } from "socket.io-client";
import { useAppStore, useToastStore } from "@/lib/store";

export default function HomePage() {
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata as any)?.role === "admin";

  const { usersMap: userMap, ensureRentals, ensureOrders, ensureGpsRegistry, resolveUsers, rentals, orders } = useAppStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [liveGpsData, setLiveGpsData] = useState<any[]>([]);
  
  const [chartMode, setChartMode] = useState<"days" | "months">("days");
  const [showRentsPopup, setShowRentsPopup] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [showGpsPopup, setShowGpsPopup] = useState(false);
  const [registerForm, setRegisterForm] = useState({ imei: "", rentalId: "", isSecret: false });
  const [submittingGps, setSubmittingGps] = useState(false);
  
  const statsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const activeRentsRef = useRef<HTMLDivElement>(null);
  const gpsPaletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeRentsRef.current && !activeRentsRef.current.contains(event.target as Node)) {
        setShowRentsPopup(false);
      }
      if (gpsPaletteRef.current && !gpsPaletteRef.current.contains(event.target as Node)) {
        setShowGpsPopup(false);
      }
    };
    if (showRentsPopup || showGpsPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showRentsPopup, showGpsPopup]);

  useEffect(() => {
    // Live socket payloads are fleet-wide. Non-admins use only authorized API data.
    const socket = isAdmin ? io() : null;
    socket?.on('gps-update', (data: any[]) => {
      setLiveGpsData(Array.isArray(data) ? data : []);
    });

    Promise.all([
      ensureOrders(),
      ensureRentals(),
      ensureGpsRegistry(),
    ]).then(([ord, ren, gps]) => {
      const clerkIds = [...new Set([
          ...ord.map((o: any) => o.userClerkId), 
          ...ren.map((r: any) => r.carOwnerClerkId), 
          ...ren.map((r: any) => r.renteeClerkId),
          ...gps.map((g: any) => g.renteeClerkId)
      ].filter(Boolean))];
      
      resolveUsers(clerkIds).finally(() => setLoading(false));
    }).catch(() => setLoading(false));

    return () => { socket?.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // GSAP entrance animation
  useEffect(() => {
    if (loading) return;
    if (headerRef.current) gsap.fromTo(headerRef.current, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });
    if (statsRef.current) gsap.fromTo(statsRef.current.children, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "power3.out", delay: 0.2 });
  }, [loading]);

  // Role-based filtering
  const filteredOrders = useMemo(() => {
    if (isAdmin) return orders;
    return orders.filter(o => o.userClerkId === user?.id);
  }, [orders, isAdmin, user?.id]);

  const filteredRentals = useMemo(() => {
    if (isAdmin) return rentals;
    return rentals.filter(r => r.isMine);
  }, [rentals, isAdmin]);

  const activeRentals = filteredRentals.filter(r => r.isRented);
  const availableRentals = filteredRentals.filter(r => !r.isRented);
  // Projected revenue = monthly sum of currently active leases only
  const totalRevenue = activeRentals.reduce((acc, curr) => acc + (curr.pricePerMonth || 0), 0);

  const liveAssignedPublicGps = useMemo(() => {
    if (!liveGpsData.length) return 0;
    const publicImeis = new Set(rentals.map((r) => r.carGPSId).filter(Boolean));
    return liveGpsData.filter((g) => publicImeis.has(g.carGPSIMEI)).length;
  }, [liveGpsData, rentals]);
  
  const pendingOrders = filteredOrders.filter(o => o.status?.toLowerCase() === "pending");
  const deliveredOrders = filteredOrders.filter(o => o.status?.toLowerCase() === "delivered");
  const cancelledOrders = filteredOrders.filter(o => o.status?.toLowerCase() === "cancelled");
  
  // Find out of sync GPS (public and secret diverge) using rental schema
  const syncAlerts = useMemo(() => {
    const alerts: any[] = [];
    // For each rental that has both public and secret GPS assigned, check divergence
    filteredRentals.forEach(r => {
      if (!r.carGPSId || !r.carGPSSecretId) return;
      const pubData = liveGpsData.find(g => g.carGPSIMEI === r.carGPSId);
      const secData = liveGpsData.find(g => g.carGPSIMEI === r.carGPSSecretId);
      if (pubData && secData) {
        const plat = parseFloat(pubData.latitude), plng = parseFloat(pubData.longitude);
        const slat = parseFloat(secData.latitude), slng = parseFloat(secData.longitude);
        const dist = Math.sqrt(Math.pow(plat - slat, 2) + Math.pow(plng - slng, 2));
        const renteeName = r.renteeClerkId && userMap[r.renteeClerkId] ? userMap[r.renteeClerkId].name : (r.renteeClerkId || 'Unknown');
        if (dist > 0.01) {
          alerts.push({ rentalId: r._id, renteeName, carModel: `${r.carName} ${r.carModel}`, msg: `GPS trackers on ${r.carName} ${r.carModel} (rented by ${renteeName}) diverge widely. Possible tamper/theft.`, severity: "critical" });
        }
        const pTime = new Date(pubData.updatedAt).getTime();
        const sTime = new Date(secData.updatedAt).getTime();
        if (Math.abs(pTime - sTime) > 30000) {
          alerts.push({ rentalId: r._id, renteeName, carModel: `${r.carName} ${r.carModel}`, msg: `Primary GPS on ${r.carName} ${r.carModel} (rented by ${renteeName}) lost signal. Secret GPS still tracking.`, severity: "warning" });
        }
      }
    });
    return alerts;
  }, [liveGpsData, filteredRentals, userMap]);

  const isGpsRegistered = (imei: string) => {
    return rentals.some(r => r.carGPSId === imei || r.carGPSSecretId === imei);
  };

  const unregisteredGps = useMemo(() => {
    return liveGpsData.filter(g => !isGpsRegistered(g.carGPSIMEI));
  }, [liveGpsData, rentals]);

  const registeredGps = useMemo(() => {
    return liveGpsData.filter(g => isGpsRegistered(g.carGPSIMEI));
  }, [liveGpsData, rentals]);

  const handleRegisterGps = () => {
    // Note: Assignment now occurs directly from the rentals/[id]/page.tsx page
    // This popup only serves to display active unregistered modules for the admin to observe
  };

  const notificationCount = pendingOrders.length + syncAlerts.length;

  const chartData = useMemo(() => {
     const data: { date: string; revenue: number }[] = [];
     const now = new Date();
     const count = chartMode === "days" ? 10 : 12;
     // Same source as Projected Revenue: active leases' pricePerMonth
     const leases = activeRentals.map((r) => ({
       price: r.pricePerMonth || 0,
       startedAt: new Date(r.updatedAt || r.createdAt || 0).getTime(),
     }));

     for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now);

        if (chartMode === "days") {
           d.setHours(0, 0, 0, 0);
           d.setDate(d.getDate() - i);
           const dayEnd = d.getTime() + 24 * 60 * 60 * 1000 - 1;
           const revenue = leases
             .filter((l) => l.startedAt <= dayEnd)
             .reduce((acc, l) => acc + l.price / 30, 0);

           data.push({
              date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              revenue: Math.round(revenue),
           });
        } else {
           d.setDate(1);
           d.setHours(0, 0, 0, 0);
           d.setMonth(d.getMonth() - i + 1);
           d.setMilliseconds(-1); // end of target month
           const monthEnd = d.getTime();
           const revenue = leases
             .filter((l) => l.startedAt <= monthEnd)
             .reduce((acc, l) => acc + l.price, 0);

           const labelDate = new Date(now);
           labelDate.setDate(1);
           labelDate.setMonth(labelDate.getMonth() - i);
           data.push({
              date: labelDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
              revenue: Math.round(revenue),
           });
        }
     }
     return data;
  }, [chartMode, activeRentals]);

  // Pie chart data for order status
  const orderPieData = useMemo(() => [
    { name: "Pending", value: pendingOrders.length, color: "#f59e0b" },
    { name: "Delivered", value: deliveredOrders.length, color: "#10b981" },
    { name: "Cancelled", value: cancelledOrders.length, color: "#ef4444" },
  ].filter(d => d.value > 0), [pendingOrders, deliveredOrders, cancelledOrders]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-theme-text opacity-70">
        <CgSpinner className="animate-spin text-4xl mb-4 text-theme-accent" />
        <p className="animate-pulse font-bold tracking-widest uppercase text-sm">Loading Fleet Metrics...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-100px)] flex flex-col gap-6 p-6 px-4 md:px-8 overflow-y-auto pb-[100px] scrollbar-hidden relative">
      
      {/* Header */}
      <div ref={headerRef} className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-4 border-b border-theme-border/50 pb-6 pt-2">
        <div className="flex flex-col gap-2 w-full">
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <FiActivity className="text-theme-accent" /> Overview Dashboard
          </h2>
          <p className="text-theme-text/50">
            {isAdmin 
              ? `Managing ${rentals.length} vehicles · ${activeRentals.length} active leases`
              : `Your fleet: ${filteredRentals.length} vehicles · ${activeRentals.length} active`
            }
          </p>
        </div>
        
        <button 
          onClick={() => setNotificationsOpen(true)}
          className="relative p-3 /py-2 text-theme-text/60 hover:text-theme-text hover:bg-theme-card border border-theme-border/50 bg-theme-background rounded-full transition-colors flex items-center justify-center shadow-inner"
        >
          <FiBell className="text-lg" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          )}
          {notificationCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Notifications Panel — closable on outside click */}
      <AnimatePresence>
        {notificationsOpen && (
           <>
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm" 
               onClick={() => setNotificationsOpen(false)} 
             />
             <motion.div 
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                className="fixed right-6 top-6 z-[9999] w-full max-w-sm bg-theme-background border border-theme-border shadow-2xl rounded-3xl p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
             >
                <div className="flex items-center justify-between border-b border-theme-border/50 pb-3 mb-2">
                   <h3 className="font-bold flex items-center gap-2">
                     <FiBell className="text-theme-accent" /> Alerts & Notifications
                     {notificationCount > 0 && (
                       <span className="ml-1 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-black">{notificationCount}</span>
                     )}
                   </h3>
                   <button onClick={() => setNotificationsOpen(false)} className="p-1.5 rounded-full hover:bg-theme-card transition-colors">
                     <FiX className="text-lg" />
                   </button>
                </div>
                
                {notificationCount === 0 && (
                  <p className="text-sm text-theme-text/50 text-center py-4">No active notifications</p>
                )}

                {syncAlerts.map((al, idx) => (
                  <div key={`sync-${idx}`} className={`p-3 rounded-xl flex flex-col gap-1 ${al.severity === 'critical' ? 'bg-red-500/10 border-l-4 border-red-500' : 'bg-amber-500/10 border-l-4 border-amber-500'}`}>
                     <span className={`text-xs uppercase tracking-widest font-black flex items-center gap-2 ${al.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`}>
                       <FiAlertTriangle /> {al.severity === 'critical' ? 'Critical' : 'Warning'}: Renter {al.renteeName}
                     </span>
                     <p className="text-sm font-semibold">{al.msg}</p>
                  </div>
                ))}

                {pendingOrders.map((o, idx) => {
                  const userName = userMap[o.userClerkId]?.name || o.userClerkId;
                  return (
                  <div key={`ord-${idx}`} className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded-xl flex flex-col gap-1">
                     <span className="text-xs uppercase tracking-widest font-black text-amber-500 flex items-center gap-2">
                       <FiCheckCircle /> Action Required
                     </span>
                     <div className="flex items-center gap-2 mt-1">
                       <img src={userMap[o.userClerkId]?.imageUrl || `https://ui-avatars.com/api/?name=${userName}`} className="w-5 h-5 rounded-full object-cover border border-theme-border/50" alt="user" />
                       <p className="text-sm font-semibold">Order is Pending Review from <span className="font-bold text-amber-500">{userName}</span>.</p>
                     </div>
                  </div>
                )})}
             </motion.div>
           </>
        )}
      </AnimatePresence>

          {/* Order Status Breakdown */}
	  {!isAdmin && <div className="w-full flex-1 bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 flex flex-col relative overflow-hidden group">
            <h3 className="font-bold flex items-center gap-2 mb-4 text-sky-400">
               <FiCalendar /> Order Status
            </h3>
            {orderPieData.length > 0 ? (
              <div className="flex items-center gap-4 flex-1">
                <div className="w-[100px] h-[100px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={orderPieData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} strokeWidth={0}>
                        {orderPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-theme-text/70">{pendingOrders.length} Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-theme-text/70">{deliveredOrders.length} Delivered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="text-theme-text/70">{cancelledOrders.length} Cancelled</span>
                  </div>
                </div>
              </div>
            ) : (
              <span className="opacity-50 text-sm flex-1 flex items-center">No orders yet</span>
            )}
          </div>}

      {isAdmin && <>
      {/* Hero Stat Cards */}
      <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full shrink-0">
        {isAdmin && <div className="flex flex-col bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 text-theme-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
             <FiDollarSign size={160} />
          </div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="flex flex-col gap-1">
              <span className="font-bold tracking-widest text-xs uppercase text-emerald-400">Projected Revenue</span>
              <span className="text-theme-text/40 text-[10px] uppercase">Based on Active Leases</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl shadow-inner">
              <FiDollarSign className="text-xl" />
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-theme-text tracking-tighter mt-2 relative z-10">
            ${totalRevenue.toLocaleString()}
          </h2>
          <span className="text-xs text-emerald-400/60 mt-1">{activeRentals.length} active lease(s)</span>
        </div>}

        {isAdmin && <div className="flex flex-col bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 text-sky-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
             <FiBox size={140} />
          </div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="flex flex-col gap-1">
              <span className="font-bold tracking-widest text-xs uppercase text-sky-400">Total Fleet</span>
              <span className="text-theme-text/40 text-[10px] uppercase">Registered Vehicles</span>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl shadow-inner">
              <FiBox className="text-xl" />
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-theme-text tracking-tighter mt-2 relative z-10">
            {filteredRentals.length}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-theme-text/40">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> {availableRentals.length} available</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> {activeRentals.length} rented</span>
          </div>
        </div>}

        {/* ACTIVE RENTS POPUP ANCHOR */}
        <div className="relative z-20" ref={activeRentsRef}>
          <div 
            onClick={() => setShowRentsPopup(!showRentsPopup)} 
            className="flex flex-col h-full bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 relative overflow-hidden group cursor-pointer hover:border-theme-accent/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2 relative z-10 pointer-events-none">
              <div className="flex flex-col gap-1">
                <span className="font-bold tracking-widest text-xs uppercase text-amber-400">Active Rents</span>
                <span className="text-theme-text/40 text-[10px] uppercase group-hover:text-amber-400/80 transition-colors">Click for details</span>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl shadow-inner">
                <FiTrendingUp className="text-xl" />
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-theme-text tracking-tighter mt-2 relative z-10 pointer-events-none">
              {activeRentals.length} <span className="text-lg font-bold text-theme-text/40">/ {filteredRentals.length}</span>
            </h2>
            <div className="mt-4 w-full h-1.5 bg-theme-border/30 rounded-full overflow-hidden relative z-10 pointer-events-none">
               <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{width: `${filteredRentals.length ? (activeRentals.length / filteredRentals.length) * 100 : 0}%`}}></div>
            </div>
          </div>

          {/* Active Rents Popup — close on outside click handled by useEffect */}
          <AnimatePresence>
            {showRentsPopup && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 top-[110%] z-40 w-[320px] bg-theme-card backdrop-blur-xl border border-theme-border shadow-2xl rounded-3xl p-5 flex flex-col gap-3 max-h-[300px] overflow-y-auto"
                >
                   <div className="flex items-center justify-between border-b border-theme-border/50 pb-2 mb-2">
                      <span className="font-black flex items-center gap-2"><FiUsers /> Current Renters</span>
                      <button onClick={() => setShowRentsPopup(false)} className="p-1 rounded-full hover:bg-theme-background transition-colors">
                        <FiX className="text-sm" />
                      </button>
                   </div>
                   {activeRentals.map((r, i) => (
                     <div key={i} className="flex flex-col bg-theme-background border border-theme-border/50 p-2.5 rounded-xl text-sm">
                        <div className="flex justify-between items-center mb-1">
                           <span className="font-bold text-sky-400">{r.carModel}</span>
                           <span className="text-[10px] uppercase tracking-widest text-theme-text/40 border border-theme-border px-1.5 rounded bg-theme-border/20">{r._id?.toString().split('_').pop() || ''}</span>
                        </div>
                        {isAdmin && <span className="text-xs font-semibold flex items-center gap-1.5 mt-1">User:
                           {userMap[r.renteeClerkId] ? (
                              <div className="flex items-center gap-1.5"><img src={userMap[r.renteeClerkId].imageUrl} className="w-4 h-4 rounded-full object-cover" alt="rentee" /> <span className="font-black text-theme-text">{userMap[r.renteeClerkId].name}</span></div>
                           ) : (
                              <span className="font-black text-theme-text">{r.renteeClerkId}</span>
                           )}
                        </span>}
                        <span className="text-xs text-theme-text/50">Revenue: ${r.pricePerMonth}/mo</span>
                     </div>
                   ))}
                   {activeRentals.length === 0 && <span className="text-center text-sm py-4 text-theme-text/40">No active rentals.</span>}
                </motion.div>
              </>
            )}
           </AnimatePresence>
        </div>

        <div className="relative z-20" ref={gpsPaletteRef}>
          <div 
             onClick={() => setShowGpsPopup(!showGpsPopup)} 
             className="flex flex-col h-full bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 relative overflow-hidden group cursor-pointer hover:border-violet-500/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2 relative z-10 pointer-events-none">
              <div className="flex flex-col gap-1">
                <span className="font-bold tracking-widest text-xs uppercase text-violet-400">GPS Units</span>
                <span className="text-theme-text/40 text-[10px] uppercase group-hover:text-violet-400/80 transition-colors">Manage Tracker Registry</span>
              </div>
              <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl shadow-inner">
                <FiMapPin className="text-xl" />
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-theme-text tracking-tighter mt-2 relative z-10 pointer-events-none">
              {liveAssignedPublicGps}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-theme-text/40 pointer-events-none">
              <FiShield className="text-violet-400 shrink-0" />
              <span>{rentals.filter(r => r.carGPSSecretId).length} rentals with secret units</span>
              <span className={unregisteredGps.length > 0 ? "text-amber-500 font-bold" : undefined}>
                • {unregisteredGps.length} unassigned
              </span>
              <span className="text-violet-400 font-bold">• Total {liveGpsData.length}</span>
            </div>
          </div>

          <AnimatePresence>
            {showGpsPopup && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 top-[110%] md:right-0 md:left-auto z-40 w-[360px] bg-theme-card backdrop-blur-xl border border-theme-border shadow-2xl rounded-3xl p-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto"
              >
                 <div className="flex items-center justify-between border-b border-theme-border/50 pb-2 mb-1">
                    <span className="font-black flex items-center gap-2 text-violet-400"><FiMapPin /> GPS Configuration</span>
                    <button onClick={() => setShowGpsPopup(false)} className="p-1 rounded-full hover:bg-theme-background transition-colors">
                      <FiX className="text-sm" />
                    </button>
                 </div>
                 
                 {unregisteredGps.length > 0 ? (
                   <div className="flex flex-col gap-3">
                     <span className="text-xs uppercase font-bold text-amber-500 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                       Unregistered Trackers ({unregisteredGps.length})
                     </span>
                     
                     <div className="bg-theme-background border border-theme-border/50 rounded-xl p-3 flex flex-col gap-2 max-h-40 overflow-y-auto">
                       {unregisteredGps.map((g, i) => (
                           <div key={i} className="flex justify-between items-center text-xs border border-theme-border/30 rounded p-1.5 px-2">
                             <span className="font-mono text-amber-500 font-bold">{g.carGPSIMEI}</span>
                             <span className="text-theme-text/40 tracking-widest text-[10px] uppercase">Waiting for Assignment</span>
                           </div>
                       ))}
                     </div>
                   </div>
                 ) : (
                   <span className="text-xs text-theme-text/50">No unregistered trackers detected from socket.</span>
                 )}

                 {registeredGps.length > 0 && (
                   <div className="flex flex-col gap-2 border-t border-theme-border/50 pt-3">
                     <span className="text-[10px] uppercase font-bold text-theme-text/40 tracking-widest">Registered Trackers ({registeredGps.length})</span>
                     <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                        {registeredGps.map((g: any, i: number) => {
                           const rental = rentals.find((r: any) => r.carGPSId === g.carGPSIMEI || r.carGPSSecretId === g.carGPSIMEI);
                           const isSecret = rental ? rental.carGPSSecretId === g.carGPSIMEI : false;
                           return (
                          <div key={i} className="flex flex-col bg-theme-background border border-theme-border/30 p-2 rounded-xl text-xs">
                             <div className="flex justify-between items-center mb-1">
                                <span className={`font-mono font-bold ${isSecret ? 'text-red-400' : 'text-sky-400'}`}>{g.carGPSIMEI}</span>
                                <span className={`px-1.5 rounded uppercase tracking-widest border text-[8px] ${isSecret ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'}`}>
                                   {isSecret ? 'SECRET' : 'PUB'}
                                </span>
                             </div>
                             <span className="text-theme-text/50">Rental: <span className="font-semibold text-theme-text">{rental ? `${rental.carName} ${rental.carModel}` : 'Unknown'}</span></span>
                          </div>
                        )})}
                     </div>
                   </div>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Charts area */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6 shrink-0 w-full"
      >
        {/* Revenue Chart */}
        <div className="xl:col-span-2 w-full h-[360px] bg-theme-card p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col border border-theme-border/30 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-theme-accent animate-pulse"></div>
              <h3 className="text-lg font-bold tracking-wide">Revenue Flow</h3>
            </div>
            <div className="flex items-center gap-1 bg-theme-background border border-theme-border/50 rounded-full p-1">
               <button 
                 onClick={() => setChartMode("days")}
                 className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors ${chartMode === "days" ? "bg-theme-card shadow text-theme-text" : "text-theme-text/40 hover:text-theme-text"}`}
               >
                 Past 10 Days
               </button>
               <button 
                 onClick={() => setChartMode("months")}
                 className={`px-4 py-1.5 rounded-full text-xs font-black transition-colors ${chartMode === "months" ? "bg-theme-card shadow text-theme-text" : "text-theme-text/40 hover:text-theme-text"}`}
               >
                 Past 12 Months
               </button>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-theme-text/40 -mt-3 mb-3 font-bold">
            From active leases · current monthly ${totalRevenue.toLocaleString()}
          </p>
          
          <div className="flex-1 w-full min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accentSolid)" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="var(--accentSolid)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--borderCol)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--fg)" opacity={0.5} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--fg)" opacity={0.5} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--cardBg)', borderRadius: '12px', border: '1px solid var(--borderCol)', backdropFilter: 'blur(10px)' }} itemStyle={{ color: 'var(--fg)' }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--accentSolid)" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="Revenue Flow ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-6">
          {/* Order Status Breakdown */}
          <div className="w-full flex-1 bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 flex flex-col relative overflow-hidden group">
            <h3 className="font-bold flex items-center gap-2 mb-4 text-sky-400">
               <FiCalendar /> Order Status
            </h3>
            {orderPieData.length > 0 ? (
              <div className="flex items-center gap-4 flex-1">
                <div className="w-[100px] h-[100px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={orderPieData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} strokeWidth={0}>
                        {orderPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-theme-text/70">{pendingOrders.length} Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-theme-text/70">{deliveredOrders.length} Delivered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="text-theme-text/70">{cancelledOrders.length} Cancelled</span>
                  </div>
                </div>
              </div>
            ) : (
              <span className="opacity-50 text-sm flex-1 flex items-center">No orders yet</span>
            )}
          </div>

          {/* Recent Activity */}
          <div className="w-full flex-1 min-h-0 max-h-[220px] bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 flex flex-col relative overflow-hidden group">
            <h3 className="font-bold flex items-center gap-2 mb-4 text-emerald-400 shrink-0">
               <FiClock /> Recent Activity
            </h3>
            <div className="flex flex-col gap-3 overflow-y-auto min-h-0 pr-1">
              {filteredOrders.map((o, i) => {
                const statusColors: Record<string, string> = { 
                  pending: "text-amber-400", 
                  delivered: "text-emerald-400", 
                  cancelled: "text-red-400" 
                };
                return (
                  <div key={o._id || i} className="flex justify-between items-center text-sm p-3 bg-theme-background rounded-xl border border-theme-border/30 shrink-0">
                     <div className="flex flex-col">
                        <span className={`font-bold ${statusColors[o.status?.toLowerCase()] || 'text-theme-text'}`}>{o.status}</span>
                        <span className="text-[10px] text-theme-text/50">{new Date(o.createdAt).toLocaleDateString()}</span>
                     </div>
                     <span className="font-bold text-theme-accent">Order</span>
                  </div>
                );
              })}
              {filteredOrders.length === 0 && <span className="opacity-50 text-sm">No recent orders</span>}
            </div>
          </div>
        </div>
      </motion.div>

      </>}

      {/* Quick Actions Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0 w-full"
      >
        <div className="w-full bg-theme-card p-6 rounded-[32px] shadow-xl border border-theme-border/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-accent/20 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center justify-center p-3 text-center">
             <FiNavigation className="text-4xl text-theme-accent mb-3" />
             <h3 className="text-xl font-black mb-2">Fleet Monitoring</h3>
             <p className="text-xs text-theme-text/60 mb-4 max-w-xs">View real-time GPS positions and historical trajectories of your vehicles on the live map</p>
             <Link href="/monitor" className="bg-theme-text text-theme-background font-bold px-6 py-2 rounded-full hover:scale-105 transition-transform">
                Live Tracker
             </Link>
          </div>
        </div>
        
        <div className="w-full bg-theme-card p-6 rounded-[32px] shadow-xl border border-theme-border/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/15 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center justify-center p-3 text-center">
             <FiBox className="text-4xl text-sky-400 mb-3" />
             <h3 className="text-xl font-black mb-2">Rental Catalogue</h3>
             <p className="text-xs text-theme-text/60 mb-4 max-w-xs">Browse, list, and manage available cars for rent. Add new vehicles to expand your fleet</p>
             <Link href="/rentals" className="bg-theme-text text-theme-background font-bold px-6 py-2 rounded-full hover:scale-105 transition-transform">
                View Catalogue
             </Link>
          </div>
        </div>
      </motion.div>
      
    </div>
  );
}
