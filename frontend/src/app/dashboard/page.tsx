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
    { name: "Total Files", value: loading ? "..." : (statsData?.total_files || 0).toString(), icon: FileText },
    { name: "Agent Runs", value: loading ? "..." : (statsData?.agent_runs || 0).toString(), icon: MessageSquare },
    { name: "Knowledge Entities", value: loading ? "..." : (statsData?.knowledge_entities || 0).toString(), icon: Share2 },
    { name: "Storage Used", value: loading ? "..." : formatBytes(statsData?.storage_used_bytes || 0), icon: Activity },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t("Dashboard")}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading activity..." : "No recent activity found."}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Backend: {loading ? "Checking..." : "Online"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Vector DB: Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">Graph DB: Online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
