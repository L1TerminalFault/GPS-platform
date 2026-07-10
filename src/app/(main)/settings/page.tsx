"use client";

import { useThemeStore, defaultThemes } from "@/lib/theme";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { FiSettings, FiImage, FiDroplet } from "react-icons/fi";

export default function SettingsPage() {
  const { currentTheme, setTheme, updateCustomColor, updateCustomBackgroundImage } = useThemeStore();
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
      );
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCustomBackgroundImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const presetImages = [
    { name: "Neon Cyberpunk", url: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2000&auto=format&fit=crop" },
    { name: "Deep Space", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop" },
    { name: "Aurora", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2000&auto=format&fit=crop" },
    { name: "Soft Geometry", url: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop" },
    { name: "Dark Fluid", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop" },
  ];

  return (
    <div className="md:p-10 p-3 pt-6 gap-8 h-full w-full flex flex-col mb-[100px] overflow-y-auto scrollbar-hidden items-center">
      <div ref={headerRef} className="z-10 px-3 w-full flex flex-col gap-2 max-w-4xl">
        <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <FiSettings className="text-theme-text" /> Theme Settings
        </h2>
        <p className="text-theme-text/50">Customize colors, presets, and background for your vending experience</p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col w-full h-fit gap-8 max-w-4xl mt-2"
      >
        {/* Presets Section */}
        <motion.div variants={itemVariants} className="bg-theme-card backdrop-blur-2xl border border-theme-border/30 rounded-3xl p-8 flex flex-col gap-4 shadow-xl w-full">
          <div className="text-xl font-bold tracking-wide text-theme-text">Presets</div>
          <div className="text-theme-text/70 text-sm mb-2">Select a premium aesthetic palette.</div>
          
          <div className="flex flex-wrap gap-4 mt-2">
            {defaultThemes.map((theme) => (
              <motion.button
                key={theme.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTheme(theme)}
                style={{
                  backgroundColor: theme.bg,
                  color: theme.fg,
                  border: currentTheme.id === theme.id ? `3px solid ${theme.accent}` : "3px solid transparent",
                  boxShadow: currentTheme.id === theme.id ? `0 0 15px ${theme.accent}60` : "none"
                }}
                className="py-3 px-6 rounded-full transition-all flex items-center justify-center gap-2 font-semibold"
              >
                {currentTheme.id === theme.id && <div className="w-2.5 h-2.5 rounded-full bg-current shadow-sm animate-pulse" />}
                {theme.name}
              </motion.button>
            ))}
          </div>
        
          {/* Custom Color + Background Image */}
          <div className="flex w-full mt-8 gap-8 pb-4 flex-col md:flex-row">
            <div className="flex flex-col gap-3 flex-1 bg-theme-background/30 p-5 rounded-2xl">
              <div className="text-sm font-semibold uppercase tracking-wider opacity-70 flex items-center gap-2">
                <FiDroplet /> Custom Base Color
              </div>
              <div className="flex gap-4 items-center">
                <input 
                  type="color" 
                  value={currentTheme.bg.startsWith("#") ? currentTheme.bg : "#000000"} 
                  onChange={(e) => updateCustomColor(e.target.value)}
                  className="h-16 w-16 outline-none border-0 p-0 cursor-pointer overflow-hidden border-transparent bg-transparent rounded-lg active:scale-[0.98] transition-transform duration-300"
                />
                <div className="text-theme-text font-mono tracking-widest bg-theme-background/50 px-5 py-3 rounded-full text-lg shadow-inner">
                  {currentTheme.bg.startsWith("#") ? currentTheme.bg : "Custom"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 flex-1 bg-theme-background/30 p-5 rounded-2xl">
              <div className="text-sm font-semibold uppercase tracking-wider opacity-70 flex items-center gap-2">
                <FiImage /> Background Image
              </div>
              <div className="flex flex-col gap-3">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-theme-text/80 font-mono file:bg-theme-accent file:border-none file:text-theme-background file:px-5 file:py-2.5 file:font-bold file:rounded-full file:cursor-pointer hover:file:opacity-80 transition-all text-sm w-full"
                />

                <div className="flex flex-wrap gap-3 mt-3">
                  {presetImages.map(img => (
                    <motion.div 
                      key={img.name} 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => updateCustomBackgroundImage(img.url)}
                      className="w-16 h-16 rounded-xl bg-cover bg-center cursor-pointer border-4 hover:opacity-80 transition-all shadow-lg"
                      style={{ 
                        backgroundImage: `url(${img.url})`, 
                        borderColor: currentTheme.bgImage === img.url ? currentTheme.accent : 'transparent' 
                      }}
                      title={img.name}
                    />
                  ))}
                </div>

                {currentTheme.bgImage && (
                  <button 
                    onClick={() => updateCustomColor(currentTheme.bg)} 
                    className="text-sm text-red-500 font-semibold text-left hover:text-red-400 w-fit mt-3 px-4 py-2 bg-red-500/10 rounded-full transition-colors"
                  >
                    Remove background image
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* About Section */}
        <motion.div variants={itemVariants} className="bg-theme-card backdrop-blur-2xl border border-theme-border/30 rounded-3xl p-8 flex flex-col gap-4 shadow-xl w-full">
          <div className="text-xl font-bold tracking-wide">About</div>
          <div className="flex flex-col gap-4">
            <div className="py-4 px-6 bg-theme-background/50 rounded-2xl flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Vend Management</span>
                <span className="text-xs text-theme-text/40 font-mono">v1.0</span>
              </div>
              <p className="text-sm text-theme-text/50">
                Premium vending machine management interface. Monitor stock levels, process orders, and track transactions across your entire machine network.
              </p>
            </div>
            <div className="py-4 px-6 bg-theme-background/50 rounded-2xl flex items-center justify-between">
              <span className="font-semibold">Theme Engine</span>
              <span className="text-xs text-theme-accent font-mono bg-theme-accent/10 px-3 py-1 rounded-full">Active</span>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
