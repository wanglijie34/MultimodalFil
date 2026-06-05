"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useI18n } from "@/lib/i18n"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, BookOpen, ChevronDown, ChevronUp, FileText, Tag } from "lucide-react"
import Link from "next/link"

interface ChapterSummaryData {
  summary: string
  bullets: string[]
  tags: string[]
  keywords: string[]
}

interface Chapter {
  id: string
  title: string
  level: number
  order_index: number
  summary?: ChapterSummaryData
}

interface BookDetails {
  id: string
  title: string
  author: string | null
  description: string | null
  cover_path: string | null
  language: string | null
  chapters: Chapter[]
}

function ChapterCard({ chapter, bookId }: { chapter: Chapter, bookId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const hasSummary = !!chapter.summary

  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSummarizing(true)
    try {
      await fetch(`http://localhost:8000/api/v1/books/${bookId}/chapters/${chapter.id}/summarize`, {
        method: 'POST'
      })
      // The parent component's polling will pick up the summary and unset isSummarizing when it arrives
    } catch (err) {
      console.error(err)
      setIsSummarizing(false)
    }
  }

  // Effect to stop loading state when summary arrives via polling
  useEffect(() => {
    if (hasSummary) {
      setIsSummarizing(false)
    }
  }, [hasSummary])

  return (
    <div className="border border-[#c09a53]/30 rounded-sm bg-[#1a110b]/90 shadow-sm overflow-hidden flex flex-col transition-all mb-3 relative" style={{ marginLeft: `${Math.max(0, chapter.level - 1) * 1.5}rem` }}>
      <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none z-10" />
      <div 
        className={`p-4 flex items-start gap-4 cursor-pointer hover:bg-[#2a1d15] transition-colors relative z-20 ${expanded ? 'bg-[#2a1d15]' : ''}`}
        onClick={() => hasSummary && setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[#e4cfa1] text-lg leading-tight tracking-wide">{chapter.title}</h3>
            {hasSummary && (
              <span className="bg-[#8b2323] text-[#f4ebd0] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider whitespace-nowrap border border-[#3d2b1f]">御览提要</span>
            )}
          </div>
          {hasSummary && chapter.summary ? (
            <p className="text-[13px] text-[#a38a6a] mt-1.5 line-clamp-2 leading-relaxed pr-4">{chapter.summary.summary}</p>
          ) : isSummarizing ? (
             <p className="text-xs text-[#c09a53] mt-2 italic flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin"/> 编撰中...</p>
          ) : (
             <div className="mt-2">
               <Button variant="outline" size="sm" className="h-7 text-xs bg-[#2a1d15] hover:bg-[#c09a53]/20 text-[#c09a53] border-[#c09a53]/30" onClick={handleSummarize}>
                 编撰提要
               </Button>
             </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Link href={`/books/${bookId}/read/${chapter.id}`} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" className="h-8 bg-[#8b2323] hover:bg-[#6a1b1b] text-[#f4ebd0] tracking-widest font-bold border border-[#3d2b1f]">御览</Button>
          </Link>
          {hasSummary && (
            <div className="p-1.5 text-[#c09a53] hover:text-[#e4cfa1] bg-[#1a110b] border border-[#c09a53]/30 rounded-sm shadow-sm transition-colors">
               {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          )}
        </div>
      </div>
      
      {expanded && hasSummary && chapter.summary && (
        <div className="p-5 border-t border-[#c09a53]/30 bg-[#0a0705]/80 relative z-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
               <div>
                  <h4 className="text-[11px] font-bold text-[#c09a53] uppercase tracking-widest mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> 要旨</h4>
                  <ul className="space-y-2.5">
                    {chapter.summary.bullets.map((b, i) => (
                      <li key={i} className="text-[13px] text-[#a38a6a] flex items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8b2323] mt-1.5 mr-3 shrink-0" />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
               </div>
            </div>
            <div className="space-y-6">
              {chapter.summary.tags.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#c09a53] uppercase tracking-widest mb-3 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5"/> 标引</h4>
                  <div className="flex flex-wrap gap-2">
                    {chapter.summary.tags.map((t, i) => (
                       <span key={i} className="bg-[#2a1d15] text-[#cca366] border border-[#c09a53]/30 font-medium text-[11px] px-2.5 py-1 rounded-sm">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {chapter.summary.keywords.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#c09a53] uppercase tracking-widest mb-3">辞条</h4>
                  <div className="flex flex-wrap gap-2">
                    {chapter.summary.keywords.map((k, i) => (
                       <span key={i} className="text-[11px] font-medium text-[#a38a6a] bg-transparent border border-[#c09a53]/20 px-2 py-0.5 rounded-sm">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BookDetailsPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const [book, setBook] = useState<BookDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBook = () => {
    fetch(`http://localhost:8000/api/v1/books/${id}`)
      .then(res => res.json())
      .then(data => {
        setBook(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchBook()
    // Optional: set an interval to check for summaries if they are generating
    const interval = setInterval(() => {
      fetchBook()
    }, 5000)
    return () => clearInterval(interval)
  }, [id])

  if (loading && !book) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#c09a53]" /></div>
  }

  if (!book) {
    return <div className="p-8 text-center text-[#a38a6a]">查无此书。</div>
  }

  return (
    <div className="flex-1 overflow-auto p-8 bg-transparent">
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <Link href="/books" className="inline-flex items-center text-[13px] text-[#c09a53] hover:text-[#e4cfa1] transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回藏书阁
        </Link>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 flex-shrink-0">
            {book.cover_path ? (
              <img src={`http://localhost:8000${book.cover_path}`} alt="cover" className="w-full rounded-sm shadow-lg border border-[#c09a53]/30 opacity-90 mix-blend-luminosity" />
            ) : (
              <div className="w-full aspect-[2/3] bg-[#1a110b] border border-[#c09a53]/30 rounded-sm shadow-lg flex items-center justify-center text-[#c09a53]/30">
                <BookOpen className="h-16 w-16" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4 pt-2">
            <h1 className="text-3xl font-bold tracking-[0.1em] text-[#e4cfa1]">{book.title}</h1>
            <p className="text-lg text-[#a38a6a] font-medium">著者：{book.author || "佚名"}</p>
            {book.language && <span className="inline-block bg-[#2a1d15] text-[#c09a53] border border-[#c09a53]/30 px-2 py-1 text-[11px] font-bold rounded-sm uppercase tracking-wider">{book.language}</span>}
            
            <div className="prose prose-sm max-w-none text-[#a38a6a] pt-2 leading-relaxed">
              {book.description ? (
                <div dangerouslySetInnerHTML={{ __html: book.description }} />
              ) : (
                <p>暂无提要。</p>
              )}
            </div>
            
            <div className="pt-6">
              {book.chapters.length > 0 && (
                <Link href={`/books/${book.id}/read/${book.chapters[0].id}`}>
                  <Button size="lg" className="bg-[#8b2323] hover:bg-[#6a1b1b] text-[#f4ebd0] tracking-widest font-bold border border-[#3d2b1f] shadow-md">从头御览</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="pt-10">
          <div className="flex items-center justify-between mb-6 border-b border-[#c09a53]/30 pb-4">
            <h2 className="text-2xl font-bold text-[#e4cfa1] tracking-[0.1em]">卷宗与提要</h2>
            <div className="text-[13px] font-medium text-[#c09a53] bg-[#2a1d15] border border-[#c09a53]/30 px-3 py-1 rounded-sm">
              共 {book.chapters.length} 卷
            </div>
          </div>
          
          <div className="space-y-1">
            {book.chapters.map(chapter => (
              <ChapterCard key={chapter.id} chapter={chapter} bookId={book.id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
