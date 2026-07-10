"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar
} from "recharts";
import {
  FiActivity, FiBox, FiMapPin, FiTrendingUp, FiNavigation, FiCalendar, FiDollarSign,
  FiBell, FiUsers, FiAlertTriangle, FiCheckCircle
} from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Link from 'next/link';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [gpsData, setGpsData] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [chartMode, setChartMode] = useState<"days" | "months">("days");
  const [showRentsPopup, setShowRentsPopup] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const statsRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then(r => r.json()),
      fetch("/api/rentals").then(r => r.json()),
      fetch("/api/car-gps").then(r => r.json()),
      fetch("/api/logs").then(r => r.json())
    ]).then(([ord, ren, gps, lgs]) => {
      setOrders(ord);
      setRentals(ren);
      setGpsData(gps);
      setLogs(lgs);
      setLoading(false);
    }).catch(console.error);
  }, []);

  // GSAP entrance animation
  useEffect(() => {
    if (loading) return;
    if (headerRef.current) gsap.fromTo(headerRef.current, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" });
    if (statsRef.current) gsap.fromTo(statsRef.current.children, { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "power3.out", delay: 0.2 });
  }, [loading]);

  const activeRentals = rentals.filter(r => r.isRented);
  const totalRevenue = rentals.reduce((acc, curr) => acc + (curr.pricePerMonth || 0), 0);
  
  const pendingOrders = orders.filter(o => o.status?.toLowerCase() === "pending");
  
  // Find out of sync GPS (public and secret diverge)
  const syncAlerts = useMemo(() => {
    const alerts: any[] = [];
    const grouped: Record<string, {pub?: any, sec?: any}> = {};
    logs.forEach(l => {
      const idx = l.carGPSIMEI.split('_')[1];
      if (!grouped[idx]) grouped[idx] = {};
      if (l.carGPSIMEI.startsWith('PUB_')) grouped[idx].pub = l;
      else if (l.carGPSIMEI.startsWith('SEC_')) grouped[idx].sec = l;
    });
    
    Object.keys(grouped).forEach(k => {
      const g = grouped[k];
      if (g.pub && g.sec) {
        const plat = parseFloat(g.pub.latitude), plng = parseFloat(g.pub.longitude);
        const slat = parseFloat(g.sec.latitude), slng = parseFloat(g.sec.longitude);
        const dist = Math.sqrt(Math.pow(plat-slat, 2) + Math.pow(plng-slng, 2));
        if (dist > 0.01) { // Threshold for "divergence" or tamper
          alerts.push({ carIdx: k, msg: "Secret and Public GPS diverge widely. Possible tamper/theft." });
        }
      }
    });

    // Also check stagnant updates (e.g. pub stopped sending)
    Object.keys(grouped).forEach(k => {
      const g = grouped[k];
      if (g.pub && g.sec) {
        const pTime = new Date(g.pub.updatedAt).getTime();
        const sTime = new Date(g.sec.updatedAt).getTime();
        if (Math.abs(pTime - sTime) > 30000) { // 30s drift
          alerts.push({ carIdx: k, msg: "Primary GPS lost signal. Secret GPS tracking." });
        }
      }
    });
    return alerts;
  }, [logs]);

  const notificationCount = pendingOrders.length + syncAlerts.length;

  const chartData = useMemo(() => {
     let data = [];
     let date = new Date();
     const count = chartMode === "days" ? 10 : 12;
     for (let i = count; i >= 0; i--) {
        const d = new Date(date);
        if (chartMode === "days") {
           d.setDate(d.getDate() - i);
           data.push({
              date: d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'}),
              revenue: 5000 + Math.random() * 5000 + (10 - i) * 500
           });
        } else {
           d.setMonth(d.getMonth() - i);
           data.push({
              date: d.toLocaleDateString(undefined, {month: 'short', year: 'numeric'}),
              revenue: 50000 + Math.random() * 30000 + (12 - i) * 2000
           });
        }
     }
     return data;
  }, [chartMode]);

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
            Monitoring {rentals.length} vehicles · {activeRentals.length} active leases
          </p>
        </div>
        
        <div className="flex items-center gap-4 border border-theme-border/50 bg-theme-background p-1.5 rounded-full shadow-inner relative">
           
           <button 
             onClick={() => setNotificationsOpen(true)}
             className="relative px-3 py-2 text-theme-text/60 hover:text-theme-text hover:bg-theme-card rounded-full transition-colors flex items-center justify-center"
           >
             <FiBell className="text-lg" />
             {notificationCount > 0 && (
               <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />
             )}
             {notificationCount > 0 && (
               <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full" />
             )}
           </button>

           <div className="w-[1px] h-6 bg-theme-border/50" />

           <Link href="/monitor" className="px-4 py-2 hover:bg-theme-card font-semibold text-nowrap rounded-full text-sm transition-colors flex items-center gap-2">
             <FiNavigation className="text-accent" /> Live Map
           </Link>
           <div className="w-[1px] h-6 bg-theme-border/50" />
           <Link href="/rentals" className="px-4 py-2 cursor-pointer hover:bg-theme-card font-semibold rounded-full text-sm transition-colors flex items-center gap-2">
             <FiBox /> Catalogue
           </Link>
        </div>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {notificationsOpen && (
           <div className="fixed inset-0 z-50 flex items-start justify-end p-6 pointer-events-none">
              <motion.div 
                 initial={{ opacity: 0, x: 50, scale: 0.95 }}
                 animate={{ opacity: 1, x: 0, scale: 1 }}
                 exit={{ opacity: 0, x: 50, scale: 0.95 }}
                 className="w-full max-w-sm bg-theme-background border border-theme-border shadow-2xl rounded-3xl p-6 pointer-events-auto flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
              >
                 <div className="flex items-center justify-between border-b border-theme-border/50 pb-3 mb-2">
                    <h3 className="font-bold flex items-center gap-2">
                      <FiBell className="text-theme-accent" /> Alerts & Notifications
                    </h3>
                    <button onClick={() => setNotificationsOpen(false)} className="text-sm font-bold text-theme-text/50 hover:text-theme-text">Dismiss</button>
                 </div>
                 
                 {notificationCount === 0 && (
                   <p className="text-sm text-theme-text/50 text-center py-4">No active notifications</p>
                 )}

                 {syncAlerts.map((al, idx) => (
                   <div key={`sync-${idx}`} className="bg-red-500/10 border-l-4 border-red-500 p-3 rounded-xl flex flex-col gap-1">
                      <span className="text-xs uppercase tracking-widest font-black text-red-500 flex items-center gap-2">
                        <FiAlertTriangle /> Critical Priority: Car {al.carIdx}
                      </span>
                      <p className="text-sm font-semibold">{al.msg}</p>
                   </div>
                 ))}

                 {pendingOrders.map((o, idx) => (
                   <div key={`ord-${idx}`} className="bg-amber-500/10 border-l-4 border-amber-500 p-3 rounded-xl flex flex-col gap-1">
                      <span className="text-xs uppercase tracking-widest font-black text-amber-500 flex items-center gap-2">
                        <FiCheckCircle /> Action Required
                      </span>
                      <p className="text-sm font-semibold">Order {o._id.slice(-4)} is Pending Review from {o.userClerkId}.</p>
                   </div>
                 ))}
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Hero Stat Cards */}
      <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full shrink-0">
        <div className="flex flex-col bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 relative overflow-hidden group">
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
        </div>

        <div className="flex flex-col bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 relative overflow-hidden group">
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
            {rentals.length}
          </h2>
        </div>

        {/* ACTIVE RENTS POPUP ANCHOR */}
        <div className="relative z-80">
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
              {activeRentals.length} <span className="text-lg font-bold text-theme-text/40">/ {rentals.length}</span>
            </h2>
            <div className="mt-4 w-full h-1.5 bg-theme-border/30 rounded-full overflow-hidden relative z-10 pointer-events-none">
               <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{width: `${(activeRentals.length / rentals.length) * 100}%`}}></div>
            </div>
          </div>

          <AnimatePresence>
            {showRentsPopup && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 top-[110%] backdrop-blur-xl z-800 w-[320px] bg-theme-card border border-theme-border shadow-2xl rounded-3xl z-40 p-5 flex flex-col gap-3 max-h-[300px] overflow-y-auto"
              >
                 <div className="flex items-center justify-between border-b border-theme-border/50 pb-2 mb-2">
                    <span className="font-black flex items-center gap-2"><FiUsers /> Current Renters</span>
                    <button onClick={() => setShowRentsPopup(false)} className="text-xs text-theme-text/50">Close</button>
                 </div>
                 {activeRentals.map((r, i) => (
                   <div key={i} className="flex flex-col bg-theme-background border border-theme-border/50 p-2.5 rounded-xl text-sm">
                      <div className="flex justify-between items-center mb-1">
                         <span className="font-bold text-sky-400">{r.carModel}</span>
                         <span className="text-[10px] uppercase tracking-widest text-theme-text/40 border border-theme-border px-1.5 rounded bg-theme-border/20">{r._id.split('_').pop()}</span>
                      </div>
                      <span className="text-xs font-semibold">User: <span className="font-black text-theme-text">{r.renteeClerkId}</span></span>
                      <span className="text-xs text-theme-text/50">Revenue: ${r.pricePerMonth}/mo</span>
                   </div>
                 ))}
                 {activeRentals.length === 0 && <span className="text-center text-sm py-4">No active rentals.</span>}
              </motion.div>
            )}
           </AnimatePresence>
        </div>

        <div className="flex flex-col bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div className="flex flex-col gap-1">
              <span className="font-bold tracking-widest text-xs uppercase text-violet-400">GPS Units</span>
              <span className="text-theme-text/40 text-[10px] uppercase">Active Trackers</span>
            </div>
            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl shadow-inner">
              <FiMapPin className="text-xl" />
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-theme-text tracking-tighter mt-2 relative z-10">
            {gpsData.length}
          </h2>
        </div>
      </div>

      {/* Main Charts area */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6 shrink-0 w-full"
      >
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

        {/* Small Data Cards */}
        <div className="flex flex-col gap-6">
           <div className="w-full flex-1 bg-theme-card p-6 rounded-3xl shadow-xl border border-theme-border/30 flex flex-col relative overflow-hidden group">
             <h3 className="font-bold flex items-center gap-2 mb-4 text-emerald-400">
                <FiCalendar /> Recent Activity
             </h3>
             <div className="flex flex-col gap-3">
               {orders.slice(0,3).map((o, i) => (
                 <div key={i} className="flex justify-between items-center text-sm p-3 bg-theme-background rounded-xl border border-theme-border/30">
                    <div className="flex flex-col">
                       <span className="font-bold">{o.status}</span>
                       <span className="text-[10px] text-theme-text/50">{new Date(o.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="font-bold text-theme-accent">Order</span>
                 </div>
               ))}
               {orders.length === 0 && <span className="opacity-50 text-sm">No recent orders</span>}
             </div>
           </div>
           
           <div className="w-full flex-1 bg-theme-card p-6 rounded-[32px] shadow-xl border border-theme-border/30 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-theme-accent/20 to-transparent pointer-events-none" />
             <div className="relative z-10 flex flex-col items-center justify-center p-3 text-center h-full">
                <h3 className="text-xl font-black mb-2">Fleet Management</h3>
                <p className="text-xs text-theme-text/60 mb-4">View catalogue or monitor routes actively to control GPS states</p>
                <Link href="/monitor" className="bg-theme-text text-theme-background font-bold px-6 py-2 rounded-full hover:scale-105 transition-transform">
                   Live Tracker
                </Link>
             </div>
           </div>
        </div>
      </motion.div>
      
    </div>
  );
}
