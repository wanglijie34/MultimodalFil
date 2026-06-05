"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { UserCircle, Bell, PanelLeftOpen } from "lucide-react"
import { ToastRegion } from "@/components/ui/toast-region"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isFullBleed = pathname === '/map'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ToastRegion />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <header className="flex h-16 items-center justify-between px-6 border-b bg-card">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted rounded-md"
                title="Open Sidebar"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-foreground">Workspace</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 border-l pl-4">
              <UserCircle className="h-8 w-8 text-muted-foreground" />
              <div className="hidden md:block">
                <p className="text-sm font-medium leading-none">Demo User</p>
                <p className="text-xs text-muted-foreground">demo@insightgraph.ai</p>
              </div>
            </div>
          </div>
        </header>
        <main className={cn("flex-1 overflow-y-auto relative", !isFullBleed && "p-6")}>
          {children}
        </main>
      </div>
    </div>
  )
}
