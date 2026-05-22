"use client"

import { useState, useEffect, useCallback } from "react"
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, Connection, Edge } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { api } from "@/lib/api"
import { Loader2, Share2, Search, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function GraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEntity, setSelectedEntity] = useState<any>(null)

  const loadGraph = async (query: string = "") => {
    setLoading(true)
    try {
      let data;
      if (query) {
        data = await api.graph.search(query)
        // Transform search results to nodes/edges
        const newNodes: any[] = []
        const newEdges: any[] = []
        
        data.results.forEach((res: any, i: number) => {
          const entityId = `entity-${res.entity}`
          const docId = `doc-${res.document_id}`
          
          if (!newNodes.find(n => n.id === entityId)) {
            newNodes.push({
              id: entityId,
              data: { label: res.entity, type: res.type },
              position: { x: Math.random() * 400, y: Math.random() * 400 },
              style: { background: "#3b82f6", color: "#fff", borderRadius: "8px" }
            })
          }
          
          if (!newNodes.find(n => n.id === docId)) {
            newNodes.push({
              id: docId,
              data: { label: `Doc: ${res.document_id.slice(0,8)}...` },
              position: { x: Math.random() * 400, y: Math.random() * 400 },
              style: { background: "#10b981", color: "#fff", borderRadius: "4px" }
            })
          }
          
          newEdges.push({
            id: `e-${entityId}-${docId}`,
            source: docId,
            target: entityId,
            label: "MENTIONS",
            animated: true
          })
        })
        
        setNodes(newNodes)
        setEdges(newEdges)
      } else {
        const entities = await api.graph.listEntities()
        const initialNodes = entities.map((e: any, i: number) => ({
          id: e.name,
          data: { label: e.name, type: e.type },
          position: { x: (i % 5) * 150, y: Math.floor(i / 5) * 100 },
          style: { background: "#3b82f6", color: "#fff", borderRadius: "8px", padding: "10px" }
        }))
        setNodes(initialNodes)
        setEdges([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGraph()
  }, [])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onNodeClick = (_: any, node: any) => {
    setSelectedEntity(node.data)
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-6">
      <div className="flex-1 border rounded-lg bg-card relative overflow-hidden">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search graph..." 
              className="pl-8 w-64 bg-background/80 backdrop-blur"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadGraph(searchQuery)}
            />
          </div>
          <Button onClick={() => loadGraph(searchQuery)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <div className="w-80 space-y-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" /> Entity Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {selectedEntity ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Name</label>
                  <p className="text-sm font-semibold">{selectedEntity.label}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Type</label>
                  <p className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full inline-block mt-1">
                    {selectedEntity.type || "UNKNOWN"}
                  </p>
                </div>
                <Button className="w-full mt-4" size="sm">
                  Find Related Documents
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-10">
                Click a node to view details
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-sm">Graph Legend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span>Knowledge Entity</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span>Document</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-8 h-0.5 bg-muted-foreground" />
              <span>Relationship</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
