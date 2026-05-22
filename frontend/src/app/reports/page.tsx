"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Loader2, FileText, Plus, ExternalLink, Calendar, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [topic, setTopic] = useState("")
  const [selectedReport, setSelectedReport] = useState<any>(null)

  const loadReports = async () => {
    setLoading(true)
    try {
      const data = await api.reports.list()
      setReports(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return

    setGenerating(true)
    try {
      await api.reports.generate(topic)
      setTopic("")
      await loadReports()
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate New Report</CardTitle>
              <CardDescription>Enter a topic to generate a comprehensive analysis from your knowledge base.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <Input 
                  placeholder="e.g. AI Agent Trends 2024" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={generating}
                />
                <Button className="w-full" disabled={generating || !topic.trim()}>
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Generate Report
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Previous Reports</h3>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No reports generated yet.</p>
            ) : (
              reports.map((report) => (
                <Card 
                  key={report.id} 
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${selectedReport?.id === report.id ? 'border-primary bg-accent' : ''}`}
                  onClick={() => setSelectedReport(report)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{report.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedReport ? (
            <Card className="h-full min-h-[600px] flex flex-col">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedReport.title}</CardTitle>
                    <div className="flex gap-4 mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> System Generated
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(selectedReport.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Export PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-6 overflow-y-auto prose dark:prose-invert max-w-none">
                {/* For MVP, just show as pre-formatted text or simple markdown parser if available */}
                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {selectedReport.content}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[600px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-12 opacity-50">
              <FileText className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-medium">No Report Selected</h3>
              <p className="text-sm text-muted-foreground">Select a report from the list or generate a new one to view its content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
