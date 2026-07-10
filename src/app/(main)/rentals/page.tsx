"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { FiBox, FiCheckCircle, FiXCircle, FiFilter, FiSearch, FiShoppingCart, FiCommand } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Image from "next/image";

export default function RentalsPage() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/rentals")
      .then(res => res.json())
      .then(data => {
        setRentals(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (headerRef.current) gsap.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
    if (gridRef.current) gsap.fromTo(gridRef.current.children, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.1, ease: "back.out(1.7)" });
  }, [loading, searchQuery, filterActive]);

  if (loading) {
     return (
       <div className="w-full h-[80vh] flex flex-col items-center justify-center p-6 text-theme-text opacity-70">
         <CgSpinner className="animate-spin text-4xl mb-4 text-theme-accent" />
         <p className="animate-pulse font-bold tracking-widest uppercase text-sm">Loading Fleet Catalogue...</p>
       </div>
     );
  }

  const displayedRentals = rentals.filter(r => {
    if (filterActive && r.isRented) return false;
    if (searchQuery.trim()) {
       const q = searchQuery.toLowerCase();
       return r.carName.toLowerCase().includes(q) || r.carModel.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="w-full min-h-screen p-6 px-4 md:px-8 pb-32">
      <div ref={headerRef} className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <FiBox className="text-theme-accent" /> Fleet Catalogue
          </h2>
          <p className="text-theme-text/50">
            Browse and rent premium cars from our exclusive collection.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-theme-background border border-theme-border/50 rounded-full px-4 py-2 gap-2 focus-within:border-theme-accent transition-colors">
             <FiSearch className="text-theme-text/40" />
             <input 
                type="text" 
                placeholder="Search cars..." 
                className="bg-transparent outline-none text-sm w-32 focus:w-48 transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
             />
          </div>
          <button 
             onClick={() => setFilterActive(!filterActive)}
             className={`p-2 border rounded-full transition-colors flex items-center gap-1 ${filterActive ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-theme-border/50 hover:bg-theme-card bg-theme-background text-theme-text'}`}
          >
             <FiFilter />
          </button>
        </div>
      </div>

      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedRentals.map((car, idx) => (
           <div key={`${car._id}-${idx}`} className="group flex flex-col bg-theme-card border border-theme-border/30 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
             <div className="w-full aspect-[4/5] bg-theme-background relative overflow-hidden flex items-center justify-center">
                <img 
                  src={car.carImageURL || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2"} 
                  alt={car.carName}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg border ${car.isRented ? 'bg-red-500/10 text-red-100 border-red-500/50' : 'bg-emerald-500/10 text-emerald-100 border-emerald-500/50'}`}>
                   {car.isRented ? 'Rented' : 'Available'}
                </div>
                <div className="absolute top-4 left-4 bg-theme-card/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-theme-border/30 text-theme-text">
                   ${car.pricePerMonth} <span className="opacity-50 text-[10px] uppercase">/mo</span>
                </div>
             </div>
             
             <div className="flex flex-col p-5 gap-1 relative z-10 bg-theme-card border-t border-theme-border/30 h-1/2">
                <span className="text-xs uppercase tracking-widest text-theme-text/40 font-bold flex items-center gap-2 bg-theme-background w-fit px-2 py-0.5 rounded-lg border border-theme-border/50">
                   {/* Brand icon representation */}
                   <img src={`https://ui-avatars.com/api/?name=${car.carName}&background=random&size=16`} className="rounded-full w-3 h-3 grayscale opacity-80" alt="brand" /> 
                   {car.carName}
                </span>
                <h3 className="text-lg font-black mt-2">{car.carModel}</h3>
                
                <p className="text-xs text-theme-text/60 mt-1 line-clamp-2 min-h-[32px]">
                   {car.description} {car.moreDetails}
                </p>

                <div className="mt-auto pt-4 border-t border-theme-border/30 flex justify-between items-center">
                   <span className="text-[10px] uppercase tracking-widest text-theme-text/40">ID: {car._id.split('_').pop()}</span>
                   <button 
                     disabled={car.isRented}
                     className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all focus:scale-95 ${car.isRented ? 'bg-theme-background border border-theme-border/50 text-theme-text/30 cursor-not-allowed' : 'bg-theme-accent text-white hover:shadow-lg shadow-theme-accent/20'}`}
                   >
                      <FiShoppingCart /> 
                      {car.isRented ? 'Unavailable' : 'Rent Now'}
                   </button>
                </div>
             </div>
           </div>
        ))}
        {displayedRentals.length === 0 && (
           <div className="col-span-full py-20 bg-theme-border/10 rounded-3xl border border-dashed border-theme-border flex flex-col items-center justify-center text-theme-text/40">
             <FiSearch className="text-4xl mb-3" />
             <span className="font-bold">No results found</span>
           </div>
        )}
      </div>
    </div>
  );
}
