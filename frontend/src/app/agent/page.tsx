"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Loader2, Send, Bot, User, FileText, History, MessageSquare, MessageSquarePlus, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function AgentPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [trace, setTrace] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [selectedFileId, setSelectedFileId] = useState("all")
  const [runs, setRuns] = useState<any[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("trace")

  const fetchRuns = () => {
    api.agent.listRuns().then(setRuns).catch(console.error)
  }

  const handleNewChat = () => {
    setMessages([])
    setTrace([])
    setSelectedCitation(null)
    setActiveTab("trace")
  }

  const handleCitationClick = (citation: any) => {
    setSelectedCitation(citation)
    setActiveTab("reference")
  }

  const renderContentWithCitations = (content: string, citations: any[]) => {
    if (!citations || citations.length === 0) return content;
    
    // Split by [Source X]
    const parts = content.split(/(\[Source \d+\])/g);
    
    return parts.map((part, idx) => {
      const match = part.match(/\[Source (\d+)\]/);
      if (match) {
        const sourceIndex = parseInt(match[1]) - 1;
        const citation = citations[sourceIndex];
        if (citation) {
          return (
            <span 
              key={idx} 
              onClick={() => handleCitationClick(citation)}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium bg-blue-500/10 px-1 py-0.5 rounded mx-0.5 whitespace-nowrap"
            >
              {part}
            </span>
          );
        }
      }
      return <span key={idx}>{part}</span>;
    });
  }

  useEffect(() => {
    api.files.list().then(setFiles).catch(console.error)
    fetchRuns()
  }, [])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg = { role: "user", content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    setTrace([{ name: "Router", status: "running" }])

    try {
      const data = await api.agent.createRun(input, selectedFileId)
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer, citations: data.citations }])
      setTrace(data.trace_logs || [])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }])
      setTrace([{ name: "Error", status: "failed" }])
    } finally {
      setLoading(false)
      fetchRuns()
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6">
      {/* History Sidebar */}
      <div className={`transition-all duration-300 border rounded-lg bg-card overflow-hidden flex flex-col shrink-0 ${isHistoryOpen ? "w-64 opacity-100" : "w-0 opacity-0 border-0"}`}>
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Chat History</h3>
        </div>
        <ScrollArea className="flex-1 p-2">
          {runs.map(run => (
            <div 
              key={run.id}
              onClick={() => {
                setMessages([
                  { role: "user", content: run.query },
                  { role: "assistant", content: run.result, citations: [] }
                ])
                setTrace([])
              }}
              className="p-3 mb-2 rounded-md hover:bg-muted cursor-pointer text-sm border border-transparent hover:border-border transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{run.query}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {new Date(run.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          {runs.length === 0 && (
            <p className="text-xs text-center text-muted-foreground py-10 italic">No history found</p>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
              <History className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4" /> Agent Chat
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={selectedFileId} 
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="text-sm border rounded-md px-2 py-1 bg-background w-48 text-ellipsis overflow-hidden whitespace-nowrap"
            >
              <option value="all">All Documents</option>
              {files.map(f => (
                <option key={f.id} value={f.id}>{f.original_filename}</option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={handleNewChat} className="flex gap-1 h-8">
              <MessageSquarePlus className="h-4 w-4" /> New
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center opacity-50">
              <Bot className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">InsightGraph Agent</p>
              <p className="text-sm">Ask anything about your uploaded documents.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`mt-1 w-8 h-8 flex items-center justify-center shrink-0 rounded-full ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] space-y-2`}>
                    <Card className={`${msg.role === "user" ? "bg-primary text-primary-foreground" : ""}`}>
                      <CardContent className="p-3 text-sm leading-relaxed">
                        {msg.role === "assistant" ? renderContentWithCitations(msg.content, msg.citations) : msg.content}
                      </CardContent>
                    </Card>
                    {msg.citations && (
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((cit: any, j: number) => (
                          <div 
                            key={j} 
                            onClick={() => handleCitationClick(cit)}
                            className="cursor-pointer flex items-center gap-1 text-[10px] bg-secondary hover:bg-secondary/80 px-2 py-0.5 rounded-full text-secondary-foreground transition-colors"
                          >
                            <FileText className="h-2 w-2" /> {cit.file_id.slice(0, 4)}... p.{cit.page_number}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="mt-1 w-8 h-8 flex items-center justify-center shrink-0 rounded-full bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t bg-muted/30">
          <form className="flex gap-2 items-center" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-background border rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary text-sm h-10" 
              placeholder="Ask a question..."
              disabled={loading}
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
      
      <div className="w-96 border rounded-lg bg-card flex flex-col overflow-hidden shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full h-full">
          <div className="p-2 border-b bg-muted/30">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="trace">Execution Trace</TabsTrigger>
              <TabsTrigger value="reference">Reference</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="trace" className="flex-1 p-0 m-0 data-[state=active]:flex flex-col overflow-hidden h-full">
            <ScrollArea className="flex-1 p-4 h-full">
              {trace.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10 italic">
                  Wait for agent to start...
                </p>
              ) : (
                <div className="space-y-2">
                  {trace.map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${t.status === "completed" ? "bg-green-500" : t.status === "running" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
                        {i < trace.length - 1 && <div className="w-[1px] h-full bg-border my-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{t.name}</p>
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase">{t.status}</span>
                        </div>
                        {t.thought && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/40 p-2 rounded border leading-relaxed whitespace-pre-wrap">
                            {t.thought}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reference" className="flex-1 p-0 m-0 data-[state=active]:flex flex-col overflow-hidden h-full">
            <ScrollArea className="flex-1 p-4 h-full">
              {!selectedCitation ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center opacity-50">
                  <BookOpen className="h-8 w-8 mb-2" />
                  <p className="text-sm">Click a citation link to view the original source.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm leading-tight">Document Segment</h4>
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded">File ID: {selectedCitation.file_id}</span>
                      <span className="bg-muted px-2 py-0.5 rounded">Page: {selectedCitation.page_number}</span>
                    </div>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/50 p-3 rounded-md border">
                    {selectedCitation.content}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
