"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { FiPackage, FiFilter, FiClock, FiCheck, FiX, FiMoreVertical } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function OrderPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [rentals, setRentals] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then(res => res.json()),
      fetch("/api/rentals").then(res => res.json())
    ]).then(([ordData, renData]) => {
        setOrders(ordData);
        // Build map for quick access
        const map: Record<string, any> = {};
        renData.forEach((r: any) => map[r._id] = r);
        setRentals(map);
        setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (headerRef.current) gsap.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
    if (listRef.current) gsap.fromTo(listRef.current.children, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power3.out" });
  }, [loading]);

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
            Review and track all vehicle rent transactions.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-theme-background border border-theme-border/50 text-sm font-bold rounded-full px-4 py-2 hover:bg-theme-card transition-colors">
             <FiFilter /> Filter Status
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex flex-col gap-3 relative z-10">
        {orders.map((o, idx) => {
           let statusColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
           let StatusIcon = FiClock;
           
           if (o.status?.toLowerCase() === "delivered") {
             statusColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
             StatusIcon = FiCheck;
           } else if (o.status?.toLowerCase() === "cancelled") {
             statusColor = "bg-red-500/10 text-red-500 border-red-500/20";
             StatusIcon = FiX;
           }

           return (
             <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-theme-card border border-theme-border/30 rounded-2xl shadow-md hover:shadow-lg hover:border-theme-border transition-all group">
               
               <div className="flex items-center gap-4 shrink-0 mb-4 sm:mb-0">
                  <div className={`p-3 rounded-full flex items-center justify-center border ${statusColor}`}>
                     <StatusIcon className="text-xl" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                     <span className="text-sm font-bold">{o.userClerkId}</span>
                     <span className="text-[10px] uppercase tracking-widest text-theme-text/40">{new Date(o.createdAt).toLocaleString()}</span>
                  </div>
               </div>

               <div className="flex flex-col sm:items-center gap-1 flex-1 px-4 border-l border-theme-border/30 ml-4 pl-4 sm:border-l-0 sm:ml-0 sm:pl-0 sm:mr-4 sm:pr-4 sm:border-r">
                 <span className="text-xs uppercase tracking-widest font-black text-theme-text/50 mt-1">Catalogue Item</span>
                 <span className="font-mono text-xs text-sky-400">{o.rentCatalogueId}</span>
               </div>
               
               <div className="flex items-center justify-between sm:justify-end gap-5 mt-4 sm:mt-0 pt-4 border-t border-theme-border/30 sm:pt-0 sm:border-t-0 shrink-0">
                 <div className={`px-3 py-1 flex items-center gap-2 rounded-full border text-xs font-black uppercase tracking-wider ${statusColor}`}>
                    {o.status || 'Pending'}
                 </div>
                 
                 {/* Clickable User Avatar */}
                 <button 
                   onClick={() => setSelectedOrder(o)}
                   className="relative group/avatar focus:outline-none focus:ring-2 focus:ring-theme-accent/50 rounded-full cursor-pointer hover:scale-105 transition-transform"
                   title="View User Order Details"
                 >
                    <img 
                      src={`https://ui-avatars.com/api/?name=${o.userClerkId}&background=random&size=128&bold=true`} 
                      alt="User Avatar"
                      className="w-10 h-10 rounded-full border-2 border-theme-card group-hover/avatar:border-theme-accent object-cover shadow-md" 
                    />
                 </button>
               </div>
             </div>
           );
        })}

        {orders.length === 0 && (
          <div className="w-full flex-col flex items-center justify-center py-20 bg-theme-background/30 border border-dashed border-theme-border/40 rounded-3xl">
             <FiPackage className="text-4xl text-theme-text/20 mb-4" />
             <h3 className="text-lg font-bold text-theme-text/50">No orders found</h3>
             <Link href="/rentals" className="mt-4 px-6 py-2 bg-theme-accent text-white rounded-full font-bold shadow-lg shadow-theme-accent/20">Go to Rentals</Link>
          </div>
        )}
      </div>

      {/* Modal Popup for Order Details */}
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
               className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-lg bg-theme-card border border-theme-border/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
             >
               {rentals[selectedOrder.rentCatalogueId] ? (
                 <div className="w-full relative h-[200px] bg-theme-border/20">
                   <img 
                     src={rentals[selectedOrder.rentCatalogueId].carImageURL} 
                     alt="Car" 
                     className="w-full h-full object-cover" 
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-theme-card to-transparent" />
                   <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-colors backdrop-blur">
                      <FiX />
                   </button>
                 </div>
               ) : (
                 <div className="w-full relative p-6 bg-theme-border/10 flex justify-between items-start">
                   <h3 className="font-bold text-xl">Order Details</h3>
                   <button onClick={() => setSelectedOrder(null)} className="bg-theme-background p-2 rounded-full hover:bg-theme-card transition-colors">
                      <FiX />
                   </button>
                 </div>
               )}
               
               <div className="p-6 flex flex-col gap-4 relative z-10 -mt-6">
                 {/* Avatar overlay */}
                 <div className="flex justify-between items-end mb-2">
                    <img src={`https://ui-avatars.com/api/?name=${selectedOrder.userClerkId}&background=random&size=128&bold=true`} alt="User" className="w-16 h-16 rounded-full border-4 border-theme-card shadow-lg" />
                    <span className="px-3 py-1 bg-theme-background border border-theme-border rounded-full text-xs font-bold uppercase tracking-widest text-theme-text/60">
                       {selectedOrder.status}
                    </span>
                 </div>
                 
                 <div className="flex flex-col">
                   <h3 className="text-xl font-bold">{selectedOrder.userClerkId}</h3>
                   <p className="text-sm text-theme-text/50">{selectedOrder.details}</p>
                 </div>

                 <div className="flex-col gap-2 mt-2 pt-4 border-t border-theme-border bg-theme-background rounded-2xl p-4 shadow-inner">
                    {rentals[selectedOrder.rentCatalogueId] ? (
                      <>
                        <span className="text-xs font-bold uppercase tracking-widest text-theme-text/40 block mb-1">Rented Vehicle</span>
                        <div className="flex items-center justify-between">
                           <span className="font-bold text-lg">{rentals[selectedOrder.rentCatalogueId].carModel}</span>
                           <span className="font-mono text-sky-400 font-bold">${rentals[selectedOrder.rentCatalogueId].pricePerMonth}/mo</span>
                        </div>
                      </>
                    ) : (
                       <span className="text-xs text-theme-text/50">Car details unavailable</span>
                    )}
                 </div>
               </div>
             </motion.div>
           </>
         )}
      </AnimatePresence>

    </div>
  );
}
