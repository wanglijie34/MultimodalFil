"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { TriangleAlert, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel() }}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <div className="fixed inset-0 z-[81] flex items-center justify-center p-4">
          <AlertDialog.Popup className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl outline-none transition-all duration-200 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-3 ${variant === "destructive" ? "bg-red-50 text-red-600" : "bg-sky-50 text-sky-600"}`}>
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <div>
                  <AlertDialog.Title className="text-base font-semibold text-slate-900">
                    {title}
                  </AlertDialog.Title>
                  <AlertDialog.Description className="mt-1 text-sm leading-6 text-slate-600">
                    {description}
                  </AlertDialog.Description>
                </div>
              </div>
              <AlertDialog.Close
                render={
                  <button
                    type="button"
                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                }
              />
            </div>

            <div className="flex justify-end gap-3 px-6 py-4">
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={loading}
                className={variant === "destructive" ? "bg-red-600 text-white hover:bg-red-700" : undefined}
              >
                {confirmLabel}
              </Button>
            </div>
          </AlertDialog.Popup>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
