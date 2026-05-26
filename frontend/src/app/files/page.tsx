"use client"

import { useI18n } from "@/lib/i18n"
import { startTransition, useCallback, useEffect, useMemo, useState } from "react"
import {
  Braces,
  Database,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileText,
  FileVideo,
  FolderKanban,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"

import { api, resolveWebSocketUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/hooks/use-toast"

type ManagedFile = {
  id: string
  original_filename: string
  file_type: string
  file_size: number
  status: string
  page_count: number
  chunk_count: number
  error_message?: string | null
  file_category?: string | null
  category_label?: string | null
  indexing_profile?: string | null
  embedding_strategy?: string | null
  retrieval_strategy?: string | null
  supported_for_ingestion?: boolean
  parser_name?: string | null
}

type CategorySummary = {
  key: string
  label: string
  count: number
  indexed: number
  searchable: number
}

const CATEGORY_ORDER = [
  "document",
  "presentation",
  "spreadsheet",
  "source_code",
  "structured_data",
  "image",
  "audio",
  "video",
  "archive",
  "other",
]

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function getCategoryIcon(category?: string | null) {
  switch (category) {
    case "document":
      return FileText
    case "presentation":
      return FolderKanban
    case "spreadsheet":
      return Database
    case "source_code":
      return FileCode2
    case "structured_data":
      return Braces
    case "image":
      return FileImage
    case "audio":
      return FileAudio
    case "video":
      return FileVideo
    case "archive":
      return FileArchive
    default:
      return FileText
  }
}

function getCategoryTint(category?: string | null) {
  switch (category) {
    case "document":
      return "bg-sky-50 text-sky-700 border-sky-200"
    case "presentation":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "spreadsheet":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "source_code":
      return "bg-slate-100 text-slate-700 border-slate-200"
    case "structured_data":
      return "bg-violet-50 text-violet-700 border-violet-200"
    case "image":
      return "bg-pink-50 text-pink-700 border-pink-200"
    case "audio":
      return "bg-orange-50 text-orange-700 border-orange-200"
    case "video":
      return "bg-rose-50 text-rose-700 border-rose-200"
    case "archive":
      return "bg-stone-100 text-stone-700 border-stone-200"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

function getStatusInfo(status: string) {
  switch (status) {
    case "stored":
      return { percent: 100, label: "Stored only", color: "bg-slate-400" }
    case "uploaded":
      return { percent: 10, label: "Uploaded", color: "bg-blue-500" }
    case "parsing":
      return { percent: 25, label: "Parsing document", color: "bg-blue-500" }
    case "chunking":
      return { percent: 45, label: "Chunking text", color: "bg-indigo-500" }
    case "embedding":
      return { percent: 65, label: "Generating embeddings", color: "bg-fuchsia-500" }
    case "summarizing":
      return { percent: 80, label: "Building summary index", color: "bg-violet-500" }
    case "graph_extracting":
      return { percent: 92, label: "Extracting knowledge graph", color: "bg-pink-500" }
    case "indexed":
      return { percent: 100, label: "Indexed", color: "bg-green-500" }
    case "failed":
      return { percent: 100, label: "Failed", color: "bg-red-500" }
    default:
      return { percent: 0, label: status, color: "bg-gray-500" }
  }
}

export default function FilesPage() {

  const { t } = useI18n()
  const [files, setFiles] = useState<ManagedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all")
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<ManagedFile | null>(null)
  const { toast } = useToast()

  const loadFiles = useCallback(async (options?: { skipLoading?: boolean }) => {
    if (!options?.skipLoading) {
      setLoading(true)
    }
    try {
      const data = await api.files.list()
      startTransition(() => {
        setFiles(data)
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Load failed",
        description: "Unable to load the file inventory.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadFiles({ skipLoading: true })
    }, 0)

    const wsUrl = resolveWebSocketUrl()
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "file_status") {
          setFiles((prev) =>
            prev.map((file) => (file.id === data.file_id ? { ...file, status: data.status } : file))
          )
        }
      } catch (err) {
        console.error("WS parse error", err)
      }
    }

    return () => {
      window.clearTimeout(initialLoad)
      ws.close()
    }
  }, [loadFiles])

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await api.files.upload(formData)
      await loadFiles()
      toast({
        title: "Upload queued",
        description: response.message || "File uploaded successfully.",
        variant: "success",
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Upload failed",
        description: "Unable to upload this file.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  const handleDelete = async (file: ManagedFile) => {
    const previousFiles = files
    startTransition(() => {
      setFiles((prev) => prev.filter((item) => item.id !== file.id))
    })
    setDeletingFileId(file.id)
    try {
      await api.files.delete(file.id)
      await loadFiles({ skipLoading: true })
      window.dispatchEvent(new Event("insightgraph:stats-refresh"))
      toast({
        title: "Deleted",
        description: "File and related indexed data removed.",
        variant: "success",
      })
    } catch (err) {
      console.error(err)
      startTransition(() => {
        setFiles(previousFiles)
      })
      toast({
        title: "Delete failed",
        description: "Unable to remove this file.",
        variant: "destructive",
      })
    } finally {
      setDeletingFileId(null)
      setConfirmDeleteFile(null)
    }
  }

  const summaries = useMemo<CategorySummary[]>(() => {
    const bucket = new Map<string, CategorySummary>()
    files.forEach((file) => {
      const key = file.file_category || "other"
      const current = bucket.get(key) || {
        key,
        label: file.category_label || "Other",
        count: 0,
        indexed: 0,
        searchable: 0,
      }
      current.count += 1
      current.indexed += file.status === "indexed" ? 1 : 0
      current.searchable += file.supported_for_ingestion ? 1 : 0
      bucket.set(key, current)
    })

    return Array.from(bucket.values()).sort((a, b) => {
      const left = CATEGORY_ORDER.indexOf(a.key)
      const right = CATEGORY_ORDER.indexOf(b.key)
      return (left === -1 ? CATEGORY_ORDER.length : left) - (right === -1 ? CATEGORY_ORDER.length : right)
    })
  }, [files])

  const filteredFiles = useMemo(() => {
    if (activeCategory === "all") return files
    return files.filter((file) => (file.file_category || "other") === activeCategory)
  }, [activeCategory, files])

  const groupedFiles = useMemo(() => {
    const groups = new Map<string, { label: string; items: ManagedFile[] }>()
    filteredFiles.forEach((file) => {
      const key = file.file_category || "other"
      const group = groups.get(key) || {
        label: file.category_label || "Other",
        items: [],
      }
      group.items.push(file)
      groups.set(key, group)
    })

    return Array.from(groups.entries())
      .sort((a, b) => {
        const left = CATEGORY_ORDER.indexOf(a[0])
        const right = CATEGORY_ORDER.indexOf(b[0])
        return (left === -1 ? CATEGORY_ORDER.length : left) - (right === -1 ? CATEGORY_ORDER.length : right)
      })
      .map(([key, value]) => ({ key, ...value }))
  }, [filteredFiles])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef2ff_100%)] p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t("Files")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Files are grouped by category, and each category shows how it is parsed, embedded, indexed, and retrieved.
            Text documents, markdown, code, config, and lightweight data files now follow different semantic indexing profiles.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => loadFiles()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button disabled={uploading} onClick={() => document.getElementById("file-upload")?.click()}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload File
          </Button>
          <input id="file-upload" type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total files",
            value: files.length,
            caption: "All uploaded files, across every category.",
          },
          {
            label: "Search-ready",
            value: files.filter((file) => file.supported_for_ingestion).length,
            caption: "Files that can go through semantic embedding and retrieval.",
          },
          {
            label: "Indexed now",
            value: files.filter((file) => file.status === "indexed").length,
            caption: "Files already finished chunking, embedding, and indexing.",
          },
          {
            label: "Metadata only",
            value: files.filter((file) => !file.supported_for_ingestion).length,
            caption: "Stored safely, waiting for a future modality-specific extractor.",
          },
        ].map((item) => (
          <Card key={item.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
              <div className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All categories
            </button>
            {summaries.map((summary) => (
              <button
                key={summary.key}
                type="button"
                onClick={() => setActiveCategory(summary.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === summary.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {summary.label} · {summary.count}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summaries.map((summary) => {
              const Icon = getCategoryIcon(summary.key)
              return (
                <div key={summary.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-2xl border p-2 ${getCategoryTint(summary.key)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">{summary.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {summary.count} files · {summary.searchable} search-ready · {summary.indexed} indexed
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg font-medium text-slate-900">No files yet</p>
            <p className="text-sm text-slate-500">Upload your first document, code file, config, or dataset to start indexing.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedFiles.map((group) => {
            const GroupIcon = getCategoryIcon(group.key)
            return (
              <section key={group.key} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl border p-2 ${getCategoryTint(group.key)}`}>
                    <GroupIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{group.label}</h3>
                    <p className="text-sm text-slate-500">{group.items.length} files in this category</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {group.items.map((file) => {
                    const info = getStatusInfo(file.status)
                    const Icon = getCategoryIcon(file.file_category)
                    return (
                      <Card key={file.id} className="overflow-hidden border-slate-200 shadow-sm">
                        <CardContent className="p-0">
                          <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex min-w-0 flex-1 gap-4">
                              <div className={`rounded-2xl border p-3 ${getCategoryTint(file.file_category)}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-base font-semibold text-slate-900">{file.original_filename}</p>
                                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getCategoryTint(file.file_category)}`}>
                                    {(file.file_type || "unknown").toUpperCase()}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                    {file.status === "indexed" ? "Search-ready" : info.label}
                                  </span>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                                  <span>{formatFileSize(file.file_size)}</span>
                                  <span>{file.page_count} pages</span>
                                  <span>{file.chunk_count} chunks</span>
                                  <span>{file.parser_name || "No parser"}</span>
                                </div>

                                <div className="mt-4 w-full max-w-sm overflow-hidden rounded-full bg-slate-100">
                                  <div className={`h-1.5 transition-all duration-500 ${info.color}`} style={{ width: `${info.percent}%` }} />
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Index Profile</div>
                                    <div className="mt-2 text-sm font-medium text-slate-800">{file.indexing_profile || "metadata_only"}</div>
                                  </div>
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Embedding</div>
                                    <div className="mt-2 text-sm leading-6 text-slate-700">{file.embedding_strategy}</div>
                                  </div>
                                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Retrieval</div>
                                    <div className="mt-2 text-sm leading-6 text-slate-700">{file.retrieval_strategy}</div>
                                  </div>
                                </div>

                                {file.error_message && (
                                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    {file.error_message}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDeleteFile(file)}
                                disabled={deletingFileId === file.id}
                              >
                                {deletingFileId === file.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteFile !== null}
        title="Delete this file?"
        description={
          confirmDeleteFile
            ? `This will remove "${confirmDeleteFile.original_filename}" and its indexed chunks, citations, and related graph data. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete file"
        cancelLabel="Keep file"
        variant="destructive"
        loading={deletingFileId !== null}
        onCancel={() => {
          if (deletingFileId) return
          setConfirmDeleteFile(null)
        }}
        onConfirm={() => {
          if (!confirmDeleteFile) return
          void handleDelete(confirmDeleteFile)
        }}
      />
    </div>
  )
}
