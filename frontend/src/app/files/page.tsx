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
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload File
              </span>
            </Button>
          </label>
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
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{file.original_filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.file_type.toUpperCase()} • {(file.file_size / 1024 / 1024).toFixed(2)} MB • {file.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
