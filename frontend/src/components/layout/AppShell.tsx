"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { UserCircle, ScrollText, PanelLeftOpen, X } from "lucide-react"
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
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ToastRegion />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <header className="flex h-16 items-center justify-between px-6 border-b border-[#c09a53]/30 bg-[#1a110b]/90 shadow-md relative z-30">
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#c09a53]/50 to-transparent pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-[#a38a6a] hover:text-[#e4cfa1] transition-colors hover:bg-[#c09a53]/20 rounded-md"
                title="Open Sidebar"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-xl font-bold text-[#e4cfa1] tracking-widest drop-shadow-md">崇祯元年 · 十月</h1>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-1.5 transition-all duration-300 hover:scale-110 hover:brightness-125 hover:drop-shadow-[0_0_10px_rgba(192,154,83,0.6)] group"
              >
                <img src="/images/urgent_token.png" alt="急报" className="h-9 w-auto object-contain drop-shadow-lg opacity-90 group-hover:opacity-100" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#8b2323] rounded-full border border-[#1a110b] shadow-[0_0_5px_rgba(139,35,35,0.8)] animate-pulse"></span>
              </button>

              {isNotifOpen && (
                <div className="absolute top-full right-0 mt-4 w-[380px] bg-[#1a110b]/95 border border-[#c09a53]/40 shadow-2xl rounded-sm z-50 overflow-hidden backdrop-blur-md">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(192,154,83,0.05),_transparent_70%)] pointer-events-none" />
                  <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
                  <div className="p-4 border-b border-[#c09a53]/30 bg-[#2a1d15]/80 flex items-center justify-between relative z-10">
                    <h3 className="text-lg font-bold text-[#e4cfa1] tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-[#c09a53] inline-block shadow-[0_0_5px_#c09a53]" />
                      军国机密
                    </h3>
                    <button onClick={() => setIsNotifOpen(false)} className="text-[#a38a6a] hover:text-[#e4cfa1]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-5 space-y-6 relative z-10 max-h-[60vh] overflow-y-auto">
                    <div>
                      <h4 className="text-sm font-bold text-[#c09a53] tracking-wider mb-2 border-b border-[#c09a53]/20 pb-1">天下形势</h4>
                      <p className="text-[13px] text-[#d4b392] leading-relaxed tracking-wide">
                        先帝大行，阉党乱政，四海困穷，建州女真于关外虎视眈眈。朕当如何力挽狂澜？
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-bold text-[#8b2323] tracking-wider mb-3 border-b border-[#8b2323]/20 pb-1 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8b2323] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8b2323]"></span>
                        </span>
                        要务急报
                      </h4>
                      <ul className="space-y-3">
                        <li className="text-[13px] text-[#d4b392] leading-relaxed flex items-start gap-2 bg-[#2a1d15]/50 p-2 border border-[#c09a53]/10 rounded-sm">
                          <span className="text-[#8b2323] font-bold mt-0.5">◈</span> 
                          <span>陕西大旱，饥民遍野，多地有流民聚集成寇之危。</span>
                        </li>
                        <li className="text-[13px] text-[#d4b392] leading-relaxed flex items-start gap-2 bg-[#2a1d15]/50 p-2 border border-[#c09a53]/10 rounded-sm">
                          <span className="text-[#8b2323] font-bold mt-0.5">◈</span> 
                          <span>后金在辽东虎视眈眈，锦州、宁远防线告急。</span>
                        </li>
                        <li className="text-[13px] text-[#d4b392] leading-relaxed flex items-start gap-2 bg-[#2a1d15]/50 p-2 border border-[#c09a53]/10 rounded-sm">
                          <span className="text-[#c09a53] font-bold mt-0.5">◈</span> 
                          <span>阉党魏忠贤权倾朝野，内阁运转滞涩，国库空虚。</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 bg-[#0a0705] border-t border-[#c09a53]/30 text-center relative z-10 hover:bg-[#c09a53]/10 transition-colors cursor-pointer" onClick={() => setIsNotifOpen(false)}>
                    <span className="text-[12px] text-[#c09a53] tracking-widest font-bold">闭合奏疏</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 border-l border-[#c09a53]/30 pl-4">
              <div className="w-8 h-8 rounded-full border border-[#c09a53]/50 flex items-center justify-center bg-[#2a1d15] text-[#e4cfa1]">
                <UserCircle className="h-6 w-6" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-bold tracking-widest text-[#e4cfa1] leading-none mb-1">皇帝</p>
                <p className="text-xs text-[#a38a6a]">朱由检</p>
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
