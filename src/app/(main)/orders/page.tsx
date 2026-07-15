"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import gsap from "gsap";
import { FiPackage, FiClock, FiCheck, FiX, FiTruck, FiXCircle, FiMapPin } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PlaceName } from "@/components/PlaceName";
import { useAppStore } from "@/lib/store";

export default function OrderPage() {
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata as any)?.role === "admin";

  const {
    orders,
    rentals: rentalsList,
    usersMap: userMap,
    ensureOrders,
    ensureRentals,
    resolveUsers,
    upsertOrder,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rentals = useMemo(() => {
    const map: Record<string, any> = {};
    rentalsList.forEach((r: any) => { map[r._id] = r; });
    return map;
  }, [rentalsList]);

  useEffect(() => {
    Promise.all([ensureOrders(), ensureRentals()])
      .then(([ordData]) => {
        const clerkIds = [...new Set(ordData.map((o: any) => o.userClerkId).filter(Boolean))];
        return resolveUsers(clerkIds);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    if (headerRef.current) gsap.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
    if (listRef.current) gsap.fromTo(listRef.current.children, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power3.out" });
  }, [loading]);

  // Role-based filtering
  const displayedOrders = isAdmin ? orders : orders.filter(o => o.userClerkId === user?.id);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: orderId, status: newStatus })
      });
      if (res.ok) {
        const updated = { _id: orderId, status: newStatus };
        upsertOrder(updated);
        if (selectedOrder?._id === orderId) {
          setSelectedOrder((prev: any) => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err) {
      console.error("Failed to update order:", err);
    }
    setUpdatingId(null);
  }, [selectedOrder, upsertOrder]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
     return (
       <div className="w-full h-[80vh] flex flex-col items-center justify-center p-6 text-theme-text opacity-70">
         <CgSpinner className="animate-spin text-4xl mb-4 text-theme-accent" />
         <p className="animate-pulse font-bold tracking-widest uppercase text-sm">Loading Order History...</p>
       </div>
     );
  }

  return (
    <div className="w-full min-h-screen p-6 px-4 md:px-8 pb-32 relative">
      <div ref={headerRef} className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <FiPackage className="text-theme-accent" /> Order Management
          </h2>
          <p className="text-theme-text/50">
            {isAdmin ? "Review and manage all vehicle rent transactions." : "Track your rental orders and their status."}
          </p>
        </div>
      </div>

      <div ref={listRef} className="flex flex-col gap-3 relative z-10">
        {displayedOrders.map((o, idx) => {
           let statusColor = "/bg-amber-500/10 text-amber-500 border-amber-500/20";
           let StatusIcon = FiClock;
           
           if (o.status?.toLowerCase() === "delivered") {
             statusColor = "/bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
             StatusIcon = FiCheck;
           } else if (o.status?.toLowerCase() === "cancelled") {
             statusColor = "/bg-red-500/10 text-red-500 border-red-500/20";
             StatusIcon = FiX;
           }

           const userData = userMap[o.userClerkId] || { name: o.userClerkId, imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(o.userClerkId)}&background=random&size=128&bold=true` };
           const isUpdating = updatingId === o._id;
           const orderRental = rentals[o.rentCatalogueId];
           const orderLocation = o.carInitLocation || orderRental?.carInitLocation;

           return (
             <div 
               key={o._id || idx} 
               onClick={() => setSelectedOrder(o)}
               className="flex items-center justify-between p-4 sm:p-5 bg-theme-card border border-theme-border/30 rounded-2xl shadow-md hover:shadow-lg hover:border-theme-border transition-all cursor-pointer group"
             >
               {/* LEFT: Avatar + Name + Time */}
               <div className="flex items-center gap-3 shrink-0">
                  <img 
                    src={userData.imageUrl} 
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full border-2 border-theme-border/50 object-cover shadow-md" 
                  />
                  <div className="flex flex-col gap-0.5">
                     <span className="text-sm font-bold">{userData.name}</span>
                     <span className="text-[10px] uppercase tracking-widest text-theme-text/40 flex items-center gap-1">
                       <FiClock className="text-[8px]" /> {formatTime(o.createdAt)}
                     </span>
                     {orderLocation && (
                       <span className="text-[11px] text-sky-400 flex items-center gap-1.5 max-w-[220px] truncate">
                         <FiMapPin className="shrink-0" />
                         <PlaceName coords={orderLocation} className="truncate" />
                       </span>
                     )}
                  </div>
               </div>

               {/* RIGHT: Status + Action Buttons */}
               <div className="flex items-center gap-3 shrink-0">
                  <div className={`px-3 py-1 flex items-center gap-1.5 rounded-full opacity-70 /border text-xs font-black uppercase tracking-wider ${statusColor}`}>
                     <StatusIcon className="text-xs" />
                     {o.status || 'Pending'}
                  </div>
                  
                  {o.status?.toLowerCase() === "pending" && (
                    <div className="flex items-center gap-1.5">
                      {isAdmin && <Link
                        href={`/rentals/${o.rentCatalogueId}?orderId=${o._id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 /border border-emerald-500/30 rounded-full text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                      >
                        <FiTruck className="text-xs" /> Deliver
                      </Link>}
                      <button
                        onClick={(e) => updateOrderStatus(o._id, "Cancelled", e)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 /border border-red-500/30 rounded-full text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <FiXCircle className="text-xs" /> Cancel
                      </button>
                    </div>
                  )}
               </div>
             </div>
           );
        })}

        {displayedOrders.length === 0 && (
          <div className="w-full flex-col flex items-center justify-center py-20 bg-theme-background/30 border border-dashed border-theme-border/40 rounded-3xl">
             <FiPackage className="text-4xl text-theme-text/20 mb-4" />
             <h3 className="text-lg font-bold text-theme-text/50">No orders found</h3>
             <Link href="/rentals" className="mt-4 px-6 py-2 bg-theme-accent text-white rounded-full font-bold shadow-lg shadow-theme-accent/20">Go to Rentals</Link>
          </div>
        )}
      </div>

      {/* Modal Popup for Order Details — full car data */}
      <AnimatePresence>
         {selectedOrder && (
           <>
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" 
               onClick={() => setSelectedOrder(null)} 
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-lg bg-theme-card border border-theme-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] overflow-y-auto"
             >
               {/* Car Image */}
               {rentals[selectedOrder.rentCatalogueId] ? (
                 <div className="w-full relative h-[200px] bg-theme-border/20 shrink-0">
                   <img 
                     src={rentals[selectedOrder.rentCatalogueId].carImageURL || rentals[selectedOrder.rentCatalogueId].carImageURLs?.[0]} 
                     alt="Car" 
                     className="w-full h-full object-cover" 
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-theme-card to-transparent" />
                   <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-colors backdrop-blur">
                      <FiX />
                   </button>
                 </div>
               ) : (
                 <div className="w-full relative p-6 bg-theme-border/10 flex justify-between items-start shrink-0">
                   <h3 className="font-bold text-xl">Order Details</h3>
                   <button onClick={() => setSelectedOrder(null)} className="bg-theme-background p-2 rounded-full hover:bg-theme-card transition-colors">
                      <FiX />
                   </button>
                 </div>
               )}
               
               <div className="p-6 flex flex-col gap-4 relative z-10 -mt-6">
                 {/* User info */}
                 <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-3">
                      <img src={userMap[selectedOrder.userClerkId]?.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedOrder.userClerkId)}&background=random&size=128&bold=true`} alt="User" className="w-14 h-14 rounded-full border-4 border-theme-card shadow-lg object-cover" />
                      <div className="flex flex-col">
                        <h3 className="text-lg font-bold">{userMap[selectedOrder.userClerkId]?.name || selectedOrder.userClerkId}</h3>
                        <span className="text-xs text-theme-text/50">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full opacity-70 text-xs font-bold uppercase tracking-widest /border ${
                      selectedOrder.status?.toLowerCase() === 'delivered' ? '/bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      selectedOrder.status?.toLowerCase() === 'cancelled' ? '/bg-red-500/10 text-red-400 border-red-500/30' :
                      '/bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                       {selectedOrder.status}
                    </span>
                 </div>
                 
                 {selectedOrder.details && (
                   <p className="text-sm text-theme-text/60 bg-theme-background/50 p-3 rounded-xl border border-theme-border/30">{selectedOrder.details}</p>
                 )}

                 {/* Full Car Details */}
                 <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-theme-border">
                    {rentals[selectedOrder.rentCatalogueId] ? (() => {
                      const car = rentals[selectedOrder.rentCatalogueId];
                      return (
                        <>
                          <span className="text-xs font-bold uppercase tracking-widest text-theme-text/40">Rented Vehicle</span>
                          <div className="bg-theme-background rounded-2xl p-4 shadow-inner border border-theme-border/30 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                               <div>
                                 <span className="text-xs text-theme-text/40 uppercase tracking-widest">{car.carName}</span>
                                 <h4 className="font-bold text-lg">{car.carModel}</h4>
                               </div>
                               <span className="font-mono text-sky-400 font-bold text-lg">${car.pricePerMonth}<span className="text-xs text-theme-text/40">/mo</span></span>
                            </div>
                            
                            {car.description && (
                              <p className="text-xs text-theme-text/60">{car.description}</p>
                            )}
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
			    {isAdmin && <div className="bg-theme-card p-2 rounded-lg">
                                <span className="text-theme-text/40 block mb-0.5">GPS IMEIs</span>
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold font-mono text-[11px] text-sky-400">{car.carGPSId || "—"}</span>
                                  <span className="font-bold font-mono text-[11px] text-red-400/80">{car.carGPSSecretId || "—"}</span>
                                </div>
                              </div>}
                              <div className="bg-theme-card p-2 rounded-lg">
                                <span className="text-theme-text/40 block mb-0.5">Status</span>
                                <span className={`font-bold ${car.isRented ? 'text-red-400' : 'text-emerald-400'}`}>{car.isRented ? 'Rented' : 'Available'}</span>
                              </div>
                              {(selectedOrder.carInitLocation || car.carInitLocation) && <div className="bg-theme-card p-2 rounded-lg col-span-2">
                                <span className="text-theme-text/40 block mb-0.5">Location</span>
                                <PlaceName coords={selectedOrder.carInitLocation || car.carInitLocation} className="font-bold text-[11px]" />
                              </div>}
                              <div className="bg-theme-card p-2 rounded-lg col-span-2">
                                <span className="text-theme-text/40 block mb-0.5">Last Service</span>
                                <span className="font-bold">{car.lastServiceDate ? new Date(car.lastServiceDate).toLocaleDateString() : '—'}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })() : (
                       <span className="text-xs text-theme-text/50">Car details unavailable</span>
                    )}
                 </div>

                 {/* Action buttons in popup */}
                 {selectedOrder.status?.toLowerCase() === "pending" && (
                   <div className="flex items-center gap-3 mt-2 pt-3 border-t border-theme-border/30">
                     {isAdmin && <Link
                       href={`/rentals/${selectedOrder.rentCatalogueId}?orderId=${selectedOrder._id}`}
                       onClick={(e) => e.stopPropagation()}
                       className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 /border border-emerald-500/30 rounded-xl font-bold text-sm hover:bg-emerald-500/20 transition-colors"
                     >
                       <FiTruck /> Deliver & Assign GPS
                     </Link>}
                     <button
                       onClick={(e) => updateOrderStatus(selectedOrder._id, "Cancelled", e)}
                       disabled={updatingId === selectedOrder._id}
                       className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 /border border-red-500/30 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                     >
                       <FiXCircle /> Cancel Order
                     </button>
                   </div>
                 )}
               </div>
             </motion.div>
           </>
         )}
      </AnimatePresence>

    </div>
  );
}
