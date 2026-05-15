"use client"

import { Sidebar } from "./Sidebar"
import { UserCircle, Bell } from "lucide-react"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-16 items-center justify-between px-6 border-b bg-card">
          <div className="flex items-center gap-4">
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
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
