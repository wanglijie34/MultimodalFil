"use client"

import { useI18n } from "@/lib/i18n"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, MessageSquare, Share2, Activity } from "lucide-react"
import { api } from "@/lib/api"

interface DashboardStats {
  total_files: number
  agent_runs: number
  knowledge_entities: number
  storage_used_bytes: number
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default function DashboardPage() {

  const { t } = useI18n()
  const [statsData, setStatsData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const data = await api.system.getStats()
      setStatsData(data)
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    const handleStatsRefresh = () => {
      fetchStats()
    }

    window.addEventListener("insightgraph:stats-refresh", handleStatsRefresh)
    return () => {
      window.removeEventListener("insightgraph:stats-refresh", handleStatsRefresh)
    }
  }, [])

  const stats = [
    { name: "卷宗总数", value: loading ? "..." : (statsData?.total_files || 0).toString(), icon: FileText },
    { name: "廷议次数", value: loading ? "..." : (statsData?.agent_runs || 0).toString(), icon: MessageSquare },
    { name: "天下纪略", value: loading ? "..." : (statsData?.knowledge_entities || 0).toString(), icon: Share2 },
    { name: "库房占用", value: loading ? "..." : formatBytes(statsData?.storage_used_bytes || 0), icon: Activity },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#c09a53]/30 pb-4">
        <h2 className="text-3xl font-bold tracking-[0.2em] text-[#e4cfa1]">司礼监奏报</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="bg-[#1a110b]/90 border-[#c09a53]/30 rounded-sm relative overflow-hidden">
            <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none z-10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-20">
              <CardTitle className="text-[13px] font-bold tracking-widest text-[#a38a6a]">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-[#c09a53]/70" />
            </CardHeader>
            <CardContent className="relative z-20">
              <div className="text-3xl font-bold text-[#e4cfa1]">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-[#1a110b]/90 border-[#c09a53]/30 rounded-sm relative overflow-hidden">
          <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none z-10" />
          <CardHeader className="border-b border-[#c09a53]/30 bg-[#2a1d15]/50 relative z-20">
            <CardTitle className="text-[#e4cfa1] tracking-widest text-lg">各地急递</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 relative z-20">
            <p className="text-[14px] text-[#a38a6a]">
              {loading ? "快马驿递传输中..." : "四海升平，暂无急递。"}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-[#1a110b]/90 border-[#c09a53]/30 rounded-sm relative overflow-hidden">
          <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none z-10" />
          <CardHeader className="border-b border-[#c09a53]/30 bg-[#2a1d15]/50 relative z-20">
            <CardTitle className="text-[#e4cfa1] tracking-widest text-lg">大明气运</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 relative z-20">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#8b2323] shadow-[0_0_8px_#8b2323]" />
                <span className="text-[14px] font-medium text-[#e4cfa1]">六部运转：{loading ? "卜算中..." : "安宁"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#8b2323] shadow-[0_0_8px_#8b2323]" />
                <span className="text-[14px] font-medium text-[#e4cfa1]">司礼监运转：安宁</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#8b2323] shadow-[0_0_8px_#8b2323]" />
                <span className="text-[14px] font-medium text-[#e4cfa1]">通政司运转：安宁</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
