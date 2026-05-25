"use client"

import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import {
  Background,
  Controls,
  type Edge as FlowEdge,
  Handle,
  MarkerType,
  MiniMap,
  type Node as FlowNode,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type XYPosition,
} from "@xyflow/react"
import {
  BookOpen,
  Bot,
  Check,
  FileText,
  History,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Network,
  Pencil,
  ScrollText,
  Search,
  Send,
  Sparkles,
  Star,
  Table2,
  Tags,
  Trash2,
  User,
  X,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

type Citation = {
  id?: string
  file_id: string
  file_name?: string
  chunk_id?: string | null
  page_number?: number | string | null
  aspect?: string
  content: string
  quote?: string
  score?: number
  context_before?: string
  highlight_text?: string
  context_after?: string
  preview_excerpt?: string
}

type ChatMessage = {
  id?: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  sourceQuery?: string
  coverageReport?: Record<string, string>
}

type AgentRun = {
  id: string
  query: string
  title: string
  result: string
  created_at: string
  favorite?: boolean
}

type AgentRunDetail = {
  id: string
  query: string
  title: string
  result: string
  created_at: string
  favorite?: boolean
  coverage_report?: Record<string, string>
  messages: Array<{
    id: string
    role: "user" | "assistant"
    content: string
    created_at: string
    citations: Citation[]
  }>
}

type AgentTrace = {
  name: string
  status: string
  thought?: string
}

type AgentFileOption = {
  id: string
  original_filename: string
  category_label?: string | null
}

type StructuredFact = {
  label: string
  value: string
  sourceRefs: string[]
}

type AnswerGraphNodeData = {
  label: string
  sublabel?: string
  detail?: string
  kind: "core" | "fact" | "detail" | "source"
  citationIndex?: number
  onCitationClick?: (citation: Citation) => void
  citation?: Citation
}

type GraphNode = {
  id: string
  kind: "core" | "fact" | "detail" | "source"
  label: string
  sublabel?: string
  x: number
  y: number
  width: number
  height: number
}

type GraphEdge = {
  from: string
  to: string
  label: string
  strength?: "primary" | "secondary"
}

type GraphPoint = {
  x: number
  y: number
}

type HistoryGroup = {
  label: string
  items: AgentRun[]
}

type TraceStage = {
  key: string
  label: string
  parallel?: boolean
  items: AgentTrace[]
}

type ConfirmState =
  | {
      kind: "delete-run"
      runId: string
      title: string
    }
  | {
      kind: "clear-runs"
    }
  | null

const SOURCE_PATTERN = /\[Source\s*\d+\]/gi
const SENTENCE_SPLIT_PATTERN = /(?<=[。！？!?；;])/u
const TOKEN_PATTERN = /[\u4e00-\u9fa5]{2,8}|[A-Za-z][A-Za-z0-9_-]{2,18}/g

function shortFileName(name?: string, fallback?: string) {
  if (name && name.length <= 36) return name
  if (name) return `${name.slice(0, 18)}...${name.slice(-10)}`
  return fallback ? `${fallback.slice(0, 8)}...` : "Source"
}

function parseStructuredAnswer(content: string) {
  const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\u2022/g, "-")
  const lines = normalizedContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const facts: StructuredFact[] = []
  const introLines: string[] = []
  const outroLines: string[] = []
  const auditLines: string[] = []
  let seenFact = false

  const toFact = (label: string, rawValue: string) => {
    const sourceRefs = rawValue.match(SOURCE_PATTERN) || []
    const value = rawValue.replace(SOURCE_PATTERN, "").trim()
    if (!value) return null
    return { label: label.trim(), value, sourceRefs } satisfies StructuredFact
  }

  const isLooseHeading = (line: string) =>
    line.length >= 2 &&
    line.length <= 14 &&
    !/[\uFF1A:。！？!?]/.test(line) &&
    !/\[Source\s*\d+\]/i.test(line) &&
    !/^\d+\./.test(line) &&
    !/^[-*]/.test(line)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const richLabelMatch = line.match(/^[-*]\s+\*\*(.+?)\*\*[\uFF1A:]\s*(.+)$/)
    if (richLabelMatch) {
      seenFact = true
      const fact = toFact(richLabelMatch[1], richLabelMatch[2])
      if (fact) facts.push(fact)
      continue
    }

    const plainBulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (plainBulletMatch) {
      seenFact = true
      const bulletContent = plainBulletMatch[1]
      const colonMatch = bulletContent.match(/^(.{2,24}?)[\uFF1A:]\s*(.+)$/)
      const fact = colonMatch ? toFact(colonMatch[1], colonMatch[2]) : toFact(`Point ${facts.length + 1}`, bulletContent)
      if (fact) facts.push(fact)
      continue
    }

    const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (numberedMatch) {
      seenFact = true
      const numberedContent = numberedMatch[1]
      const colonMatch = numberedContent.match(/^(.{2,24}?)[\uFF1A:]\s*(.+)$/)
      const fact = colonMatch ? toFact(colonMatch[1], colonMatch[2]) : toFact(`Step ${facts.length + 1}`, numberedContent)
      if (fact) facts.push(fact)
      continue
    }

    const inlineKeyValueMatch = line.match(/^\*\*(.+?)\*\*[\uFF1A:]\s*(.+)$/)
    if (inlineKeyValueMatch) {
      seenFact = true
      const fact = toFact(inlineKeyValueMatch[1], inlineKeyValueMatch[2])
      if (fact) facts.push(fact)
      continue
    }

    if (isLooseHeading(line)) {
      const paragraphLines: string[] = []
      let cursor = index + 1
      while (cursor < lines.length && !isLooseHeading(lines[cursor])) {
        paragraphLines.push(lines[cursor])
        cursor += 1
      }
      const paragraph = paragraphLines.join(" ").trim()
      if (paragraph) {
        seenFact = true
        const fact = toFact(line, paragraph)
        if (fact) facts.push(fact)
        index = cursor - 1
        continue
      }
    }

    if (!seenFact) {
      introLines.push(line)
    } else {
      outroLines.push(line)
    }
  }

  if (facts.length < 2) {
    const sentencePool = normalizedContent
      .replace(SOURCE_PATTERN, "")
      .split(SENTENCE_SPLIT_PATTERN)
      .map((item) => item.trim())
      .filter((item) => item.length >= 8)
      .slice(0, 6)

    if (sentencePool.length >= 2) {
      return {
        intro: "",
        facts: sentencePool.map((sentence, index) => ({
          label: `Insight ${index + 1}`,
          value: sentence,
          sourceRefs: [],
        })),
        outro: "",
        canRenderStructured: true,
      }
    }
  }

  return {
    intro: introLines.join(" "),
    facts,
    outro: outroLines.join(" "),
    canRenderStructured: facts.length >= 2,
  }
}

function renderInlineCitations(
  text: string,
  citations: Citation[],
  onCitationClick: (citation: Citation) => void,
  chipClassName: string
) {
  if (!text) return null

  const parts = text.split(/(\[Source\s*\d+\])/gi)
  return parts.map((part, idx) => {
    const match = part.match(/\[Source\s*(\d+)\]/i)
    if (!match) return <span key={idx}>{part}</span>

    const sourceIndex = parseInt(match[1], 10) - 1
    const citation = citations[sourceIndex]
    if (!citation) return <span key={idx}>{part}</span>

    return (
      <button key={idx} type="button" onClick={() => onCitationClick(citation)} className={chipClassName}>
        {part}
      </button>
    )
  })
}

function extractAnswerTags(content: string, sourceQuery?: string, facts: StructuredFact[] = []) {
  const pool = `${sourceQuery || ""} ${content} ${facts.map((fact) => `${fact.label} ${fact.value}`).join(" ")}`
  const seen = new Set<string>()
  const tags: string[] = []

  const pushTag = (value: string) => {
    const normalized = value.trim()
    if (!normalized || normalized.length < 2 || normalized.length > 18) return
    if (/^source$/i.test(normalized)) return
    if (seen.has(normalized)) return
    seen.add(normalized)
    tags.push(normalized)
  }

  facts.slice(0, 4).forEach((fact) => pushTag(fact.label))
  ;(pool.match(TOKEN_PATTERN) || []).forEach(pushTag)
  return tags.slice(0, 8)
}

// Legacy SVG graph helpers are intentionally kept as a fallback reference while React Flow is now the primary graph renderer.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildGraphModel(graphTitle: string, graphFacts: StructuredFact[]) {
  const spacing = 132
  const factWidth = 108
  const detailWidth = 120
  const sourceWidth = 78
  const totalWidth = Math.max(graphFacts.length - 1, 0) * spacing
  const width = Math.max(440, totalWidth + 300)
  const centerX = width / 2
  const startX = centerX - totalWidth / 2

  const nodes: GraphNode[] = [
    {
      id: "core",
      kind: "core",
      label: graphTitle.slice(0, 28),
      sublabel: "Question",
      x: centerX,
      y: 68,
      width: 148,
      height: 54,
    },
  ]
  const edges: GraphEdge[] = []

  graphFacts.forEach((fact, index) => {
    const factX = startX + index * spacing
    const factId = `fact-${index}`
    const detailId = `detail-${index}`
    const detailSnippet =
      fact.value
        .replace(/\s+/g, " ")
        .split(/[，,。；;：:]/)
        .map((part) => part.trim())
        .find(Boolean) || fact.value

    nodes.push({
      id: factId,
      kind: "fact",
      label: fact.label.slice(0, 16),
      sublabel: "Dimension",
      x: factX,
      y: 182,
      width: factWidth,
      height: 50,
    })
    edges.push({ from: "core", to: factId, label: "explains", strength: "primary" })

    nodes.push({
      id: detailId,
      kind: "detail",
      label: detailSnippet.slice(0, 18),
      sublabel: fact.sourceRefs.length ? "Conclusion + evidence" : "Conclusion",
      x: factX,
      y: 300,
      width: detailWidth,
      height: 52,
    })
    edges.push({ from: factId, to: detailId, label: fact.sourceRefs.length ? "supports" : "details", strength: "secondary" })

    if (fact.sourceRefs.length > 0) {
      const sourceId = `source-${index}`
      nodes.push({
        id: sourceId,
        kind: "source",
        label: `${fact.sourceRefs.length} source${fact.sourceRefs.length > 1 ? "s" : ""}`,
        sublabel: fact.sourceRefs.join(" ").slice(0, 22),
        x: factX + 48,
        y: 124,
        width: sourceWidth,
        height: 34,
      })
      edges.push({ from: sourceId, to: factId, label: "cites", strength: "secondary" })
    }
  })

  return { nodes, edges, width, height: 360, centerX }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildForceOffsets(graphFacts: StructuredFact[]) {
  return graphFacts.reduce<Record<string, GraphPoint>>((acc, _fact, index) => {
    const offsetX = (index % 2 === 0 ? -1 : 1) * (14 + (index % 3) * 8)
    const offsetY = index % 2 === 0 ? -6 - (index % 3) * 8 : 8 + (index % 3) * 6
    acc[`fact-${index}`] = { x: offsetX, y: offsetY }
    acc[`detail-${index}`] = { x: -offsetX * 0.6, y: (index % 2 === 0 ? 10 : -8) + index * 1.5 }
    if (graphFacts[index]?.sourceRefs.length) {
      acc[`source-${index}`] = { x: offsetX * 0.4, y: -10 - (index % 2) * 4 }
    }
    return acc
  }, {})
}

function AnswerGraphFlowNode({ data }: NodeProps<FlowNode<AnswerGraphNodeData>>) {
  const clickable = data.kind === "source" && data.citation && data.onCitationClick
  const palette =
    data.kind === "core"
      ? {
          wrapper: "border-slate-900 bg-slate-900 text-white shadow-[0_24px_64px_rgba(15,23,42,0.28)]",
          label: "text-white",
          sub: "text-slate-300",
          detail: "text-slate-200",
        }
      : data.kind === "fact"
        ? {
            wrapper: "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 text-slate-900 shadow-[0_18px_42px_rgba(245,158,11,0.16)]",
            label: "text-amber-950",
            sub: "text-amber-700",
            detail: "text-slate-600",
          }
        : data.kind === "source"
          ? {
              wrapper: "border-sky-300 bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-900 shadow-[0_18px_42px_rgba(59,130,246,0.14)]",
              label: "text-sky-900",
              sub: "text-sky-700",
              detail: "text-slate-600",
            }
          : {
              wrapper: "border-slate-300 bg-white text-slate-900 shadow-[0_18px_42px_rgba(15,23,42,0.08)]",
              label: "text-slate-900",
              sub: "text-slate-500",
              detail: "text-slate-600",
            }

  return (
    <>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-slate-300/70" />
      <div
        className={`min-w-[170px] max-w-[220px] rounded-[22px] border px-4 py-3 transition-all duration-200 ${palette.wrapper} ${clickable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(59,130,246,0.18)]" : ""}`}
        onClick={clickable ? () => data.onCitationClick?.(data.citation as Citation) : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  data.onCitationClick?.(data.citation as Citation)
                }
              }
            : undefined
        }
      >
        {data.sublabel && <div className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${palette.sub}`}>{data.sublabel}</div>}
        <div className={`mt-1 text-sm font-semibold leading-5 ${palette.label}`}>{data.label}</div>
        {data.detail && <div className={`mt-2 text-xs leading-5 ${palette.detail}`}>{data.detail}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-slate-300/70" />
    </>
  )
}

const answerGraphNodeTypes = {
  answerNode: AnswerGraphFlowNode,
}

function buildAnswerFlowGraph(
  graphTitle: string,
  graphFacts: StructuredFact[],
  citations: Citation[],
  onCitationClick: (citation: Citation) => void
) {
  const nodes: FlowNode<AnswerGraphNodeData>[] = []
  const edges: FlowEdge[] = []
  const graphWidth = Math.max(980, 860 + graphFacts.length * 90)
  const rootPosition: XYPosition = { x: graphWidth / 2 - 90, y: 24 }
  const rootId = "core"

  nodes.push({
    id: rootId,
    type: "answerNode",
    position: rootPosition,
    draggable: false,
    data: {
      kind: "core",
      label: graphTitle.slice(0, 42),
      sublabel: "Question",
      detail: "The root question that the answer structure expands from.",
    },
  })

  const factSpacing = Math.max(170, Math.floor((graphWidth - 180) / Math.max(graphFacts.length, 2)))
  const baseX = 90
  const baseY = rootPosition.y + 168

  graphFacts.forEach((fact, index) => {
    const factX = baseX + index * factSpacing
    const factY = baseY + (index % 2 === 0 ? 0 : 24)
    const factId = `fact-${index}`
    const detailId = `detail-${index}`
    const detailSnippet =
      fact.value
        .replace(/\s+/g, " ")
        .split(/[锛?銆傦紱;:]/)
        .map((part) => part.trim())
        .find(Boolean) || fact.value

    nodes.push({
      id: factId,
      type: "answerNode",
      position: { x: factX, y: factY },
      data: {
        kind: "fact",
        label: fact.label.slice(0, 24),
        sublabel: "Dimension",
        detail: `${fact.sourceRefs.length ? `${fact.sourceRefs.length} cited source${fact.sourceRefs.length > 1 ? "s" : ""}` : "No direct citation"} in this branch.`,
      },
    })
    edges.push({
      id: `edge-core-${factId}`,
      source: rootId,
      target: factId,
      label: "explains",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#0f172a" },
      style: { stroke: "#334155", strokeWidth: 2.2 },
      labelStyle: { fill: "#64748b", fontSize: 10, fontWeight: 700 },
    })

    nodes.push({
      id: detailId,
      type: "answerNode",
      position: { x: factX + (index % 2 === 0 ? -18 : 18), y: factY + 156 },
      data: {
        kind: "detail",
        label: detailSnippet.slice(0, 36),
        sublabel: fact.sourceRefs.length ? "Claim + evidence" : "Claim",
        detail: fact.value.slice(0, 110),
      },
    })
    edges.push({
      id: `edge-${factId}-${detailId}`,
      source: factId,
      target: detailId,
      label: fact.sourceRefs.length ? "supports" : "details",
      animated: fact.sourceRefs.length > 0,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#f59e0b" },
      style: { stroke: "#f59e0b", strokeWidth: 1.8, strokeDasharray: fact.sourceRefs.length ? undefined : "5 6" },
      labelStyle: { fill: "#a16207", fontSize: 10, fontWeight: 700 },
    })

    fact.sourceRefs.forEach((ref, refIndex) => {
      const refMatch = ref.match(/\[Source\s*(\d+)\]/i)
      const citationIndex = refMatch ? parseInt(refMatch[1], 10) - 1 : -1
      const citation = citationIndex >= 0 ? citations[citationIndex] : undefined
      if (!citation) return

      const sourceId = `source-${index}-${refIndex}`
      nodes.push({
        id: sourceId,
        type: "answerNode",
        position: { x: factX + 144, y: factY - 18 + refIndex * 68 },
        data: {
          kind: "source",
          label: shortFileName(citation.file_name, `Source ${citationIndex + 1}`),
          sublabel: `Source ${citationIndex + 1}`,
          detail: `Page ${citation.page_number || "N/A"} · click to inspect`,
          citation,
          citationIndex,
          onCitationClick,
        },
      })
      edges.push({
        id: `edge-${sourceId}-${factId}`,
        source: sourceId,
        target: factId,
        label: "cites",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#0ea5e9" },
        style: { stroke: "#38bdf8", strokeWidth: 1.7, strokeDasharray: "4 6" },
        labelStyle: { fill: "#0369a1", fontSize: 10, fontWeight: 700 },
      })
    })
  })

  return { nodes, edges }
}

function stageLabelToKey(name: string) {
  if (name === "Planner") return "planning"
  if (name === "Vector Researcher" || name === "Keyword Researcher" || name === "Summary Researcher") return "parallel-retrieval"
  if (name === "Evidence Fusion") return "fusion"
  if (name === "Graph Researcher") return "graph"
  if (name === "Critic") return "critic"
  if (name === "Writer") return "writer"
  return "other"
}

function buildTraceStages(trace: AgentTrace[]) {
  const stageOrder = [
    { key: "planning", label: "Planning" },
    { key: "parallel-retrieval", label: "Parallel Retrieval", parallel: true },
    { key: "fusion", label: "Evidence Fusion" },
    { key: "graph", label: "Graph Expansion" },
    { key: "critic", label: "Critique" },
    { key: "writer", label: "Synthesis" },
    { key: "other", label: "Other" },
  ] satisfies Array<{ key: string; label: string; parallel?: boolean }>

  const grouped = new Map<string, AgentTrace[]>()
  trace.forEach((item) => {
    const key = stageLabelToKey(item.name)
    const bucket = grouped.get(key) || []
    bucket.push(item)
    grouped.set(key, bucket)
  })

  return stageOrder
    .filter((stage) => grouped.has(stage.key))
    .map((stage) => ({
      key: stage.key,
      label: stage.label,
      parallel: stage.parallel,
      items: grouped.get(stage.key) || [],
    })) satisfies TraceStage[]
}

function getTraceStatusTone(status: string) {
  if (status === "completed") {
    return {
      dot: "bg-emerald-500",
      pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
      card: "border-emerald-200/80 bg-white",
    }
  }
  if (status === "running") {
    return {
      dot: "animate-pulse bg-amber-500",
      pill: "border-amber-200 bg-amber-50 text-amber-700",
      card: "border-amber-200/80 bg-amber-50/40",
    }
  }
  return {
    dot: "bg-rose-500",
    pill: "border-rose-200 bg-rose-50 text-rose-700",
    card: "border-rose-200/80 bg-rose-50/40",
  }
}

function getHistoryGroupLabel(createdAt: string) {
  const now = new Date()
  const date = new Date(createdAt)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 6)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  if (date >= startOfToday) return "Today"
  if (date >= startOfYesterday) return "Yesterday"
  if (date >= startOfWeek) return "This Week"
  if (date >= startOfMonth) return "This Month"
  return date.getFullYear() === now.getFullYear() ? "Earlier This Year" : "Archive"
}

function groupRunsByTime(runs: AgentRun[]) {
  const groups = new Map<string, AgentRun[]>()
  runs.forEach((run) => {
    const label = getHistoryGroupLabel(run.created_at)
    const existing = groups.get(label) || []
    existing.push(run)
    groups.set(label, existing)
  })

  const order = ["Today", "Yesterday", "This Week", "This Month", "Earlier This Year", "Archive"]
  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label) || [] })) satisfies HistoryGroup[]
}

function ReferencePreview({ citation }: { citation: Citation }) {
  const fileName = citation.file_name || shortFileName(undefined, citation.file_id)
  const score = typeof citation.score === "number" ? `${Math.round(citation.score * 100)}%` : null
  const highlightText = citation.highlight_text || citation.content || citation.quote || ""

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Reference</div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">{fileName}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="rounded-full bg-white px-2.5 py-1">Page {citation.page_number || "N/A"}</span>
            {score && <span className="rounded-full bg-white px-2.5 py-1">Score {score}</span>}
            {citation.chunk_id && <span className="rounded-full bg-white px-2.5 py-1">Chunk linked</span>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-yellow-50 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Focused Quote</div>
        <div className="text-sm leading-7 text-slate-700">{citation.quote || citation.content}</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Context Window</div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          {citation.context_before}
          <mark className="rounded bg-yellow-200 px-1 py-0.5 text-slate-900">{highlightText}</mark>
          {citation.context_after}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          The highlighted span is the evidence fragment used by the answer, with nearby page or chunk context on both sides.
        </p>
      </div>

      {citation.preview_excerpt && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Compact Preview</div>
          <div className="text-sm leading-6 text-slate-600">{citation.preview_excerpt}</div>
        </div>
      )}
    </div>
  )
}

function AssistantStructuredView({
  content,
  citations,
  sourceQuery,
  coverageReport,
  onCitationClick,
}: {
  content: string
  citations: Citation[]
  sourceQuery?: string
  coverageReport?: Record<string, string>
  onCitationClick: (citation: Citation) => void
}) {
  const structured = useMemo(() => parseStructuredAnswer(content), [content])
  const [viewMode, setViewMode] = useState<"cards" | "table" | "graph" | "raw">("cards")
  const graphTitle = sourceQuery?.trim() || structured.intro || "Answer"
  const graphFacts = structured.facts.slice(0, 8)
  const tags = useMemo(() => extractAnswerTags(content, sourceQuery, structured.facts), [content, sourceQuery, structured.facts])
  const graphFlow = useMemo(
    () => buildAnswerFlowGraph(graphTitle, graphFacts, citations, onCitationClick),
    [graphTitle, graphFacts, citations, onCitationClick]
  )
  const [graphNodes, setGraphNodes, onGraphNodesChange] = useNodesState(graphFlow.nodes)
  const [graphEdges, setGraphEdges, onGraphEdgesChange] = useEdgesState(graphFlow.edges)
  const graphSignature = useMemo(
    () => `${graphTitle}::${graphFacts.map((fact) => `${fact.label}:${fact.value}:${fact.sourceRefs.join(",")}`).join("|")}`,
    [graphTitle, graphFacts]
  )
  const lastGraphSignatureRef = useRef<string>("")

  const graphStats = useMemo(
    () => ({
      facts: graphFacts.length,
      sourcedFacts: graphFacts.filter((fact) => fact.sourceRefs.length > 0).length,
      sourceRefs: graphFacts.reduce((sum, fact) => sum + fact.sourceRefs.length, 0),
    }),
    [graphFacts]
  )

  useEffect(() => {
    if (lastGraphSignatureRef.current === graphSignature) return
    lastGraphSignatureRef.current = graphSignature
    setGraphNodes(graphFlow.nodes)
    setGraphEdges(graphFlow.edges)
  }, [graphEdges, graphFlow.edges, graphFlow.nodes, graphSignature, setGraphEdges, setGraphNodes])

  if (!structured.canRenderStructured) {
    return (
      <div className="space-y-3">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {renderInlineCitations(
            content,
            citations,
            onCitationClick,
            "rounded bg-blue-500/10 px-1.5 py-0.5 font-medium text-blue-700 whitespace-nowrap hover:text-blue-800"
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-slate-900">
      {tags.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Tags className="h-3.5 w-3.5" />
            Auto Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { key: "cards", label: "Cards", icon: Sparkles },
          { key: "table", label: "Table", icon: Table2 },
          { key: "graph", label: "Graph", icon: Network },
          { key: "raw", label: "Raw", icon: ScrollText },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setViewMode(item.key as "cards" | "table" | "graph" | "raw")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === item.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {structured.intro && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            <Sparkles className="h-3.5 w-3.5" />
            Answer Snapshot
          </div>
          <p className="text-sm leading-6 text-slate-700">
            {renderInlineCitations(
              structured.intro,
              citations,
              onCitationClick,
              "rounded bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-700 whitespace-nowrap hover:text-amber-800"
            )}
          </p>
        </div>
      )}

      {viewMode === "cards" && (
        <div className="grid gap-3 md:grid-cols-2">
          {structured.facts.map((fact) => (
            <div key={fact.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Network className="h-3.5 w-3.5" />
                {fact.label}
              </div>
              <div className="text-sm leading-6 text-slate-700">
                {renderInlineCitations(
                  `${fact.value}${fact.sourceRefs.length ? ` ${fact.sourceRefs.join(" ")}` : ""}`,
                  citations,
                  onCitationClick,
                  "rounded bg-sky-500/10 px-1.5 py-0.5 font-medium text-sky-700 whitespace-nowrap hover:text-sky-800"
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "table" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <Table2 className="h-4 w-4" />
            Structured Table
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Dimension</th>
                  <th className="px-4 py-3 font-semibold">Content</th>
                  <th className="px-4 py-3 font-semibold">Citations</th>
                </tr>
              </thead>
              <tbody>
                {structured.facts.map((fact, idx) => (
                  <tr key={fact.label} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="px-4 py-3 align-top font-medium text-slate-800">{fact.label}</td>
                    <td className="px-4 py-3 align-top text-slate-700">{fact.value}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        {fact.sourceRefs.length > 0 ? (
                          fact.sourceRefs.map((ref, refIdx) => {
                            const refMatch = ref.match(/\[Source\s*(\d+)\]/i)
                            const citation = refMatch ? citations[parseInt(refMatch[1], 10) - 1] : undefined
                            if (!citation) {
                              return (
                                <span key={`${fact.label}-${refIdx}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                  {ref}
                                </span>
                              )
                            }

                            return (
                              <button
                                key={`${fact.label}-${refIdx}`}
                                type="button"
                                onClick={() => onCitationClick(citation)}
                                className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-200"
                              >
                                {shortFileName(citation.file_name, ref)}
                              </button>
                            )
                          })
                        ) : (
                          <span className="text-xs text-slate-400">No direct citation</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === "graph" && (
        <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Knowledge Graph</div>
              <div className="mt-1 text-sm text-slate-700">React Flow view of the answer structure. Drag nodes, pan freely, and click source nodes to open evidence.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{graphStats.facts} dimensions</span>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-700">{graphStats.sourcedFacts} sourced</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">{graphStats.sourceRefs} citations</span>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
            <ReactFlowProvider>
              <div className="h-[430px] w-full">
                <ReactFlow
                  nodes={graphNodes}
                  edges={graphEdges}
                  nodeTypes={answerGraphNodeTypes}
                  nodesDraggable
                  elementsSelectable
                  onNodesChange={onGraphNodesChange}
                  onEdgesChange={onGraphEdgesChange}
                  fitView
                  minZoom={0.45}
                  maxZoom={1.8}
                  defaultEdgeOptions={{ animated: false }}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={22} size={1} color="#e2e8f0" />
                  <MiniMap
                    pannable
                    zoomable
                    nodeColor={(node) => {
                      const kind = (node.data as AnswerGraphNodeData | undefined)?.kind
                      if (kind === "core") return "#0f172a"
                      if (kind === "fact") return "#f59e0b"
                      if (kind === "source") return "#0ea5e9"
                      return "#94a3b8"
                    }}
                    maskColor="rgba(248,250,252,0.68)"
                    className="!border !border-slate-200 !bg-white"
                  />
                  <Controls className="!shadow-none" />
                </ReactFlow>
              </div>
            </ReactFlowProvider>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Interpretation</div>
              <p className="text-xs leading-5 text-slate-600">The dark node is the query, amber nodes are answer dimensions, pale nodes are claims, and blue nodes are evidence anchors you can click into.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Layout</div>
              <p className="text-xs leading-5 text-slate-600">The map uses a curved radial spread so different branches separate naturally instead of collapsing into one vertical stack.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Interaction</div>
              <p className="text-xs leading-5 text-slate-600">Pan, zoom, drag nodes, use the minimap for orientation, and click source nodes to jump straight into the reference panel.</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === "raw" && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {renderInlineCitations(
              content,
              citations,
              onCitationClick,
              "rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-700 whitespace-nowrap hover:text-slate-900"
            )}
          </div>
        </div>
      )}

      {structured.outro && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          {renderInlineCitations(
            structured.outro,
            citations,
            onCitationClick,
            "rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-700 whitespace-nowrap hover:text-slate-900"
          )}
        </div>
      )}
    </div>
  )
}

export default function AgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [trace, setTrace] = useState<AgentTrace[]>([])
  const [files, setFiles] = useState<AgentFileOption[]>([])
  const [selectedFileId, setSelectedFileId] = useState("all")
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const [activeTab, setActiveTab] = useState("trace")
  const [busyRunId, setBusyRunId] = useState<string | null>(null)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [historySearch, setHistorySearch] = useState("")
  const [editingRunId, setEditingRunId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const { toast } = useToast()
  const deferredHistorySearch = useDeferredValue(historySearch)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const fetchRuns = () => {
    api.agent
      .listRuns()
      .then((data) => {
        startTransition(() => {
          setRuns(data)
        })
      })
      .catch(console.error)
  }

  const groupedFileOptions = useMemo(() => {
    const groups = new Map<string, AgentFileOption[]>()
    files.forEach((file) => {
      const label = file.category_label || "Documents"
      const bucket = groups.get(label) || []
      bucket.push(file)
      groups.set(label, bucket)
    })
    return Array.from(groups.entries())
  }, [files])

  const filteredRuns = useMemo(() => {
    const keyword = deferredHistorySearch.trim().toLowerCase()
    if (!keyword) return runs
    return runs.filter((run) => [run.title, run.query, run.result].some((value) => value?.toLowerCase().includes(keyword)))
  }, [runs, deferredHistorySearch])

  const favoriteRuns = useMemo(() => filteredRuns.filter((run) => run.favorite), [filteredRuns])
  const nonFavoriteRuns = useMemo(() => filteredRuns.filter((run) => !run.favorite), [filteredRuns])
  const timeGroups = useMemo(() => groupRunsByTime(nonFavoriteRuns), [nonFavoriteRuns])
  const traceStages = useMemo(() => buildTraceStages(trace), [trace])

  const handleNewChat = () => {
    setCurrentRunId(null)
    setMessages([])
    setTrace([])
    setSelectedCitation(null)
    setActiveTab("trace")
  }

  const handleCitationClick = useCallback((citation: Citation) => {
    setSelectedCitation(citation)
    setActiveTab("reference")
  }, [])

  const loadRunDetail = async (runId: string) => {
    try {
      const detail = (await api.agent.getRun(runId)) as AgentRunDetail
      setCurrentRunId(detail.id)
      setMessages(
        detail.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          citations: message.citations || [],
          sourceQuery: message.role === "assistant" ? detail.query : undefined,
          coverageReport: message.role === "assistant" ? detail.coverage_report : undefined,
        }))
      )
      setTrace([])
      setSelectedCitation(null)
      setActiveTab("trace")
    } catch (err) {
      console.error(err)
      toast({ title: "Load failed", description: "Unable to open this chat history.", variant: "destructive" })
    }
  }

  useEffect(() => {
    api.files.list().then(setFiles).catch(console.error)
    fetchRuns()
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messages, loading])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const currentInput = input
    const userMsg: ChatMessage = { role: "user", content: currentInput }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)
    setTrace([{ name: "Planner", status: "running" }])

    try {
      const data = await api.agent.createRun({
        query: currentInput,
        file_id: selectedFileId !== "all" ? selectedFileId : undefined,
        conversation_messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      })

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          citations: data.citations || [],
          sourceQuery: currentInput,
          coverageReport: data.coverage_report,
        },
      ])
      setCurrentRunId(data.run_id)
      setTrace(data.trace_logs || [])
      window.dispatchEvent(new Event("insightgraph:stats-refresh"))
      toast({ title: "Response ready", description: "The agent finished this turn.", variant: "success" })
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }])
      setTrace([{ name: "Error", status: "failed" }])
      toast({ title: "Request failed", description: "The agent could not finish this turn.", variant: "destructive" })
    } finally {
      setLoading(false)
      fetchRuns()
    }
  }

  const deleteRun = async (runId: string) => {
    const previousRuns = runs
    const nextRuns = previousRuns.filter((run) => run.id !== runId)
    startTransition(() => {
      setRuns(nextRuns)
    })
    setBusyRunId(runId)
    try {
      await api.agent.deleteRun(runId)
      setRuns((prev) => prev.filter((run) => run.id !== runId))
      if (currentRunId === runId) handleNewChat()
      await api.agent.listRuns().then((data) => {
        startTransition(() => {
          setRuns(data)
        })
      })
      window.dispatchEvent(new Event("insightgraph:stats-refresh"))
      toast({ title: "Deleted", description: "History entry removed.", variant: "success" })
    } catch (err) {
      console.error(err)
      startTransition(() => {
        setRuns(previousRuns)
      })
      toast({ title: "Delete failed", description: "Unable to remove this history entry.", variant: "destructive" })
    } finally {
      setBusyRunId(null)
      setConfirmState(null)
    }
  }

  const handleRenameRun = async (runId: string) => {
    const title = editingTitle.trim()
    if (!title) return

    setBusyRunId(runId)
    try {
      const response = await api.agent.renameRun(runId, title)
      const updatedTitle = response.title || title
      setRuns((prev) => prev.map((run) => (run.id === runId ? { ...run, title: updatedTitle } : run)))
      setEditingRunId(null)
      setEditingTitle("")
      toast({ title: "Renamed", description: "Chat title updated.", variant: "success" })
    } catch (err) {
      console.error(err)
      toast({ title: "Rename failed", description: "Unable to rename this chat.", variant: "destructive" })
    } finally {
      setBusyRunId(null)
    }
  }

  const handleToggleFavorite = async (run: AgentRun) => {
    const optimisticFavorite = !run.favorite
    startTransition(() => {
      setRuns((prev) => prev.map((item) => (item.id === run.id ? { ...item, favorite: optimisticFavorite } : item)))
    })
    setBusyRunId(run.id)
    try {
      const response = await api.agent.favoriteRun(run.id, optimisticFavorite)
      setRuns((prev) => prev.map((item) => (item.id === run.id ? { ...item, favorite: response.favorite } : item)))
      toast({
        title: response.favorite ? "Pinned to favorites" : "Removed from favorites",
        description: response.favorite ? "This chat will stay at the top." : "This chat returned to the time groups.",
        variant: "success",
      })
    } catch (err) {
      console.error(err)
      startTransition(() => {
        setRuns((prev) => prev.map((item) => (item.id === run.id ? { ...item, favorite: !!run.favorite } : item)))
      })
      toast({ title: "Update failed", description: "Unable to update favorite state.", variant: "destructive" })
    } finally {
      setBusyRunId(null)
    }
  }

  const clearRuns = async () => {
    const previousRuns = runs
    startTransition(() => {
      setRuns([])
    })
    setBusyRunId("all")
    try {
      await api.agent.clearRuns()
      setRuns([])
      handleNewChat()
      window.dispatchEvent(new Event("insightgraph:stats-refresh"))
      toast({ title: "Cleared", description: "All chat history has been removed.", variant: "success" })
    } catch (err) {
      console.error(err)
      startTransition(() => {
        setRuns(previousRuns)
      })
      toast({ title: "Clear failed", description: "Unable to clear history.", variant: "destructive" })
    } finally {
      setBusyRunId(null)
      setConfirmState(null)
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-0 gap-6">
      <div className={`min-h-0 shrink-0 overflow-hidden rounded-lg border bg-card transition-all duration-300 ${isHistoryOpen ? "w-80 opacity-100" : "w-0 border-0 opacity-0"}`}>
        <div className="flex h-full flex-col">
          <div className="border-b bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Chat History</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">Grouped by time, with favorites pinned to the top.</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setConfirmState({ kind: "clear-runs" })}
                disabled={!runs.length || busyRunId === "all"}
              >
                {busyRunId === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Search chat history..."
                className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 p-2">
            {favoriteRuns.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Favorites</div>
                {favoriteRuns.map((run) => (
                  <HistoryRunCard
                    key={run.id}
                    run={run}
                    currentRunId={currentRunId}
                    busyRunId={busyRunId}
                    editingRunId={editingRunId}
                    editingTitle={editingTitle}
                    setEditingTitle={setEditingTitle}
                    setEditingRunId={setEditingRunId}
                    onLoad={loadRunDetail}
                    onDelete={(runId, title) => setConfirmState({ kind: "delete-run", runId, title })}
                    onRename={handleRenameRun}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}

            {timeGroups.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{group.label}</div>
                {group.items.map((run) => (
                  <HistoryRunCard
                    key={run.id}
                    run={run}
                    currentRunId={currentRunId}
                    busyRunId={busyRunId}
                    editingRunId={editingRunId}
                    editingTitle={editingTitle}
                    setEditingTitle={setEditingTitle}
                    setEditingRunId={setEditingRunId}
                    onLoad={loadRunDetail}
                    onDelete={(runId, title) => setConfirmState({ kind: "delete-run", runId, title })}
                    onRename={handleRenameRun}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            ))}

            {filteredRuns.length === 0 && <p className="py-10 text-center text-xs italic text-muted-foreground">No history found</p>}
          </ScrollArea>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsHistoryOpen((prev) => !prev)}>
              <History className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Bot className="h-4 w-4" /> Agent Chat
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Continue old chats, inspect contextual citations, and switch answer views.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedFileId}
              onChange={(event) => setSelectedFileId(event.target.value)}
              className="w-56 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border bg-background px-2 py-1 text-sm"
            >
              <option value="all">All Documents</option>
              {groupedFileOptions.map(([label, items]) => (
                <optgroup key={label} label={label}>
                  {items.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.original_filename}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={handleNewChat} className="flex h-8 gap-1">
              <MessageSquarePlus className="h-4 w-4" /> New
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_45%),linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,1))] p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center opacity-70">
              <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <Bot className="h-12 w-12" />
              </div>
              <p className="text-lg font-medium">InsightGraph Agent</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Ask about people, events, code, or documents. Answers auto-render as cards, tables, graphs, and citation-backed summaries.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div key={msg.id || index} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${msg.role === "user" ? "bg-primary text-primary-foreground" : "border border-slate-200 bg-white text-slate-700"}`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 max-w-[85%] space-y-3">
                    <Card className={`overflow-hidden ${msg.role === "user" ? "border-primary/20 bg-primary text-primary-foreground" : "border-slate-200 bg-white/95 shadow-sm"}`}>
                      <CardContent className="max-h-[min(68vh,56rem)] overflow-y-auto p-4">
                        {msg.role === "assistant" ? (
                          <AssistantStructuredView
                            content={msg.content}
                            citations={msg.citations || []}
                            sourceQuery={msg.sourceQuery}
                            coverageReport={msg.coverageReport}
                            onCitationClick={handleCitationClick}
                          />
                        ) : (
                          <div className="text-sm leading-relaxed">{msg.content}</div>
                        )}
                      </CardContent>
                    </Card>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((citation, citationIndex) => (
                          <button
                            key={`${citation.id || citation.file_id}-${citationIndex}`}
                            type="button"
                            onClick={() => handleCitationClick(citation)}
                            className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] text-secondary-foreground transition-colors hover:bg-secondary/80"
                          >
                            <FileText className="h-2.5 w-2.5" />
                            {shortFileName(citation.file_name, citation.file_id)} · p.{citation.page_number || "?"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="shrink-0 border-t bg-muted/30 p-4">
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              handleSend()
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="h-11 flex-1 rounded-xl border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={currentRunId ? "Continue this conversation..." : "Ask a question..."}
              disabled={loading}
            />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="min-h-0 w-96 shrink-0 overflow-hidden rounded-lg border bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full w-full flex-col">
          <div className="border-b bg-muted/30 p-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trace">Execution Trace</TabsTrigger>
              <TabsTrigger value="reference">Reference</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="trace" className="m-0 flex flex-1 flex-col overflow-hidden p-0 data-[state=active]:flex">
            <ScrollArea className="min-h-0 h-full flex-1 p-4">
              {trace.length === 0 ? (
                <p className="py-10 text-center text-xs italic text-muted-foreground">Wait for agent to start...</p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Execution Timeline</div>
                        <p className="mt-1 text-xs leading-5 text-slate-600">Parallel retrieval steps are grouped together so you can see which agents worked at the same time.</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">{trace.length} steps</span>
                    </div>
                    <div className="space-y-3">
                      {traceStages.map((stage, stageIndex) => (
                        <div key={stage.key} className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                          {stageIndex < traceStages.length - 1 && <div className="absolute bottom-[-18px] left-6 top-[calc(100%-0.2rem)] w-px bg-slate-200" />}
                          <div className="mb-3 flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${stage.items.every((item) => item.status === "completed") ? "bg-emerald-500" : stage.items.some((item) => item.status === "running") ? "animate-pulse bg-amber-500" : "bg-rose-500"}`} />
                            <p className="text-sm font-semibold text-slate-900">{stage.label}</p>
                            {stage.parallel && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">Parallel</span>}
                          </div>
                          <div className="space-y-2">
                            {stage.items.map((item, itemIndex) => {
                              const tone = getTraceStatusTone(item.status)
                              return (
                                <div key={`${item.name}-${itemIndex}`} className={`rounded-2xl border p-3 ${tone.card}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <div className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                                      <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                                    </div>
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.pill}`}>
                                      {item.status}
                                    </span>
                                  </div>
                                  {item.thought && (
                                    <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50/80 p-2.5 text-xs leading-relaxed text-slate-600">
                                      {item.thought}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="reference" className="m-0 flex flex-1 flex-col overflow-hidden p-0 data-[state=active]:flex">
            <ScrollArea className="min-h-0 h-full flex-1 p-4">
              {!selectedCitation ? (
                <div className="flex h-full flex-col items-center justify-center py-20 text-center opacity-50">
                  <BookOpen className="mb-2 h-8 w-8" />
                  <p className="text-sm">Click a citation chip or inline source to open a highlighted context window here.</p>
                </div>
              ) : (
                <ReferencePreview citation={selectedCitation} />
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={confirmState !== null}
        title={
          confirmState?.kind === "clear-runs"
            ? "Clear chat history?"
            : "Delete this conversation?"
        }
        description={
          confirmState?.kind === "clear-runs"
            ? "This will remove every saved chat run from the current workspace. This action cannot be undone."
            : `This will remove "${confirmState?.kind === "delete-run" ? confirmState.title : ""}" and its saved citations. This action cannot be undone.`
        }
        confirmLabel={confirmState?.kind === "clear-runs" ? "Clear history" : "Delete chat"}
        cancelLabel="Keep it"
        variant="destructive"
        loading={busyRunId !== null}
        onCancel={() => {
          if (busyRunId) return
          setConfirmState(null)
        }}
        onConfirm={() => {
          if (!confirmState) return
          if (confirmState.kind === "clear-runs") {
            void clearRuns()
            return
          }
          void deleteRun(confirmState.runId)
        }}
      />
    </div>
  )
}

function HistoryRunCard({
  run,
  currentRunId,
  busyRunId,
  editingRunId,
  editingTitle,
  setEditingTitle,
  setEditingRunId,
  onLoad,
  onDelete,
  onRename,
  onToggleFavorite,
}: {
  run: AgentRun
  currentRunId: string | null
  busyRunId: string | null
  editingRunId: string | null
  editingTitle: string
  setEditingTitle: (value: string) => void
  setEditingRunId: (value: string | null) => void
  onLoad: (runId: string) => void
  onDelete: (runId: string, title: string) => void
  onRename: (runId: string) => void
  onToggleFavorite: (run: AgentRun) => void
}) {
  return (
    <div
      className={`group mb-2 rounded-xl border p-3 transition-colors ${
        currentRunId === run.id ? "border-slate-300 bg-slate-50" : "border-transparent bg-background/70 hover:border-border hover:bg-muted/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => onLoad(run.id)} className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {editingRunId === run.id ? (
              <input
                value={editingTitle}
                onChange={(event) => setEditingTitle(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                className="h-7 w-full rounded border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <span className="truncate text-sm font-medium">{run.title}</span>
            )}
          </div>
          <div className="line-clamp-2 text-xs leading-5 text-muted-foreground">{run.result}</div>
          <div className="mt-2 text-[11px] text-muted-foreground">{new Date(run.created_at).toLocaleString()}</div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-80 hover:opacity-100"
            onClick={() => onToggleFavorite(run)}
            disabled={busyRunId === run.id}
          >
            <Star className={`h-4 w-4 ${run.favorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
          </Button>

          {editingRunId === run.id ? (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRename(run.id)} disabled={busyRunId === run.id}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRunId(null); setEditingTitle("") }}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-70 hover:opacity-100"
                onClick={() => {
                  setEditingRunId(run.id)
                  setEditingTitle(run.title)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-70 hover:opacity-100"
                onClick={() => onDelete(run.id, run.title)}
                disabled={busyRunId === run.id}
              >
                {busyRunId === run.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
