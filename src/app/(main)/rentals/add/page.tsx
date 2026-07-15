"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { FiPlus, FiImage, FiFileText, FiUpload, FiArrowLeft, FiX, FiMapPin, FiSearch } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import { useRouter } from "next/navigation";
import { useToastStore, useAppStore } from "@/lib/store";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AddRentalPage() {
  const { user } = useUser();
  const router = useRouter();
  const { addToast } = useToastStore();
  const { upsertRental } = useAppStore();
  
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<number | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    carName: "",
    carModel: "",
    description: "",
    moreDetails: "",
    pricePerMonth: "",
    carImageURLs: [""],
    legalDocumentURLs: [""],
    carInitLocation: "",
    maxRadOfBoundFromInitLoc: "",
    lastServiceDate: "",
  });

  const updateFormField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (locationTimer.current) clearTimeout(locationTimer.current);
    const query = locationQuery.trim();
    if (query.length < 2) {
      setLocationResults([]);
      return;
    }
    locationTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/places?mode=search&q=${encodeURIComponent(query)}`);
        const places = await response.json();
        setLocationResults(Array.isArray(places) ? places : []);
        setLocationOpen(true);
      } catch {
        setLocationResults([]);
      }
    }, 350);
    return () => { if (locationTimer.current) clearTimeout(locationTimer.current); };
  }, [locationQuery]);

  const updateImageURL = (index: number, value: string) => {
    setForm((prev) => {
      const urls = [...prev.carImageURLs];
      urls[index] = value;
      return { ...prev, carImageURLs: urls };
    });
  };

  const addLegalDoc = () => {
    setForm((prev) => ({ ...prev, legalDocumentURLs: [...prev.legalDocumentURLs, ""] }));
  };

  const addImage = () => {
    setForm((prev) => ({ ...prev, carImageURLs: [...prev.carImageURLs, ""] }));
  };

  const removeImage = (index: number) => {
    if (index === 0) return;
    setForm((prev) => ({ ...prev, carImageURLs: prev.carImageURLs.filter((_, i) => i !== index) }));
  };

  const updateLegalDoc = (index: number, value: string) => {
    setForm((prev) => {
      const docs = [...prev.legalDocumentURLs];
      docs[index] = value;
      return { ...prev, legalDocumentURLs: docs };
    });
  };

  const removeLegalDoc = (index: number) => {
    setForm((prev) => ({
      ...prev,
      legalDocumentURLs: prev.legalDocumentURLs.filter((_, i) => i !== index),
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isImage) setUploadingImage(index);
    else setUploadingDoc(index);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": "0" },
          body: JSON.stringify({ data: reader.result, folder: isImage ? "cars" : "docs" }),
        });
        const json = await res.json();
        if (res.ok && json.url) {
          if (isImage) updateImageURL(index, json.url);
          else updateLegalDoc(index, json.url);
          addToast("File uploaded successfully", "success");
        } else {
          addToast(json.error || "Upload failed", "error");
        }
      } catch (err) {
        addToast("Error during upload", "error");
      } finally {
        if (isImage) setUploadingImage(null);
        else setUploadingDoc(null);
      }
    };
  };

  const handleSubmit = async () => {
    if (!form.carName || !form.carModel || !form.pricePerMonth) {
      addToast("Please fill all required fields", "warning");
      return;
    }
    if (!form.carImageURLs[0]?.trim()) {
      addToast("Please add a display image for the vehicle", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        carOwnerClerkId: user?.id || "anon",
        renteeClerkId: "",
        carImageURLs: form.carImageURLs.filter((u) => u.trim()),
        carName: form.carName,
        carModel: form.carModel,
        legalDocumentURLs: form.legalDocumentURLs.filter((u) => u.trim()),
        description: form.description,
        moreDetails: form.moreDetails,
        pricePerMonth: parseFloat(form.pricePerMonth),
        carGPSId: "",
        lastServiceDate: form.lastServiceDate || null,
        carInitLocation: form.carInitLocation,
        maxRadOfBoundFromInitLoc: form.maxRadOfBoundFromInitLoc ? parseFloat(form.maxRadOfBoundFromInitLoc) : 50000,
        isRented: false,
      };
      
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        const data = await res.json();
        upsertRental(data);
        addToast("Vehicle successfully listed in catalogue", "success");
        router.push("/rentals");
      } else {
        addToast("Failed to create listing", "error");
      }
    } catch (err) {
      addToast("Error processing request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full min-h-screen p-6 md:p-10 flex justify-center pb-32">
      <div className="w-full max-w-4xl bg-theme-card border border-theme-border/50 rounded-3xl shadow-2xl p-6 md:p-10 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-theme-border/30 pb-6 shrink-0">
          <Link href="/rentals" className="text-theme-text/50 hover:text-theme-text flex items-center gap-2 font-semibold text-sm transition-colors w-fit">
            <FiArrowLeft /> Back to Catalogue
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-theme-accent/10 text-theme-accent rounded-2xl shrink-0">
              <FiPlus className="text-3xl" />
            </div>
            <div>
              <h3 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-theme-text to-theme-text/60">New Rental Listing</h3>
              <p className="text-sm font-semibold text-theme-text/50">Expand fleet availability on the platform.</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-8">
          {/* Car Info */}
          <div className="flex flex-col gap-4 border border-theme-border/30 p-6 rounded-2xl bg-theme-background/30">
            <span className="text-sm font-black uppercase tracking-widest text-theme-text/40">Vehicle Details</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-theme-text/60">Brand / Make *</label>
                <input
                  type="text"
                  value={form.carName}
                  onChange={(e) => updateFormField("carName", e.target.value)}
                  placeholder="e.g. Tesla"
                  className="bg-theme-background border border-theme-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-theme-accent transition-colors shadow-inner"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-theme-text/60">Model *</label>
                <input
                  type="text"
                  value={form.carModel}
                  onChange={(e) => updateFormField("carModel", e.target.value)}
                  placeholder="e.g. Model S Long Range"
                  className="bg-theme-background border border-theme-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-theme-accent transition-colors shadow-inner"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-theme-text/60">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateFormField("description", e.target.value)}
                placeholder="Market overview and characteristics..."
                rows={3}
                className="bg-theme-background border border-theme-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-theme-accent transition-colors resize-none shadow-inner"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-theme-text/60">Additional Features</label>
              <input
                type="text"
                value={form.moreDetails}
                onChange={(e) => updateFormField("moreDetails", e.target.value)}
                placeholder="e.g. Leather seats, autopilot..."
                className="bg-theme-background border border-theme-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-theme-accent transition-colors shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pricing / Location */}
            <div className="flex flex-col gap-4 border border-theme-border/30 p-6 rounded-2xl bg-theme-background/30">
              <span className="text-sm font-black uppercase tracking-widest text-theme-text/40">Pricing & Tracking</span>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-theme-text/60">Monthly Lease Price ($) *</label>
                  <input
                    type="number"
                    value={form.pricePerMonth}
                    onChange={(e) => updateFormField("pricePerMonth", e.target.value)}
                    placeholder="1200"
                    className="bg-theme-background border border-theme-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-theme-accent transition-colors shadow-inner"
                  />
                </div>
                <div className="relative flex flex-col gap-2">
                  <label className="text-xs font-black text-theme-text/60">Initial Location</label>
                  <div className="flex items-center gap-2 bg-theme-background border border-theme-border/50 rounded-xl px-4 py-3 focus-within:border-theme-accent transition-colors shadow-inner">
                    <FiSearch className="text-theme-text/40 shrink-0" />
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      onFocus={() => locationResults.length > 0 && setLocationOpen(true)}
                      placeholder="Search for a location..."
                      className="w-full bg-transparent text-sm outline-none"
                    />
                    {form.carInitLocation && <FiMapPin className="text-emerald-400" />}
                  </div>
                  {form.carInitLocation && <span className="text-[10px] text-theme-text/45">Selected coordinates: {form.carInitLocation}</span>}
                  {locationOpen && locationResults.length > 0 && (
                    <div className="absolute top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-theme-border/50 bg-theme-card shadow-2xl">
                      {locationResults.map((place) => (
                        <button key={place.id} type="button" onClick={() => {
                          setLocationQuery(place.name);
                          updateFormField("carInitLocation", `${place.lat}, ${place.lng}`);
                          setLocationOpen(false);
                        }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-theme-accent/10">
                          <FiMapPin className="shrink-0 text-pink-400" />
                          <span className="truncate">{place.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-theme-text/60">Max Boundary Radius (m)</label>
                  <input
                    type="number"
                    value={form.maxRadOfBoundFromInitLoc}
                    onChange={(e) => updateFormField("maxRadOfBoundFromInitLoc", e.target.value)}
                    placeholder="50000"
                    className="bg-theme-background border border-theme-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-theme-accent transition-colors shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-theme-text/60">Last Service Date</label>
                  <input
                    type="date"
                    value={form.lastServiceDate}
                    onChange={(e) => updateFormField("lastServiceDate", e.target.value)}
                    className="bg-theme-background border border-theme-border/50 rounded-xl px-4 py-3 text-sm outline-none focus:border-theme-accent transition-colors shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* Media */}
            <div className="flex flex-col gap-6">
              {/* Car Images */}
              <div className="flex flex-col gap-4 border border-theme-border/30 p-6 rounded-2xl bg-theme-background/30">
                <span className="text-sm font-black uppercase tracking-widest text-theme-text/40 flex items-center gap-2">
                  <FiImage /> Gallery
                </span>
                <div className="flex flex-col gap-3">
                  {form.carImageURLs.map((url, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 flex gap-2 w-full">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => updateImageURL(i, e.target.value)}
                          placeholder={i === 0 ? "https://images.unsplash.com/..." : "Optional"}
                          className="w-full bg-theme-background border border-theme-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-theme-accent transition-colors"
                        />
                        <label className="relative shrink-0 flex items-center justify-center w-11 h-11 bg-theme-background border border-theme-border/50 hover:bg-theme-accent/20 hover:border-theme-accent/30 text-theme-text hover:text-theme-accent rounded-xl cursor-pointer transition-colors shadow-sm">
                          {uploadingImage === i ? <CgSpinner className="animate-spin text-theme-accent" /> : <FiUpload />}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, true, i)} />
                        </label>
                        {i > 0 && <button type="button" onClick={() => removeImage(i)} className="shrink-0 p-2 w-11 h-11 flex justify-center items-center text-red-400 border border-red-500/30 bg-theme-background hover:bg-red-500/10 rounded-xl transition-colors"><FiX /></button>}
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addImage} className="mt-1 flex items-center gap-2 text-xs font-black text-theme-text/50 hover:text-theme-accent uppercase tracking-widest w-fit transition-colors"><FiPlus className="text-sm" /> Add Image</button>
                  <p className="text-[10px] text-theme-text/40">Display image is required; additional images are optional.</p>
                </div>
              </div>

              {/* Legal Documents */}
              <div className="flex flex-col gap-4 border border-theme-border/30 p-6 rounded-2xl bg-theme-background/30">
                <span className="text-sm font-black uppercase tracking-widest text-theme-text/40 flex items-center gap-2">
                  <FiFileText /> Documents
                </span>
                <div className="flex flex-col gap-3">
                  {form.legalDocumentURLs.map((url, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 flex gap-2 w-full">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => updateLegalDoc(i, e.target.value)}
                          placeholder="https://docs.example.com/..."
                          className="w-full bg-theme-background border border-theme-border/50 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-theme-accent transition-colors"
                        />
                        <label className="relative shrink-0 flex items-center justify-center w-11 h-11 bg-theme-background border border-theme-border/50 hover:bg-theme-accent/20 hover:border-theme-accent/30 text-theme-text hover:text-theme-accent rounded-xl cursor-pointer transition-colors shadow-sm">
                          {uploadingDoc === i ? <CgSpinner className="animate-spin text-theme-accent" /> : <FiUpload />}
                          <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, false, i)} />
                        </label>
                      </div>
                      {form.legalDocumentURLs.length > 1 && (
                        <button onClick={() => removeLegalDoc(i)} className="shrink-0 p-2 w-11 h-11 flex justify-center items-center text-red-400 border border-red-500/30 bg-theme-background hover:bg-red-500/10 rounded-xl transition-colors">
                          <FiX className="text-lg" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addLegalDoc} className="mt-1 flex items-center gap-2 text-xs font-black text-theme-text/50 hover:text-theme-accent uppercase tracking-widest w-fit transition-colors">
                    <FiPlus className="text-sm" /> Add Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end pt-6 border-t border-theme-border/30 gap-4 mt-6">
          <Link href="/rentals" className="px-6 py-4 rounded-xl font-black text-sm border border-theme-border/50 text-theme-text hover:bg-theme-background transition-colors">
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.carName || !form.carModel || !form.pricePerMonth || !form.carImageURLs[0]?.trim()}
            className="flex items-center gap-3 px-8 py-4 bg-theme-accent text-white rounded-xl font-black uppercase tracking-wider text-sm hover:shadow-xl shadow-theme-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
          >
            {submitting ? <CgSpinner className="animate-spin text-xl" /> : <FiUpload className="text-xl" />}
            {submitting ? "Processing..." : "List Vehicle"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
