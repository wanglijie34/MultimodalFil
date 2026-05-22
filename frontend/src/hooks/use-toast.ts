import { useState, useEffect } from "react"

export function useToast() {
  const [toasts, setToasts] = useState<any[]>([])

  const toast = ({ title, description, variant }: { title?: string; description?: string; variant?: "default" | "destructive" }) => {
    // Simple fallback to alert if no actual toast UI exists
    if (typeof window !== "undefined") {
      alert(`${title ? title + ": " : ""}${description || ""}`)
    }
  }

  return {
    toast,
    toasts,
    dismiss: () => {},
  }
}
