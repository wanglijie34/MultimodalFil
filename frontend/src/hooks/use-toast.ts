"use client"

import { useEffect, useState, useCallback } from "react"

export type ToastVariant = "default" | "destructive" | "success"

export type ToastItem = {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastInput = Omit<ToastItem, "id">

let toastState: ToastItem[] = []
const listeners = new Set<(toasts: ToastItem[]) => void>()

function emitToastState() {
  for (const listener of listeners) {
    listener(toastState)
  }
}

function removeToast(id: string) {
  toastState = toastState.filter((toast) => toast.id !== id)
  emitToastState()
}

function pushToast(input: ToastInput) {
  const id = crypto.randomUUID()
  const toast: ToastItem = {
    id,
    variant: input.variant || "default",
    title: input.title,
    description: input.description,
  }

  toastState = [toast, ...toastState].slice(0, 5)
  emitToastState()

  window.setTimeout(() => removeToast(id), toast.variant === "destructive" ? 6000 : 3600)
  return id
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(toastState)

  useEffect(() => {
    listeners.add(setToasts)
    return () => {
      listeners.delete(setToasts)
    }
  }, [])

  const toast = useCallback((input: ToastInput) => pushToast(input), [])
  const dismiss = useCallback((id?: string) => {
    if (!id) {
      toastState = []
      emitToastState()
      return
    }
    removeToast(id)
  }, [])

  return {
    toasts,
    toast,
    dismiss,
  }
}
