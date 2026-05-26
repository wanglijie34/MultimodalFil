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
  const hasSummary = !!chapter.summary

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col transition-all mb-3" style={{ marginLeft: `${Math.max(0, chapter.level - 1) * 1.5}rem` }}>
      <div 
        className={`p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors ${expanded ? 'bg-slate-50' : ''}`}
        onClick={() => hasSummary && setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 text-lg leading-tight">{chapter.title}</h3>
            {hasSummary && (
              <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">AI Summary</span>
            )}
          </div>
          {hasSummary && chapter.summary ? (
            <p className="text-sm text-slate-600 mt-1.5 line-clamp-2 leading-relaxed pr-4">{chapter.summary.summary}</p>
          ) : (
             <p className="text-xs text-slate-400 mt-1 italic flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin"/> Summarizing chapter in background...</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Link href={`/books/${bookId}/read/${chapter.id}`} onClick={(e) => e.stopPropagation()}>
            <Button size="sm" className="h-8 shadow-sm">Read</Button>
          </Link>
          {hasSummary && (
            <div className="p-1.5 text-slate-400 hover:text-slate-700 bg-white border rounded-md shadow-sm transition-colors">
               {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          )}
        </div>
      </div>
      
      {expanded && hasSummary && chapter.summary && (
        <div className="p-5 border-t bg-slate-50/50">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
               <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Key Points</h4>
                  <ul className="space-y-2.5">
                    {chapter.summary.bullets.map((b, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 mr-3 shrink-0" />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
               </div>
            </div>
            <div className="space-y-6">
              {chapter.summary.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5"/> Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {chapter.summary.tags.map((t, i) => (
                       <span key={i} className="bg-slate-200/70 text-slate-700 font-medium text-xs px-2.5 py-1 rounded-md">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {chapter.summary.keywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {chapter.summary.keywords.map((k, i) => (
                       <span key={i} className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">{k}</span>
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
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!book) {
    return <div className="p-8 text-center text-muted-foreground">Book not found.</div>
  }

  return (
    <div className="flex-1 overflow-auto p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/books" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Books
        </Link>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 flex-shrink-0">
            {book.cover_path ? (
              <img src={`http://localhost:8000${book.cover_path}`} alt="cover" className="w-full rounded-xl shadow-lg border border-slate-200/50" />
            ) : (
              <div className="w-full aspect-[2/3] bg-slate-200 rounded-xl shadow-lg flex items-center justify-center text-slate-400">
                <BookOpen className="h-16 w-16" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4 pt-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{book.title}</h1>
            <p className="text-lg text-slate-600 font-medium">{book.author || "Unknown Author"}</p>
            {book.language && <span className="inline-block bg-slate-200 text-slate-600 px-2 py-1 text-xs font-bold rounded uppercase tracking-wider">{book.language}</span>}
            
            <div className="prose prose-sm max-w-none text-slate-600 pt-2">
              {book.description ? (
                <div dangerouslySetInnerHTML={{ __html: book.description }} />
              ) : (
                <p>No description available.</p>
              )}
            </div>
            
            <div className="pt-6">
              {book.chapters.length > 0 && (
                <Link href={`/books/${book.id}/read/${book.chapters[0].id}`}>
                  <Button size="lg" className="shadow-md">{t("Read")} from Beginning</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="pt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t("Chapters")} & Outlines</h2>
            <div className="text-sm font-medium text-slate-500 bg-slate-200/60 px-3 py-1 rounded-full">
              {book.chapters.length} Chapters
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
