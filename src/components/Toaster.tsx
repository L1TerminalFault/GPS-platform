"use client";

import { useToastStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiCheckCircle,
  FiInfo,
  FiAlertTriangle,
  FiXCircle,
} from "react-icons/fi";

const styles = {
  success: {
    icon: FiCheckCircle,
    color: "text-emerald-400",
    ring: "bg-emerald-400",
  },
  error: {
    icon: FiXCircle,
    color: "text-red-400",
    ring: "bg-red-400",
  },
  warning: {
    icon: FiAlertTriangle,
    color: "text-amber-400",
    ring: "bg-amber-400",
  },
  info: {
    icon: FiInfo,
    color: "text-sky-400",
    ring: "bg-sky-400",
  },
};

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none w-[calc(100%-2rem)] max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = styles[toast.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: 20,
                scale: 0.96,
                transition: { duration: 0.18 },
              }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 28,
              }}
              className="pointer-events-auto overflow-hidden rounded-[28px]
                         bg-[#2b2b2f]/95 backdrop-blur-xl
                         border border-white/10
                         shadow-[0_10px_30px_rgba(0,0,0,.35)]"
            >
              <div className="flex">

                {/* Android accent bar */}
                <div className={`w-1 ${config.ring}`} />

                <div className="flex items-center gap-3 px-4 py-3 flex-1">

                  <div className={`${config.color} text-xl`}>
                    <Icon />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-white leading-5">
                      {toast.message}
                    </p>
                  </div>

                  <button
                    onClick={() => removeToast(toast.id)}
                    className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition"
                  >
                    ✕
                  </button>

                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
