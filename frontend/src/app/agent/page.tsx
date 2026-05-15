"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { Loader2, Send, Bot, User, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"

export default function AgentPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [trace, setTrace] = useState<any[]>([])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg = { role: "user", content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)
    setTrace([{ name: "Router", status: "running" }])

    try {
      const data = await api.agent.createRun(input)
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer, citations: data.citations }])
      setTrace([
        { name: "Router", status: "completed" },
        { name: "Retrieval", status: "completed" },
        { name: "Writer", status: "completed" }
      ])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }])
      setTrace([{ name: "Error", status: "failed" }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6">
      <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4" /> Agent Chat
          </h3>
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
                  <div className={`mt-1 p-2 rounded-full ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] space-y-2`}>
                    <Card className={`${msg.role === "user" ? "bg-primary text-primary-foreground" : ""}`}>
                      <CardContent className="p-3 text-sm leading-relaxed">
                        {msg.content}
                      </CardContent>
                    </Card>
                    {msg.citations && (
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((cit: any, j: number) => (
                          <div key={j} className="flex items-center gap-1 text-[10px] bg-secondary px-2 py-0.5 rounded-full text-secondary-foreground">
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
                  <div className="mt-1 p-2 rounded-full bg-muted">
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
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-background border rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary text-sm" 
              placeholder="Ask a question..."
              disabled={loading}
            />
            <Button size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
      
      <div className="w-80 border rounded-lg bg-card flex flex-col">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Execution Trace</h3>
        </div>
        <div className="flex-1 p-4">
          {trace.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10 italic">
              Wait for agent to start...
            </p>
          ) : (
            <div className="space-y-4">
              {trace.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${t.status === "completed" ? "bg-green-500" : t.status === "running" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{t.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
