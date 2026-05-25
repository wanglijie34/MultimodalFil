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
  Book as BookIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

import { useI18n } from "@/lib/i18n"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Files", href: "/files", icon: FileText },
  { name: "Books", href: "/books", icon: BookIcon },
  { name: "Search", href: "/search", icon: Search },
  { name: "Agent Chat", href: "/agent", icon: MessageSquare },
  { name: "Knowledge Graph", href: "/graph", icon: Share2 },
  { name: "Reports", href: "/reports", icon: FileBarChart },
]

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <div className="flex flex-col w-64 border-r bg-muted/20">
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Share2 className="h-6 w-6" />
          <span>{t("InsightGraph")}</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.name === "Dashboard" ? "/dashboard" : item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname.startsWith(item.href) || (pathname === "/dashboard" && item.name === "Dashboard")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "mr-3 h-5 w-5 flex-shrink-0",
                pathname.startsWith(item.href) || (pathname === "/dashboard" && item.name === "Dashboard")
                  ? "text-primary-foreground"
                  : "text-muted-foreground group-hover:text-foreground"
              )} />
              {t(item.name)}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t">
        <Link
          href="/settings"
          className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
          {t("Settings")}
        </Link>
      </div>
    </div>
  )
}
