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
      return "bg-[#2a1d15] text-[#cca366] border-[#c09a53]/40"
    case "presentation":
      return "bg-[#2a1d15] text-[#d49a6a] border-[#d49a6a]/40"
    case "spreadsheet":
      return "bg-[#2a1d15] text-[#e4cfa1] border-[#e4cfa1]/40"
    case "source_code":
      return "bg-[#2a1d15] text-[#a38a6a] border-[#a38a6a]/40"
    case "structured_data":
      return "bg-[#2a1d15] text-[#c09a53] border-[#c09a53]/40"
    case "image":
      return "bg-[#2a1d15] text-[#ffcc99] border-[#ffcc99]/40"
    case "audio":
      return "bg-[#2a1d15] text-[#d49a6a] border-[#d49a6a]/40"
    case "video":
      return "bg-[#2a1d15] text-[#ff6666] border-[#ff6666]/40"
    case "archive":
      return "bg-[#2a1d15] text-[#cca366] border-[#cca366]/40"
    default:
      return "bg-[#1a110b] text-[#a38a6a] border-[#c09a53]/20"
  }
}

function getStatusInfo(status: string) {
  switch (status) {
    case "stored":
      return { percent: 100, label: "已入库", color: "bg-[#a38a6a]" }
    case "uploaded":
      return { percent: 10, label: "已交翰林院", color: "bg-[#c09a53]" }
    case "parsing":
      return { percent: 25, label: "解析卷宗", color: "bg-[#c09a53]" }
    case "chunking":
      return { percent: 45, label: "分拆章节", color: "bg-[#d49a6a]" }
    case "embedding":
      return { percent: 65, label: "凝练真意", color: "bg-[#d49a6a]" }
    case "summarizing":
      return { percent: 80, label: "编纂大纲", color: "bg-[#e4cfa1]" }
    case "graph_extracting":
      return { percent: 92, label: "抽丝剥茧", color: "bg-[#e4cfa1]" }
    case "indexed":
      return { percent: 100, label: "可供查阅", color: "bg-[#8b2323]" }
    case "failed":
      return { percent: 100, label: "损毁", color: "bg-[#d32f2f]" }
    default:
      return { percent: 0, label: status, color: "bg-[#a38a6a]" }
  }
}

function getCategoryChineseName(label?: string | null) {
  if (!label) return "杂编"
  const map: Record<string, string> = {
    "Text & Document": "案牍文书",
    "Presentation": "廷议奏报",
    "Spreadsheet & Data": "户部账册",
    "Source Code": "工部机枢",
    "Structured Data & Config": "阵法图录",
    "Image": "天下图录",
    "Audio": "大明雅音",
    "Video": "留影",
    "Archive": "封藏",
    "Other": "杂编",
  }
  return map[label] || label
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
        title: "已交翰林院",
        description: response.message || "相关案牍已送交翰林院编修。",
        variant: "success",
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "移交失败",
        description: "翰林院拒收此案牍。",
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
        title: "已焚毁",
        description: "此卷宗已被彻底销毁。",
        variant: "success",
      })
    } catch (err) {
      console.error(err)
      startTransition(() => {
        setFiles(previousFiles)
      })
      toast({
        title: "焚毁失败",
        description: "无法销毁此卷宗。",
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
        label: getCategoryChineseName(file.category_label),
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
        label: getCategoryChineseName(file.category_label),
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
      <div className="flex flex-col gap-4 rounded-sm border border-[#c09a53]/40 bg-[#1a110b]/95 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.6)] md:flex-row md:items-center md:justify-between relative">
        <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
        <div className="max-w-2xl relative z-10">
          <h2 className="text-3xl font-bold tracking-[0.2em] text-[#e4cfa1]">内阁卷宗</h2>
          <p className="mt-2 text-[15px] leading-relaxed tracking-wide text-[#a38a6a]">
            卷宗按类别归档，陛下可查阅各类公文是如何被拆解、收录与检视的。奏折、账册、刑名、邸报等将遵从大明不同的入库礼制。
          </p>
        </div>
        <div className="flex gap-4 relative z-10">
          <Button variant="outline" size="icon" onClick={() => loadFiles()} disabled={loading} className="bg-[#2a1d15] border-[#c09a53]/50 text-[#c09a53] hover:bg-[#c09a53]/20 hover:text-[#e4cfa1]">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button disabled={uploading} onClick={() => document.getElementById("file-upload")?.click()} className="bg-[#8b2323] text-[#f4ebd0] border border-[#3d2b1f] hover:bg-[#6a1b1b] tracking-widest font-bold">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            翰林院编修
          </Button>
          <input id="file-upload" type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "卷宗总数",
            value: files.length,
            caption: "藏经阁中收录的所有折子。",
          },
          {
            label: "可供查阅",
            value: files.filter((file) => file.supported_for_ingestion).length,
            caption: "已被史官分类，可供陛下随时审阅的卷宗。",
          },
          {
            label: "已然入库",
            value: files.filter((file) => file.status === "indexed").length,
            caption: "经过分拆提炼，已整理完毕的文书。",
          },
          {
            label: "仅留名录",
            value: files.filter((file) => !file.supported_for_ingestion).length,
            caption: "暂时封存库中，待日后启封。",
          },
        ].map((item) => (
          <Card key={item.label} className="border-[#c09a53]/30 bg-[#1a110b]/90 shadow-lg rounded-sm relative">
            <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
            <CardContent className="p-5 relative z-10">
              <div className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#c09a53]">{item.label}</div>
              <div className="mt-3 text-3xl font-bold text-[#e4cfa1]">{item.value}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#a38a6a]">{item.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[#c09a53]/30 bg-[#1a110b]/90 shadow-lg rounded-sm relative">
        <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
        <CardContent className="space-y-4 p-5 relative z-10">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-sm px-4 py-2 text-sm font-bold tracking-widest transition-colors border ${
                activeCategory === "all" ? "bg-[#c09a53]/20 text-[#e4cfa1] border-[#c09a53]" : "bg-[#2a1d15] text-[#a38a6a] border-[#c09a53]/30 hover:bg-[#c09a53]/10"
              }`}
            >
              全部案牍
            </button>
            {summaries.map((summary) => (
              <button
                key={summary.key}
                type="button"
                onClick={() => setActiveCategory(summary.key)}
                className={`rounded-sm px-4 py-2 text-sm font-bold tracking-widest transition-colors border ${
                  activeCategory === summary.key ? "bg-[#c09a53]/20 text-[#e4cfa1] border-[#c09a53]" : "bg-[#2a1d15] text-[#a38a6a] border-[#c09a53]/30 hover:bg-[#c09a53]/10"
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
                <div key={summary.key} className="rounded-sm border border-[#c09a53]/30 bg-[#2a1d15]/50 p-4 relative">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-sm border p-2 ${getCategoryTint(summary.key)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold text-[#e4cfa1] tracking-wider">{summary.label}</div>
                      <div className="mt-1 text-[13px] leading-5 text-[#a38a6a]">
                        {summary.count} 卷 · {summary.searchable} 卷可阅 · {summary.indexed} 卷在库
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
          <Loader2 className="h-8 w-8 animate-spin text-[#c09a53]" />
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-sm border border-dashed border-[#c09a53]/50 bg-[#1a110b]/80 p-12 text-center relative">
          <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
          <div className="flex flex-col items-center gap-2 relative z-10">
            <p className="text-xl font-bold tracking-widest text-[#e4cfa1]">案牍库空虚</p>
            <p className="text-sm tracking-wide text-[#a38a6a]">请移交您的第一份文书或舆图，交由翰林院编修入库。</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedFiles.map((group) => {
            const GroupIcon = getCategoryIcon(group.key)
            return (
              <section key={group.key} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-sm border p-2 ${getCategoryTint(group.key)}`}>
                    <GroupIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-widest text-[#e4cfa1]">{group.label}</h3>
                    <p className="text-[13px] text-[#a38a6a] mt-1">此门类共 {group.items.length} 卷</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {group.items.map((file) => {
                    const info = getStatusInfo(file.status)
                    const Icon = getCategoryIcon(file.file_category)
                    return (
                      <Card key={file.id} className="overflow-hidden border-[#c09a53]/30 bg-[#1a110b]/80 shadow-lg rounded-sm relative">
                        <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
                        <CardContent className="p-0 relative z-10">
                          <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex min-w-0 flex-1 gap-4">
                              <div className={`rounded-sm border p-3 ${getCategoryTint(file.file_category)}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-lg font-bold text-[#e4cfa1]">{file.original_filename}</p>
                                  <span className={`rounded-sm border px-2.5 py-1 text-[11px] font-bold ${getCategoryTint(file.file_category)}`}>
                                    {(file.file_type || "未知").toUpperCase()}
                                  </span>
                                  <span className="rounded-sm bg-[#2a1d15] border border-[#c09a53]/30 px-2.5 py-1 text-[11px] font-bold text-[#c09a53]">
                                    {file.status === "indexed" ? "可供查阅" : info.label}
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-[#a38a6a]">
                                  <span>大小：{formatFileSize(file.file_size)}</span>
                                  <span>册数：{file.page_count} 册</span>
                                  <span>折数：{file.chunk_count} 折</span>
                                  <span>史官：{file.parser_name || "无"}</span>
                                </div>

                                <div className="mt-4 w-full max-w-sm overflow-hidden rounded-sm bg-[#0a0705] border border-[#c09a53]/20">
                                  <div className={`h-1.5 transition-all duration-500 ${info.color}`} style={{ width: `${info.percent}%` }} />
                                </div>

                                <div className="mt-5 grid gap-3 md:grid-cols-3">
                                  <div className="rounded-sm border border-[#c09a53]/30 bg-[#2a1d15]/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c09a53]">查阅规制</div>
                                    <div className="mt-2 text-[13px] font-medium text-[#e4cfa1]">{file.indexing_profile || "仅留名录"}</div>
                                  </div>
                                  <div className="rounded-sm border border-[#c09a53]/30 bg-[#2a1d15]/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c09a53]">拆解之法</div>
                                    <div className="mt-2 text-[13px] leading-6 text-[#e4cfa1]">{file.embedding_strategy}</div>
                                  </div>
                                  <div className="rounded-sm border border-[#c09a53]/30 bg-[#2a1d15]/50 p-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c09a53]">检视之法</div>
                                    <div className="mt-2 text-[13px] leading-6 text-[#e4cfa1]">{file.retrieval_strategy}</div>
                                  </div>
                                </div>

                                {file.error_message && (
                                  <div className="mt-4 rounded-sm border border-[#8b2323]/50 bg-[#8b2323]/20 px-4 py-3 text-[13px] text-[#f4ebd0] tracking-wide">
                                    有司报：{file.error_message}
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
        title="准奏焚毁此卷宗？"
        description={
          confirmDeleteFile
            ? `此举将彻底抹除《${confirmDeleteFile.original_filename}》及其所有卷帙、案牍引用与关联经纬，且永无反悔之机。`
            : ""
        }
        confirmLabel="即刻焚毁"
        cancelLabel="留中不发"
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
