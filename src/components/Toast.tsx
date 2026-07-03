import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg: string, dur?: number) => showToast(msg, "success", dur), [showToast]);
  const error = useCallback((msg: string, dur?: number) => showToast(msg, "error", dur), [showToast]);
  const info = useCallback((msg: string, dur?: number) => showToast(msg, "info", dur), [showToast]);
  const warning = useCallback((msg: string, dur?: number) => showToast(msg, "warning", dur), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            let bgColor = "bg-white border-slate-200 text-slate-800 shadow-xl";
            let IconComponent = Info;
            let iconColor = "text-sky-500";
            let progressColor = "bg-sky-500";

            if (toast.type === "success") {
              bgColor = "bg-slate-900/95 backdrop-blur-md border-emerald-500/30 text-white shadow-emerald-500/5";
              IconComponent = CheckCircle;
              iconColor = "text-emerald-400";
              progressColor = "bg-emerald-400";
            } else if (toast.type === "error") {
              bgColor = "bg-slate-900/95 backdrop-blur-md border-rose-500/30 text-white shadow-rose-500/5";
              IconComponent = AlertCircle;
              iconColor = "text-rose-400";
              progressColor = "bg-rose-400";
            } else if (toast.type === "warning") {
              bgColor = "bg-slate-900/95 backdrop-blur-md border-amber-500/30 text-white shadow-amber-500/5";
              IconComponent = AlertTriangle;
              iconColor = "text-amber-400";
              progressColor = "bg-amber-400";
            } else if (toast.type === "info") {
              bgColor = "bg-slate-900/95 backdrop-blur-md border-sky-500/30 text-white shadow-sky-500/5";
              IconComponent = Info;
              iconColor = "text-sky-400";
              progressColor = "bg-sky-400";
            }

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }}
                className={`pointer-events-auto flex flex-col overflow-hidden rounded-2xl border ${bgColor} p-4 shadow-lg`}
              >
                <div className="flex items-start gap-3">
                  <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
                  </div>
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-slate-800 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {toast.duration && toast.duration > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                    <motion.div
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: toast.duration / 1000, ease: "linear" }}
                      className={`h-full ${progressColor}`}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
