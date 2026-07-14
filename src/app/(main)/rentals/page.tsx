"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import gsap from "gsap";
import { FiBox, FiFilter, FiSearch, FiShoppingCart, FiPlus, FiCheck, FiX } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/lib/store";

type RentalFilter = "all" | "available" | "rented";

const FILTER_OPTIONS: { value: RentalFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "rented", label: "Rented" },
];

/** Known manufacturer logos (vehiclespecs brand-logos via jsDelivr). */
const BRAND_LOGO_SLUGS: Record<string, string> = {
  tesla: "tesla",
  bmw: "bmw",
  audi: "audi",
  mercedes: "mercedes-benz",
  "mercedes-benz": "mercedes-benz",
  mercedesbenz: "mercedes-benz",
  porsche: "porsche",
  toyota: "toyota",
  honda: "honda",
  ford: "ford",
  chevrolet: "chevrolet",
  volkswagen: "volkswagen",
  volvo: "volvo",
  nissan: "nissan",
  hyundai: "hyundai",
  kia: "kia",
  lexus: "lexus",
  ferrari: "ferrari",
  lamborghini: "lamborghini",
  jaguar: "jaguar",
  landrover: "land-rover",
  "land rover": "land-rover",
  mazda: "mazda",
  subaru: "subaru",
  jeep: "jeep",
};

function brandLogoUrl(carName?: string): string | null {
  if (!carName?.trim()) return null;
  const key = carName.trim().toLowerCase();
  const slug = BRAND_LOGO_SLUGS[key] || BRAND_LOGO_SLUGS[key.replace(/\s+/g, "")];
  if (!slug) return null;
  return `https://cdn.jsdelivr.net/gh/vehiclespecs/brand-logos@main/${slug}-logo.svg`;
}

function BrandLabel({ name }: { name?: string }) {
  const logo = brandLogoUrl(name);
  const [failed, setFailed] = useState(false);

  if (!name) return null;

  if (logo && !failed) {
    return (
      <span className="text-xs uppercase tracking-widest text-theme-text/50 font-bold flex items-center gap-2">
        <img
          src={logo}
          alt=""
          className="w-4 h-4 object-contain"
          onError={() => setFailed(true)}
        />
        {name}
      </span>
    );
  }

  return (
    <span className="text-xs uppercase tracking-widest text-theme-text/50 font-bold">
      {name}
    </span>
  );
}

export default function RentalsPage() {
  const { user } = useUser();
  const { rentals, ensureRentals } = useAppStore();
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<RentalFilter>("all");
  const [showFilterPopup, setShowFilterPopup] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureRentals()
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterPopup(false);
      }
    };
    if (showFilterPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterPopup]);

  useEffect(() => {
    if (loading) return;
    if (headerRef.current) gsap.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
    if (gridRef.current) gsap.fromTo(gridRef.current.children, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.1, ease: "back.out(1.7)" });
  }, [loading, searchQuery, filter]);


  if (loading) {
     return (
       <div className="w-full h-[80vh] flex flex-col items-center justify-center p-6 text-theme-text opacity-70">
         <CgSpinner className="animate-spin text-4xl mb-4 text-theme-accent" />
         <p className="animate-pulse font-bold tracking-widest uppercase text-sm">Loading Fleet Catalogue...</p>
       </div>
     );
  }

  const displayedRentals = rentals.filter(r => {
    if (filter === "available" && r.isRented) return false;
    if (filter === "rented" && !r.isRented) return false;
    if (searchQuery.trim()) {
       const q = searchQuery.toLowerCase();
       return r.carName?.toLowerCase().includes(q) || r.carModel?.toLowerCase().includes(q);
    }
    return true;
  });

  const activeFilterLabel = FILTER_OPTIONS.find(o => o.value === filter)?.label ?? "All";

  return (
    <div className="w-full min-h-screen p-6 px-4 md:px-8 pb-32 relative">
      <div ref={headerRef} className="relative z-40 flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-4 mb-8">
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

          <div className="relative z-50" ref={filterRef}>
            <button 
               onClick={() => setShowFilterPopup(!showFilterPopup)}
               className={`px-3 py-2 border rounded-full transition-colors flex items-center gap-2 text-sm font-semibold ${filter !== "all" ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-theme-border/50 hover:bg-theme-card bg-theme-background text-theme-text'}`}
            >
               <FiFilter />
               <span className="hidden sm:inline">{activeFilterLabel}</span>
            </button>

            <AnimatePresence>
              {showFilterPopup && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setShowFilterPopup(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-[110%] z-[70] min-w-[180px] bg-theme-card backdrop-blur-xl border border-theme-border shadow-2xl rounded-3xl p-2 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-theme-border/50 mb-1">
                      <span className="text-xs uppercase tracking-widest font-bold text-theme-text/50">Filter by</span>
                      <button
                        onClick={() => setShowFilterPopup(false)}
                        className="p-1 rounded-full hover:bg-theme-background transition-colors"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                    {FILTER_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilter(option.value);
                          setShowFilterPopup(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between hover:bg-theme-accent/10 transition-colors ${filter === option.value ? "bg-theme-accent/15 text-theme-accent font-bold" : "text-theme-text"}`}
                      >
                        <span className="text-sm">{option.label}</span>
                        {filter === option.value && <FiCheck className="text-theme-accent" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          
          {user && (
            <Link
              href="/rentals/add"
              className="flex items-center gap-2 px-4 py-2 bg-theme-accent text-white rounded-full font-bold text-sm hover:shadow-lg shadow-theme-accent/20 transition-all hover:scale-105"
            >
              <FiPlus /> Add Rental
            </Link>
          )}
        </div>
      </div>

      <div ref={gridRef} className="relative z-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedRentals.map((car, idx) => (
           <Link 
             href={`/rentals/${car._id}`} 
             key={`${car._id}-${idx}`} 
             className="group flex flex-col bg-theme-card border border-theme-border/30 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
           >
             <div className="w-full aspect-[4/5] bg-theme-background relative overflow-hidden flex items-center justify-center">
                <img 
                  src={car.carImageURLs?.[0] || car.carImageURL || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2"} 
                  alt={car.carName}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute top-4 left-4 bg-theme-card/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-theme-border/30 text-theme-text">
                   ${car.pricePerMonth} <span className="opacity-50 text-[10px] uppercase">/mo</span>
                </div>
             </div>
             
             <div className="flex flex-col p-5 gap-1 relative z-10 bg-theme-card border-t border-theme-border/30 h-1/2">
                <BrandLabel name={car.carName} />
                <h3 className="text-lg font-black mt-2">{car.carModel}</h3>
                
                <p className="text-xs text-theme-text/60 mt-1 line-clamp-2 min-h-[32px]">
                   {car.description} {car.moreDetails}
                </p>

                <div className="mt-auto pt-4 border-t border-theme-border/30 flex justify-between items-center">
                   <span className="text-[10px] uppercase tracking-widest text-theme-text/40">ID: {car._id?.toString().split('_').pop() || car._id?.toString().slice(-4)}</span>
                   <span
                     className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${car.isRented ? 'bg-theme-background border border-theme-border/50 text-theme-text/30' : 'bg-theme-accent text-white shadow-theme-accent/20'}`}
                   >
                      <FiShoppingCart /> 
                      {car.isRented ? 'Unavailable' : 'View Details'}
                   </span>
                </div>
             </div>
           </Link>
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
