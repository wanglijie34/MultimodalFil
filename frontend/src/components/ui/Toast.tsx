"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

// Global pub-sub for toasts
type ToastListener = (toast: ToastMessage) => void;
const listeners = new Set<ToastListener>();

export const showToast = (message: string, type: ToastType = "info") => {
  const toast: ToastMessage = {
    id: Math.random().toString(36).substring(2, 9),
    message,
    type,
  };
  listeners.forEach((listener) => listener(toast));
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener: ToastListener = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3000);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-in fade-in slide-in-from-top-4 flex items-center gap-3 px-6 py-3 rounded-md bg-[#1a110b] border border-[#c09a53]/50 shadow-[0_0_20px_rgba(192,154,83,0.3)] min-w-[300px] pointer-events-auto"
        >
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
          {toast.type === "info" && <Info className="w-5 h-5 text-[#c09a53]" />}
          <span className="text-[#e4cfa1] font-serif tracking-widest text-sm">
            {toast.message}
          </span>
        </div>
      ))}
    </div>
  );
}
