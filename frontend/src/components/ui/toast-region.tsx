"use client"

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react"

import { useToast } from "@/hooks/use-toast"

export function ToastRegion() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[90] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const palette =
          toast.variant === "destructive"
            ? {
                wrapper: "border-red-200 bg-red-50/95 text-red-950 shadow-red-100",
                icon: <TriangleAlert className="h-4 w-4 text-red-600" />,
              }
            : toast.variant === "success"
              ? {
                  wrapper: "border-emerald-200 bg-emerald-50/95 text-emerald-950 shadow-emerald-100",
                  icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
                }
              : {
                  wrapper: "border-slate-200 bg-white/95 text-slate-950 shadow-slate-200",
                  icon: <Info className="h-4 w-4 text-sky-600" />,
                }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur ${palette.wrapper}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-white/70 p-2 shadow-sm">{palette.icon}</div>
              <div className="min-w-0 flex-1">
                {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
                {toast.description && <p className="mt-1 text-sm leading-6 text-current/80">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-full p-1 text-current/60 transition-colors hover:bg-black/5 hover:text-current"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
