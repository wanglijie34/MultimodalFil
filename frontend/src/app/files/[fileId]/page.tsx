"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Loader2, FileText, ArrowLeft, Download, Trash2, Layers, Tag, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const fileId = params.fileId as string
  const [file, setFile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFile = async () => {
      setLoading(true)
      try {
        const data = await api.files.get(fileId)
        setFile(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadFile()
  }, [fileId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!file) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium">File not found</p>
        <Button variant="link" onClick={() => router.push("/files")}>Go back to files</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/files")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{file.original_filename}</h2>
            <p className="text-sm text-muted-foreground">ID: {file.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="secondary">{file.file_type.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Size</span>
                <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <Badge className={file.status === "indexed" ? "bg-green-500" : "bg-yellow-500"}>
                  {file.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pages</span>
                <span>{file.page_count}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Chunks</span>
                <span>{file.chunk_count}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">+ Add Tag</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="preview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="chunks">Chunks</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="mt-6">
              <Card className="h-[600px] flex items-center justify-center bg-muted/30 border-dashed">
                <div className="text-center space-y-2 opacity-50">
                  <FileText className="h-12 w-12 mx-auto" />
                  <p className="text-sm">PDF/Document Preview will be rendered here.</p>
                  <p className="text-xs">Supports PDF.js integration in next phase.</p>
                </div>
              </Card>
            </TabsContent>
            <TabsContent value="chunks" className="mt-6">
              <Card>
                <CardContent className="p-0">
                  <div className="p-12 text-center text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Chunk listing coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="entities" className="mt-6">
              <Card>
                <CardContent className="p-0">
                  <div className="p-12 text-center text-muted-foreground">
                    <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Extracted entities for this file...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
