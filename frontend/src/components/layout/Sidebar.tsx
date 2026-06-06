"use client"
import { useState } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  FileText, 
  Search, 
  MessageSquare, 
  Share2, 
  FileBarChart,
  Settings,
  Book as BookIcon,
  Map as MapIcon,
  PanelLeftClose,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useI18n } from "@/lib/i18n"

const navigation = [
  { name: "御门听政", href: "/dashboard", icon: LayoutDashboard },
  { name: "大明堪舆图", href: "/map", icon: MapIcon },
  { name: "朝堂百官", href: "/court", icon: Users },
  { name: "内阁卷宗", href: "/files", icon: FileText },
  { name: "内府藏书", href: "/books", icon: BookIcon },
  { name: "锦衣卫密查", href: "/search", icon: Search },
  { name: "翰林经筵", href: "/agent", icon: MessageSquare },
  { name: "脉络推演", href: "/graph", icon: Share2 },
  { name: "各地奏报", href: "/reports", icon: FileBarChart },
]

const STATE_DESCRIPTIONS: Record<string, string> = {
  "雷霆万钧": "天子威望极高，百官慑服。政令执行率上升，流程摩擦大幅减小。",
  "政令不出乾清宫": "威望低迷，皇权旁落。政令被无限期拖延，地方阳奉阴违，执行率极低。",
  "中旨抗药性": "连发中旨导致法统崩坏。百官伏阙请愿，常规诏令原地死锁，通政司罢工。",
  "深宫疑云": "皇帝猜忌深重，圣意难测。解析系统会故意曲解诏书，政令大概率发生变异。",
  "门户之见": "朝堂党争极度胶着。若强行推进党争议案，流程摩擦将被恶意拉满。",
  "弹劾狂热": "言官杀红了眼。弹劾奏折满天飞，能臣压力暴增，行政效率大幅下滑。",
  "南财北调阻断": "江南士绅抗税。南方各省税收解运率暴跌，国库断血。",
  "层层剥皮": "官僚系统深度腐败。赈灾与调粮指令在途损耗率强制拉高至 80%。",
  "积案如山": "奏折留中不发过多。中央行政秩序紊乱，威望与行政效率持续下降。",
  "长城锁死": "满清边患极度严重。九边精锐被全部锁死在防线上，无法抽调回内地剿匪。",
  "流贼狂飙": "天灾加重赋导致难民失控。流寇滋生速度暴增 150%，且向周边省份迅速蔓延。"
}

export function Sidebar({ isOpen, setIsOpen, gameState }: { isOpen?: boolean, setIsOpen?: (val: boolean) => void, gameState?: any }) {
  const [isStatesExpanded, setIsStatesExpanded] = useState(false)
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <div className={cn(
      "flex flex-col border-r border-[#c09a53]/40 bg-[#1a110b]/95 transition-all duration-300 ease-in-out shrink-0 z-40 relative shadow-2xl",
      isOpen === false ? "w-0 overflow-hidden border-r-0" : "w-64"
    )}>
      <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
      <div className="flex h-16 items-center justify-between px-6 border-b border-[#c09a53]/30 shrink-0 whitespace-nowrap relative z-10 bg-[radial-gradient(ellipse_at_top,_rgba(192,154,83,0.1),_transparent)]">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-[#e4cfa1] tracking-widest drop-shadow-md">
          <Share2 className="h-6 w-6 text-[#c09a53]" />
          <span>大明堪舆</span>
        </Link>
        {setIsOpen && (
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 -mr-2 text-[#a38a6a] hover:text-[#e4cfa1] transition-colors hover:bg-[#c09a53]/20 rounded-md"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-6 py-4 border-b border-[#c09a53]/20 relative z-10 shrink-0">
        <div className="flex flex-col relative">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#e4cfa1] tracking-widest drop-shadow-md whitespace-nowrap">崇祯元年 · 十月</h2>
          </div>
          {gameState?.active_states && gameState.active_states.length > 0 && (
            <button 
              onClick={() => setIsStatesExpanded(!isStatesExpanded)}
              className="flex items-center gap-1 px-2 py-0.5 mt-2 border border-[#8b2323] bg-[#8b2323]/20 hover:bg-[#8b2323]/40 text-[#e8debe] text-[11px] rounded-sm transition-colors shadow-[0_0_5px_rgba(139,35,35,0.5)] whitespace-nowrap self-start"
            >
              <span>天下危局 ({gameState.active_states.length})</span>
              <svg className={`w-3 h-3 transition-transform ${isStatesExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          
          {isStatesExpanded && gameState?.active_states && gameState.active_states.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-[#8b2323]/30">
              {gameState.active_states.map((state: string, idx: number) => (
                <div key={idx} className="flex flex-col border-l-2 border-[#8b2323] pl-2 py-1 relative group">
                  <span className="text-[12px] font-bold text-[#e8debe] cursor-help">{state}</span>
                  <div className="absolute left-0 top-full mt-1 w-[220px] p-2.5 bg-[#1a110b] border border-[#c09a53]/40 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[110] text-[#d4c4a8] text-[12px] whitespace-normal leading-relaxed">
                    {STATE_DESCRIPTIONS[state] || "系统状态正在生效中，它将深远改变底层流转规则。"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 whitespace-nowrap relative z-10">
        <nav className="px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href) || (pathname === "/dashboard" && item.name === "御门听政");
            return (
              <Link
                key={item.name}
                href={item.name === "御门听政" ? "/dashboard" : item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-[15px] font-bold tracking-widest rounded-sm transition-all duration-300 relative overflow-hidden",
                  isActive
                    ? "bg-[#c09a53]/20 text-[#e4cfa1] border border-[#c09a53] shadow-[inset_0_0_15px_rgba(192,154,83,0.2)]"
                    : "text-[#a38a6a] border border-transparent hover:bg-[#c09a53]/10 hover:text-[#d4b392] hover:border-[#c09a53]/30"
                )}
              >
                {isActive && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(192,154,83,0.15),_transparent)] pointer-events-none" />}
                <item.icon className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 relative z-10",
                  isActive ? "text-[#c09a53] drop-shadow-[0_0_5px_#c09a53]" : "text-[#a38a6a] group-hover:text-[#c09a53]"
                )} />
                <span className="relative z-10 group-hover:translate-x-1 transition-transform">{t(item.name)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-[#c09a53]/30 shrink-0 whitespace-nowrap relative z-10">
        <Link
          href="/settings"
          className="flex items-center px-3 py-2 text-[15px] font-bold tracking-widest text-[#a38a6a] rounded-sm hover:bg-[#c09a53]/20 hover:text-[#e4cfa1] border border-transparent hover:border-[#c09a53]/30 transition-all duration-300 group"
        >
          <Settings className="mr-3 h-5 w-5 flex-shrink-0 group-hover:text-[#c09a53]" />
          <span className="group-hover:translate-x-1 transition-transform">{t("系统设定")}</span>
        </Link>
      </div>
    </div>
  )
}
