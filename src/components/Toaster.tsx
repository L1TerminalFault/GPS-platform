"use client";

import { useToastStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { FiCheckCircle, FiInfo, FiX, FiAlertCircle } from "react-icons/fi";

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl max-w-sm ${
              t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
              t.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' :
              t.type === 'warning' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' :
              'bg-theme-card/80 border-theme-border/50 text-theme-text'
            }`}
          >
            <div className="shrink-0 text-xl">
               {t.type === 'success' && <FiCheckCircle />}
               {t.type === 'error' && <FiAlertCircle />}
               {t.type === 'warning' && <FiAlertCircle />}
               {t.type === 'info' && <FiInfo className="text-sky-400" />}
            </div>
            <p className="flex-1 text-sm font-semibold">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 hover:bg-black/20 rounded-full transition-colors"
            >
              <FiX />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
