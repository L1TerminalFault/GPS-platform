"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FiArrowLeft, FiBox, FiMapPin, FiCalendar, FiDollarSign,
  FiShield, FiFileText, FiNavigation, FiChevronLeft, FiChevronRight,
  FiTrash2, FiUserX, FiSave,
} from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import { useUser } from "@clerk/nextjs";
import { useToastStore, useAppStore } from "@/lib/store";
import { PlaceName } from "@/components/PlaceName";

export default function RentalDetailPage() {
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata as any)?.role === "admin";
  const { addToast } = useToastStore();
  const { rentals, upsertRental, removeRental, resolveUsers, usersMap: storeUsers } = useAppStore();
  const router = useRouter();

  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const orderId = searchParams.get("orderId");
  const [assignForm, setAssignForm] = useState({
    publicGPSIMEI: "",
    secretGPSIMEI: "",
  });
  const [gpsForm, setGpsForm] = useState({
    publicGPSIMEI: "",
    secretGPSIMEI: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState<"unrent" | "remove" | "gps" | null>(null);

  const cached = rentals.find((r) => r._id === id);
  const [rental, setRental] = useState<any>(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const userMap = storeUsers;

  useEffect(() => {
    if (!id) return;

    if (cached) {
      setRental(cached);
      setGpsForm({
        publicGPSIMEI: cached.carGPSId || "",
        secretGPSIMEI: cached.carGPSSecretId || "",
      });
      setLoading(false);
      const clerkIds = [cached.carOwnerClerkId, cached.renteeClerkId].filter(Boolean);
      resolveUsers(clerkIds);
      return;
    }

    fetch(`/api/rentals?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setRental(data);
          setGpsForm({
            publicGPSIMEI: data.carGPSId || "",
            secretGPSIMEI: data.carGPSSecretId || "",
          });
          upsertRental(data);
          const clerkIds = [data.carOwnerClerkId, data.renteeClerkId].filter(Boolean);
          resolveUsers(clerkIds);
        } else {
          setRental(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center p-6 text-theme-text opacity-70">
        <CgSpinner className="animate-spin text-4xl mb-4 text-theme-accent" />
        <p className="animate-pulse font-bold tracking-widest uppercase text-sm">Loading Vehicle Details...</p>
      </div>
    );
  }

  if (!rental || rental.error) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center p-6">
        <FiBox className="text-4xl text-theme-text/20 mb-4" />
        <h3 className="text-lg font-bold text-theme-text/50">Vehicle not found</h3>
        <Link href="/rentals" className="mt-4 px-6 py-2 bg-theme-accent text-white rounded-full font-bold shadow-lg shadow-theme-accent/20">
          Back to Catalogue
        </Link>
      </div>
    );
  }

  const images = rental.carImageURLs?.length > 0
    ? rental.carImageURLs
    : rental.carImageURL
      ? [rental.carImageURL]
      : ["https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80"];

  const legalDocs = rental.legalDocumentURLs || [];

  const nextImage = () => setActiveImageIndex(prev => (prev + 1) % images.length);
  const prevImage = () => setActiveImageIndex(prev => (prev - 1 + images.length) % images.length);

  const handleOrder = async () => {
    if (!rental) return;
    try {
      const res = await fetch("/api/orders", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ rentCatalogueId: id, details: "New order request." })
      });
      if (res.ok) {
        addToast("Order placed successfully!", "success");
      } else {
        addToast("Failed to place order.", "error");
      }
    } catch (err) {
      console.error("Order error", err);
      addToast("Failed to place order.", "error");
    }
  };

  const handleAssign = async () => {
    if (!rental) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rentals`, {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            action: "deliver-order",
            orderId,
            publicGPSIMEI: assignForm.publicGPSIMEI,
            secretGPSIMEI: assignForm.secretGPSIMEI,
         })
      });
      if (res.ok) {
        addToast("Car assigned successfully!", "success");
        const data = await res.json();
        if (data.rental) {
          setRental(data.rental);
          upsertRental(data.rental);
          setGpsForm({
            publicGPSIMEI: data.rental.carGPSId || "",
            secretGPSIMEI: data.rental.carGPSSecretId || "",
          });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || "Failed to assign rental.", "error");
      }
    } catch (err) {
      addToast("Failed to assign rental.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnrent = async () => {
    if (!rental?.isRented) return;
    if (!confirm("Unrent this car? The rentee will be removed; GPS units stay assigned.")) return;
    setActionBusy("unrent");
    try {
      const res = await fetch("/api/rentals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unrent", _id: rental._id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRental(data);
        upsertRental(data);
        addToast("Car unrented — listing is available again", "success");
      } else {
        addToast(data.error || "Failed to unrent car", "error");
      }
    } catch {
      addToast("Failed to unrent car", "error");
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemoveCatalog = async () => {
    if (!rental) return;
    if (!confirm("Remove this vehicle from the catalogue permanently?")) return;
    setActionBusy("remove");
    try {
      const res = await fetch(`/api/rentals?id=${encodeURIComponent(rental._id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        removeRental(rental._id);
        addToast("Listing removed from catalogue", "success");
        router.push("/rentals");
      } else {
        addToast(data.error || "Failed to remove listing", "error");
      }
    } catch {
      addToast("Failed to remove listing", "error");
    } finally {
      setActionBusy(null);
    }
  };

  const handleUpdateGps = async () => {
    if (!rental) return;
    if (!gpsForm.publicGPSIMEI.trim() || !gpsForm.secretGPSIMEI.trim()) {
      addToast("Both GPS IMEIs are required", "warning");
      return;
    }
    if (gpsForm.publicGPSIMEI.trim() === gpsForm.secretGPSIMEI.trim()) {
      addToast("Public and secret GPS IMEIs must be different", "warning");
      return;
    }
    setActionBusy("gps");
    try {
      const res = await fetch("/api/rentals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-gps",
          _id: rental._id,
          publicGPSIMEI: gpsForm.publicGPSIMEI,
          secretGPSIMEI: gpsForm.secretGPSIMEI,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRental(data);
        upsertRental(data);
        addToast("GPS IMEIs updated", "success");
      } else {
        addToast(data.error || "Failed to update GPS", "error");
      }
    } catch {
      addToast("Failed to update GPS", "error");
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="w-full min-h-screen pb-32">
      {/* Back Bar */}
      <div className="px-4 md:px-8 pt-4">
        <Link href="/rentals" className="inline-flex items-center gap-2 text-sm font-bold text-theme-text/60 hover:text-theme-text transition-colors px-3 py-1.5 rounded-full hover:bg-theme-card">
          <FiArrowLeft /> Back to Catalogue
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 md:px-8 mt-4"
      >
        <div className="w-full max-w-5xl mx-auto">
          {/* Image Gallery */}
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-theme-card rounded-3xl overflow-hidden shadow-2xl border border-theme-border/30">
            <img
              src={images[activeImageIndex]}
              alt={`${rental.carModel} - Image ${activeImageIndex + 1}`}
              className="w-full h-full object-cover transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Image Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors"
                >
                  <FiChevronLeft className="text-xl" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors"
                >
                  <FiChevronRight className="text-xl" />
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {images.map((_: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === activeImageIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>

            {/* Status Badge */}
            <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md shadow-lg border ${rental.isRented ? 'bg-red-500/20 text-red-100 border-red-500/50' : 'bg-emerald-500/20 text-emerald-100 border-emerald-500/50'}`}>
              {rental.isRented ? 'Currently Rented' : 'Available for Rent'}
            </div>

            {/* Title Overlay */}
            <div className="absolute bottom-4 left-6 flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest text-white/60 font-bold">{rental.carName}</span>
              <h1 className="text-3xl md:text-4xl font-black text-white">{rental.carModel}</h1>
            </div>
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto scrollbar-hidden pb-2">
              {images.map((url: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === activeImageIndex ? 'border-theme-accent scale-105' : 'border-theme-border/30 opacity-60 hover:opacity-100'}`}
                >
                  <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Main Details */}
            <div className="md:col-span-2 flex flex-col gap-6">
              {/* Description */}
              <div className="bg-theme-card rounded-3xl p-6 border border-theme-border/30 shadow-xl">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <FiBox className="text-theme-accent" /> About This Vehicle
                </h3>
                <p className="text-theme-text/70 leading-relaxed">
                  {rental.description || "No description available."}
                </p>
                {rental.moreDetails && (
                  <p className="text-theme-text/50 mt-3 text-sm leading-relaxed border-t border-theme-border/30 pt-3">
                    {rental.moreDetails}
                  </p>
                )}
              </div>

              {/* Specs Grid */}
              <div className="bg-theme-card rounded-3xl p-6 border border-theme-border/30 shadow-xl">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FiNavigation className="text-sky-400" /> Vehicle Specifications
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-theme-background p-4 rounded-2xl border border-theme-border/30">
                    <span className="text-[10px] uppercase tracking-widest text-theme-text/40 font-bold block mb-1">Brand</span>
                    <span className="font-bold text-theme-text">{rental.carName}</span>
                  </div>
                  <div className="bg-theme-background p-4 rounded-2xl border border-theme-border/30">
                    <span className="text-[10px] uppercase tracking-widest text-theme-text/40 font-bold block mb-1">Model</span>
                    <span className="font-bold text-theme-text">{rental.carModel}</span>
                  </div>
                  <div className="bg-theme-background p-4 rounded-2xl border border-theme-border/30 col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase tracking-widest text-theme-text/40 font-bold block mb-1">GPS IMEIs</span>
                    <div className="flex flex-col gap-1">
                      <span className="font-bold font-mono text-sky-400 text-sm">
                        <span className="text-[9px] text-theme-text/40 uppercase mr-1.5">Pub</span>
                        {rental.carGPSId || "—"}
                      </span>
                      <span className="font-bold font-mono text-red-400/90 text-sm">
                        <span className="text-[9px] text-theme-text/40 uppercase mr-1.5">Sec</span>
                        {rental.carGPSSecretId || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-theme-background p-4 rounded-2xl border border-theme-border/30">
                    <span className="text-[10px] uppercase tracking-widest text-theme-text/40 font-bold block mb-1">Max Radius</span>
                    <span className="font-bold">{rental.maxRadOfBoundFromInitLoc ? `${(rental.maxRadOfBoundFromInitLoc / 1000).toFixed(1)} km` : '—'}</span>
                  </div>
                  <div className="bg-theme-background p-4 rounded-2xl border border-theme-border/30">
                    <span className="text-[10px] uppercase tracking-widest text-theme-text/40 font-bold block mb-1">Last Service</span>
                    <span className="font-bold">{rental.lastServiceDate ? new Date(rental.lastServiceDate).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="bg-theme-background p-4 rounded-2xl border border-theme-border/30">
                    <span className="text-[10px] uppercase tracking-widest text-theme-text/40 font-bold block mb-1">Listed Since</span>
                    <span className="font-bold">{rental.createdAt ? new Date(rental.createdAt).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Legal Documents */}
              {legalDocs.length > 0 && legalDocs.some((d: string) => d.trim()) && (
                <div className="bg-theme-card rounded-3xl p-6 border border-theme-border/30 shadow-xl">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <FiFileText className="text-amber-400" /> Legal Documents
                  </h3>
                  <div className="flex flex-col gap-2">
                    {legalDocs.filter((d: string) => d.trim()).map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-theme-background rounded-xl border border-theme-border/30 hover:border-theme-accent/50 transition-colors group"
                      >
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                          <FiFileText />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-bold">Document {i + 1}</span>
                          <span className="text-xs text-theme-text/40 truncate">{url}</span>
                        </div>
                        <span className="text-xs text-theme-accent font-bold opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-6">
              {/* Price Card */}
              <div className="bg-theme-card rounded-3xl p-6 border border-theme-border/30 shadow-xl relative overflow-hidden">
                <div className="absolute -right-6 -top-6 text-emerald-500/5">
                  <FiDollarSign size={120} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 block mb-2">Monthly Rate</span>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-4xl font-black text-theme-text">${rental.pricePerMonth?.toLocaleString()}</span>
                  <span className="text-theme-text/40 text-sm font-bold">/month</span>
                </div>
                <div className="mt-4 pt-4 border-t border-theme-border/30">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${rental.isRented ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                    <span className={`w-2 h-2 rounded-full ${rental.isRented ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                    {rental.isRented ? 'Currently Rented' : 'Available Now'}
                  </span>
                </div>
                {!rental.isRented && !isAdmin && (
                  <button 
                    onClick={handleOrder}
                    className="w-full mt-4 bg-theme-accent text-white font-bold py-3 rounded-xl hover:bg-theme-accent/80 transition-colors shadow-lg shadow-theme-accent/20"
                  >
                    Place an Order
                  </button>
                )}
                
                {!rental.isRented && isAdmin && orderId && (
                  <div className="mt-6 pt-6 border-t border-theme-border/30 flex flex-col gap-3">
                    <span className="text-xs uppercase tracking-widest text-[#aaa] font-bold mb-1">Deliver Pending Order</span>
                    <p className="text-xs text-theme-text/50">The renter is securely taken from this order’s Clerk account.</p>
                    <input 
                      type="text" 
                      placeholder="Public GPS IMEI" 
                      value={assignForm.publicGPSIMEI} 
                      onChange={e => setAssignForm(f => ({...f, publicGPSIMEI: e.target.value}))}
                      className="bg-theme-background border border-theme-border/50 text-sm px-3 py-2 rounded-xl focus:border-theme-accent outline-none" 
                    />
                    <input 
                      type="text" 
                      placeholder="Secret GPS IMEI" 
                      value={assignForm.secretGPSIMEI} 
                      onChange={e => setAssignForm(f => ({...f, secretGPSIMEI: e.target.value}))}
                      className="bg-theme-background border border-theme-border/50 text-sm px-3 py-2 rounded-xl focus:border-theme-accent outline-none" 
                    />
                    <button 
                      onClick={handleAssign}
                      disabled={submitting || !assignForm.publicGPSIMEI.trim() || !assignForm.secretGPSIMEI.trim()}
                      className="w-full mt-2 bg-violet-600 text-white font-bold py-2.5 rounded-xl hover:bg-violet-500 transition-colors shadow-lg disabled:opacity-50"
                    >
                      {submitting ? "Assigning..." : "Assign Vehicle"}
                    </button>
                  </div>
                )}
                {!rental.isRented && isAdmin && !orderId && (
                  <p className="mt-4 text-xs text-theme-text/50">Open a pending order from Order Management to deliver this vehicle and assign its two GPS units.</p>
                )}

                {isAdmin && (
                  <div className="mt-6 pt-6 border-t border-theme-border/30 flex flex-col gap-3">
                    <span className="text-xs uppercase tracking-widest text-theme-text/40 font-bold">Admin Actions</span>
                    {rental.isRented && (
                      <button
                        onClick={handleUnrent}
                        disabled={actionBusy !== null}
                        className="w-full flex items-center justify-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold py-2.5 rounded-xl hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                      >
                        {actionBusy === "unrent" ? <CgSpinner className="animate-spin" /> : <FiUserX />}
                        Unrent Car
                      </button>
                    )}
                    <button
                      onClick={handleRemoveCatalog}
                      disabled={actionBusy !== null}
                      className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      {actionBusy === "remove" ? <CgSpinner className="animate-spin" /> : <FiTrash2 />}
                      Remove Catalogue
                    </button>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="bg-theme-card rounded-3xl p-6 border border-theme-border/30 shadow-xl">
                  <h3 className="font-bold flex items-center gap-2 mb-2 text-violet-400">
                    <FiNavigation /> GPS IMEIs
                  </h3>
                  <p className="text-xs text-theme-text/50 mb-4">Update tracker IDs without resetting the rental assignment.</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-sky-400">Public IMEI</label>
                      <input
                        type="text"
                        value={gpsForm.publicGPSIMEI}
                        onChange={(e) => setGpsForm((f) => ({ ...f, publicGPSIMEI: e.target.value }))}
                        className="bg-theme-background border border-theme-border/50 text-sm px-3 py-2 rounded-xl focus:border-theme-accent outline-none font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-red-400">Secret IMEI</label>
                      <input
                        type="text"
                        value={gpsForm.secretGPSIMEI}
                        onChange={(e) => setGpsForm((f) => ({ ...f, secretGPSIMEI: e.target.value }))}
                        className="bg-theme-background border border-theme-border/50 text-sm px-3 py-2 rounded-xl focus:border-theme-accent outline-none font-mono"
                      />
                    </div>
                    <button
                      onClick={handleUpdateGps}
                      disabled={
                        actionBusy !== null ||
                        !gpsForm.publicGPSIMEI.trim() ||
                        !gpsForm.secretGPSIMEI.trim() ||
                        (gpsForm.publicGPSIMEI === (rental.carGPSId || "") &&
                          gpsForm.secretGPSIMEI === (rental.carGPSSecretId || ""))
                      }
                      className="w-full mt-1 flex items-center justify-center gap-2 bg-violet-600 text-white font-bold py-2.5 rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-50"
                    >
                      {actionBusy === "gps" ? <CgSpinner className="animate-spin" /> : <FiSave />}
                      Save GPS IMEIs
                    </button>
                  </div>
                </div>
              )}

              {/* Location Card */}
              <div className="bg-theme-card rounded-3xl p-6 border border-theme-border/30 shadow-xl">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-violet-400">
                  <FiMapPin /> Location
                </h3>
                <div className="bg-theme-background p-3 rounded-xl border border-theme-border/30">
                  <PlaceName coords={rental.carInitLocation} className="text-sm text-sky-400 font-semibold" />
                </div>
                {rental.carInitLocation && (
                  <Link
                    href="/monitor"
                    className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded-xl text-sm font-bold hover:bg-violet-500/20 transition-colors"
                  >
                    <FiNavigation /> Track on Map
                  </Link>
                )}
              </div>

              {/* Owner / Renter Info */}
              <div className="bg-theme-card rounded-3xl p-6 border border-theme-border/30 shadow-xl">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-sky-400">
                  <FiShield /> Rental Info
                </h3>
                <div className="flex flex-col gap-4 mt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-theme-text/50">Owner</span>
                    <div className="flex items-center gap-2">
                       {userMap[rental.carOwnerClerkId] ? (
                         <>
                           <img src={userMap[rental.carOwnerClerkId].imageUrl} className="w-5 h-5 rounded-full object-cover" alt="owner" />
                           <span className="font-bold">{userMap[rental.carOwnerClerkId].name}</span>
                         </>
                       ) : (
                         <span className="font-bold font-mono text-xs">{rental.carOwnerClerkId || '—'}</span>
                       )}
                    </div>
                  </div>
                  {rental.renteeClerkId && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-theme-text/50">Current Renter</span>
                      <div className="flex items-center gap-2">
                       {userMap[rental.renteeClerkId] ? (
                         <>
                           <img src={userMap[rental.renteeClerkId].imageUrl} className="w-5 h-5 rounded-full object-cover" alt="rentee" />
                           <span className="font-bold">{userMap[rental.renteeClerkId].name}</span>
                         </>
                       ) : (
                         <span className="font-bold font-mono text-xs">{rental.renteeClerkId}</span>
                       )}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-theme-text/50">ID</span>
                    <span className="font-bold font-mono text-xs text-theme-text/40">{rental._id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
