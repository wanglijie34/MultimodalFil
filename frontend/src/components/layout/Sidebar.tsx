"use client"

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

export function Sidebar({ isOpen, setIsOpen }: { isOpen?: boolean, setIsOpen?: (val: boolean) => void }) {
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
