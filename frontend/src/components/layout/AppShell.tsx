"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Save, LogOut, Globe, ScrollText, Users, Map as MapIcon, ChevronRight, UserCircle, PanelLeftOpen, X, AlertTriangle } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { ToastRegion } from "@/components/ui/toast-region"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { getGameState, advise, Institution, Faction, ConsultationResult, getSaves, saveGame, loadGame } from '@/lib/gameApi'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isFullBleed = pathname === '/map'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  
  // Court Panel & Consult State
  const [isCourtOpen, setIsCourtOpen] = useState(false)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [factions, setFactions] = useState<Faction[]>([])
  const [ministers, setMinisters] = useState<any[]>([])
  const [showConsult, setShowConsult] = useState(false)
  const [consulting, setConsulting] = useState(false)
  const [consultations, setConsultations] = useState<ConsultationResult[]>([])
  const [selectedMinisters, setSelectedMinisters] = useState<string[]>([])
  
  // Save/Load States
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false)
  const [savesList, setSavesList] = useState<string[]>([])
  const [saveNameInput, setSaveNameInput] = useState("")

  useEffect(() => {
    const fetchState = () => {
      getGameState().then(res => {
        if (res.institutions) setInstitutions(res.institutions)
        if (res.factions) setFactions(res.factions)
        if (res.available_ministers) setMinisters(res.available_ministers)
      }).catch(console.error)
    }
    fetchState()
    window.addEventListener('gameStateChanged', fetchState)
    return () => window.removeEventListener('gameStateChanged', fetchState)
  }, [])

  const handleConsult = async () => {
    if (selectedMinisters.length === 0) return
    setConsulting(true)
    try {
      const results = await advise(null, selectedMinisters)
      setConsultations(results)
    } catch (e) {
      console.error("Consult failed", e)
    }
    setConsulting(false)
  }
  
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
            <h1 className="text-xl font-bold text-[#e4cfa1] tracking-widest drop-shadow-md whitespace-nowrap">崇祯元年 · 十月</h1>
            
            {/* The circular button for Court Panel */}
            <button
              onClick={() => setIsCourtOpen(!isCourtOpen)}
              className="ml-4 w-12 h-12 rounded-full bg-[#1a110b]/95 border-2 border-[#c09a53]/60 shadow-[0_0_15px_rgba(192,154,83,0.3)] flex items-center justify-center transition-all duration-500 text-[#e4cfa1] hover:bg-[#c09a53]/20 hover:scale-110 group relative"
            >
              <div className="absolute inset-1 border border-[#c09a53]/30 rounded-full pointer-events-none group-hover:border-[#c09a53]/60 transition-colors" />
              <div className="absolute inset-2 border border-dashed border-[#c09a53]/20 rounded-full pointer-events-none animate-[spin_20s_linear_infinite_reverse]" />
              <span className="font-bold text-[14px] font-serif leading-tight drop-shadow-md">
                朝堂
              </span>
            </button>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            {/* Save/Load Button */}
            <button
              onClick={async () => {
                const saves = await getSaves();
                setSavesList(saves);
                setIsSaveMenuOpen(true);
              }}
              className="px-3 py-1.5 border border-[#c09a53]/50 bg-[#1a110b]/80 text-[#e4cfa1] hover:bg-[#c09a53]/20 flex items-center gap-2 rounded-sm shadow-sm transition-colors mr-2"
              title="御览玉牒"
            >
              <ScrollText className="w-5 h-5" />
              <span className="text-sm font-bold tracking-widest hidden sm:inline-block">御览玉牒</span>
            </button>

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
        {/* Court Panel Dropdown */}
        {isCourtOpen && (
          <div className="absolute top-[80px] left-6 z-50 pointer-events-auto">
            <div className="w-[340px]">
              <div className="bg-[#1a110b]/95 border border-[#c09a53]/40 p-4 shadow-2xl relative rounded-sm max-h-[80vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
                <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />

                <h3 className="text-[#e4cfa1] font-bold mb-3 border-b border-[#c09a53]/30 pb-1 flex justify-between pr-4">
                  <span>朝堂机构 (Court)</span>
                  <span className="text-[#c09a53]/70 text-sm">效率/清廉/忠诚</span>
                </h3>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {institutions.map(inst => (
                    <div key={inst.institution_id} className="flex justify-between items-center text-sm">
                      <span className="text-[#d4c4a8] w-20">{inst.name}</span>
                      <div className="flex gap-1">
                        <div className="w-8 h-1.5 bg-[#8b2323] relative"><div className="absolute top-0 left-0 h-full bg-[#cca366]" style={{width: `${inst.efficiency}%`}}/></div>
                        <div className="w-8 h-1.5 bg-[#8b2323] relative"><div className="absolute top-0 left-0 h-full bg-[#cca366]" style={{width: `${inst.corruption}%`}}/></div>
                        <div className="w-8 h-1.5 bg-[#8b2323] relative"><div className="absolute top-0 left-0 h-full bg-[#cca366]" style={{width: `${inst.loyalty}%`}}/></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <h3 className="text-[#e4cfa1] font-bold mt-4 mb-2 border-b border-[#c09a53]/30 pb-1">派系势力 (Factions)</h3>
                <div className="flex flex-col gap-2">
                  {factions.map(fac => (
                    <div key={fac.faction_id} className="flex justify-between items-center text-sm">
                      <span className="text-[#d4c4a8]">{fac.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[#3a2818] relative"><div className="absolute top-0 left-0 h-full bg-[#8b2323]" style={{width: `${fac.influence}%`}}/></div>
                        <span className="text-[#c09a53] w-6 text-right">{fac.influence}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setIsCourtOpen(false)
                    setShowConsult(true)
                  }}
                  className="mt-4 w-full py-2 bg-[#8b2323]/20 border border-[#8b2323]/50 text-[#e4cfa1] hover:bg-[#8b2323]/40 transition-colors shadow-inner"
                >
                  召集廷议 (Consult)
                </button>
              </div>
            </div>
          </div>
        )}

        <main className={cn("flex-1 overflow-y-auto relative", !isFullBleed && "p-6")}>
          {children}



          {/* Consult Modal */}
          {showConsult && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-[450]">
              <div className="w-[850px] h-[650px] bg-[#1a110b] border border-[#c09a53] shadow-[0_0_50px_rgba(0,0,0,0.8)] relative p-8 flex flex-col">
                <button onClick={() => setShowConsult(false)} className="absolute top-4 right-4 text-[#c09a53] hover:text-[#e4cfa1]"><X className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold text-[#e4cfa1] text-center border-b border-[#c09a53]/30 pb-4 mb-6">召集廷议</h2>
                
                <div className="flex gap-6 flex-1 min-h-0">
                  <div className="w-1/3 border-r border-[#c09a53]/30 pr-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                    {ministers.map(m => {
                      const isSelected = selectedMinisters.includes(m.minister_id)
                      return (
                        <div 
                          key={m.minister_id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMinisters(prev => prev.filter(id => id !== m.minister_id))
                            } else {
                              setSelectedMinisters(prev => [...prev, m.minister_id])
                            }
                          }}
                          className={cn(
                            "p-3 border cursor-pointer transition-colors",
                            isSelected ? "bg-[#8b2323]/20 border-[#8b2323] text-[#e4cfa1]" : "border-[#c09a53]/20 text-[#d4c4a8] hover:border-[#c09a53]/60"
                          )}
                        >
                          <div className="font-bold">{m.name} <span className="text-xs text-[#c09a53]/70 font-normal ml-2">{m.faction}</span></div>
                          <div className="text-xs mt-1 text-[#d4c4a8]/70">{m.role}</div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="w-2/3 flex flex-col h-full relative">
                    {consulting && (
                      <div className="absolute inset-0 bg-[#1a110b]/80 z-10 flex items-center justify-center text-[#c09a53] animate-pulse">
                        群臣正在殿外候旨...
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-6 custom-scrollbar">
                      {consultations.map(c => (
                        <div key={c.minister_id} className="bg-black/30 border border-[#c09a53]/20 p-4">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-lg font-bold text-[#e4cfa1]">{c.minister_name}</span>
                            <span className="text-xs bg-[#8b2323] text-[#f4ebd0] px-2 py-0.5">{c.stance}</span>
                          </div>
                          <p className="text-[#d4c4a8] leading-relaxed italic mb-4">"{c.content}"</p>
                          {c.warning_tags.length > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4 text-[#c09a53]" />
                              <div className="flex gap-2">
                                {c.warning_tags.map((tag, i) => <span key={i} className="text-xs text-[#c09a53] border border-[#c09a53]/30 px-1">{tag}</span>)}
                              </div>
                            </div>
                          )}
                          {c.recommended_policies.length > 0 && (
                            <div className="text-sm text-[#8a7f72]">建议动作: {c.recommended_policies.join(', ')}</div>
                          )}
                        </div>
                      ))}
                      {consultations.length === 0 && !consulting && (
                        <div className="text-center text-[#8a7f72] mt-20">请在左侧选择需要问策的大臣，然后点击下方按钮。</div>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t border-[#c09a53]/30 mt-auto flex justify-end">
                      <button 
                        onClick={handleConsult}
                        disabled={selectedMinisters.length === 0 || consulting}
                        className="bg-[#c09a53]/20 border border-[#c09a53] text-[#e4cfa1] px-6 py-2 hover:bg-[#c09a53]/40 disabled:opacity-50"
                      >
                        宣入殿内
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save/Load Modal */}
          {isSaveMenuOpen && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-[500] p-4">
              <div className="w-[600px] bg-[#1a110b] border-2 border-[#c09a53]/60 shadow-[0_0_50px_rgba(192,154,83,0.3)] relative p-8 flex flex-col rounded-sm">
                <button onClick={() => setIsSaveMenuOpen(false)} className="absolute top-4 right-4 text-[#c09a53] hover:text-[#e4cfa1]"><X className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold text-[#e4cfa1] text-center border-b border-[#c09a53]/30 pb-4 mb-6 flex items-center justify-center gap-3">
                  <ScrollText /> 御览玉牒 (存档管理)
                </h2>
                
                <div className="mb-8 border border-[#c09a53]/30 p-4 bg-[#2a1d13]/50">
                  <h3 className="text-[#c09a53] font-bold mb-3">封存宗庙 (新建存档)</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={saveNameInput}
                      onChange={e => setSaveNameInput(e.target.value)}
                      placeholder="如: 崇祯元年大捷"
                      className="flex-1 bg-[#1a110b] border border-[#c09a53]/50 text-[#e4cfa1] px-3 py-2 outline-none focus:border-[#c09a53]"
                    />
                    <button 
                      onClick={async () => {
                        if (saveNameInput.trim()) {
                          await saveGame(saveNameInput.trim());
                          const saves = await getSaves();
                          setSavesList(saves);
                          setSaveNameInput("");
                          showToast("存档成功！", "success");
                        }
                      }}
                      className="bg-[#8b2323]/40 border border-[#8b2323] text-[#e4cfa1] px-6 py-2 hover:bg-[#8b2323]/60 font-bold tracking-widest"
                    >
                      封存
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-[#c09a53] font-bold mb-3 border-b border-[#c09a53]/20 pb-2">逆转天机 (读取存档)</h3>
                  <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2">
                    {savesList.length === 0 ? (
                      <div className="text-center text-[#a38a6a] py-8">暂无宗庙秘档</div>
                    ) : (
                      savesList.map(save => (
                        <div key={save} className="flex items-center justify-between p-3 border border-[#c09a53]/20 bg-[#1a110b] hover:border-[#c09a53]/50 transition-colors">
                          <span className="text-[#e4cfa1] font-bold">{save}</span>
                          <button 
                            onClick={async () => {
                              showToast(`陛下，正在逆转时空至【${save}】...`, "info");
                              await loadGame(save);
                              setIsSaveMenuOpen(false);
                              showToast("时空逆转成功！", "success");
                              window.location.reload(); // Reload to refresh everything
                            }}
                            className="text-[#c09a53] hover:text-[#e4cfa1] bg-[#c09a53]/10 px-4 py-1 border border-[#c09a53]/30 text-sm tracking-widest"
                          >
                            起驾
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
