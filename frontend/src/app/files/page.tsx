"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Trash2, Loader2, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast" // Assuming it exists or I'll use alert

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'uploaded': return { percent: 10, label: 'Uploaded', color: 'bg-blue-500' };
      case 'parsing': return { percent: 25, label: 'Parsing Document', color: 'bg-blue-500' };
      case 'chunking': return { percent: 45, label: 'Chunking Text', color: 'bg-indigo-500' };
      case 'embedding': return { percent: 65, label: 'Generating Embeddings', color: 'bg-purple-500' };
      case 'summarizing': return { percent: 80, label: 'Summarizing', color: 'bg-fuchsia-500' };
      case 'graph_extracting': return { percent: 95, label: 'Extracting Graph', color: 'bg-pink-500' };
      case 'indexed': return { percent: 100, label: 'Indexed', color: 'bg-green-500' };
      case 'failed': return { percent: 100, label: 'Failed', color: 'bg-red-500' };
      default: return { percent: 0, label: status, color: 'bg-gray-500' };
    }
  };

  const loadFiles = async () => {
    setLoading(true)
    try {
      const data = await api.files.list()
      setFiles(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws"
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'file_status') {
          setFiles((prev) => 
            prev.map(f => f.id === data.file_id ? { ...f, status: data.status } : f)
          )
        }
      } catch (err) {
        console.error("WS parse error", err)
      }
    }

    return () => {
      ws.close()
    }
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      await api.files.upload(formData)
      await loadFiles()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.files.delete(id)
      await loadFiles()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Files</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadFiles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button disabled={uploading} onClick={() => document.getElementById('file-upload')?.click()}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload File
          </Button>
          <input id="file-upload" type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="border rounded-lg bg-card p-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg font-medium">No files yet</p>
            <p className="text-sm text-muted-foreground">Upload your first document to get started.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => {
            const info = getStatusInfo(file.status)
            return (
            <Card key={file.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{file.original_filename}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {file.file_type.toUpperCase()} • {(file.file_size / 1024 / 1024).toFixed(2)} MB • {info.label}
                    </p>
                    <div className="mt-2 w-48 bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ease-in-out ${info.color}`} 
                        style={{ width: `${info.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  )
}
