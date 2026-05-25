"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Menu } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ChapterText {
  id: string
  title: string
  content_text: string
  level: number
}

interface ChapterSummary {
  id: string
  title: string
  level: number
  order_index: number
}

interface BookDetails {
  id: string
  title: string
  chapters: ChapterSummary[]
}

export default function BookReaderPage() {
  const { id: bookId, chapterId } = useParams()
  const router = useRouter()
  const [chapter, setChapter] = useState<ChapterText | null>(null)
  const [book, setBook] = useState<BookDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [bookRes, chapterRes] = await Promise.all([
          fetch(`http://localhost:8000/api/v1/books/${bookId}`).then(r => r.json()),
          fetch(`http://localhost:8000/api/v1/books/${bookId}/chapters/${chapterId}`).then(r => r.json())
        ])
        setBook(bookRes)
        setChapter(chapterRes)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [bookId, chapterId])

  if (loading) {
    return <div className="p-8 flex justify-center h-full items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!chapter || !book) {
    return <div className="p-8 text-center text-muted-foreground">Chapter not found.</div>
  }

  const currentIndex = book.chapters.findIndex(c => c.id === chapterId)
  const prevChapter = currentIndex > 0 ? book.chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < book.chapters.length - 1 ? book.chapters[currentIndex + 1] : null

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      {/* TOC Sidebar */}
      <div 
        className={`absolute inset-y-0 left-0 bg-white border-r w-72 z-10 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold line-clamp-1">{book.title}</h3>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)] p-2">
          {book.chapters.map(c => (
            <Link key={c.id} href={`/books/${bookId}/read/${c.id}`} onClick={() => setSidebarOpen(false)}>
              <div 
                className={`px-3 py-2 text-sm rounded-md mb-1 cursor-pointer hover:bg-slate-100 ${c.id === chapterId ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600'}`}
                style={{ paddingLeft: `${c.level * 0.75}rem` }}
              >
                {c.title}
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Overlay when sidebar open */}
      {sidebarOpen && (
        <div className="absolute inset-0 bg-black/20 z-0 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Reader Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-4 z-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex items-center justify-between">
            <Link href={`/books/${bookId}`} className="text-sm text-muted-foreground hover:text-foreground hidden sm:flex items-center">
              <ArrowLeft className="mr-1 h-3 w-3" /> Back
            </Link>
            <div className="text-sm font-medium text-slate-500 line-clamp-1 text-center px-4 flex-1">{chapter.title}</div>
            <div className="w-16"></div> {/* Spacer to center title */}
          </div>
        </div>

        <div className="max-w-3xl mx-auto py-12 px-6 lg:px-12">
          <h1 className="text-3xl font-bold mb-10 text-slate-800">{chapter.title}</h1>
          <div className="prose prose-slate prose-lg max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
            {chapter.content_text || <p className="text-muted-foreground italic">No text content available.</p>}
          </div>

          <div className="mt-20 pt-8 border-t flex items-center justify-between">
            {prevChapter ? (
              <Link href={`/books/${bookId}/read/${prevChapter.id}`}>
                <Button variant="outline" className="flex items-center">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
              </Link>
            ) : <div />}
            
            {nextChapter ? (
              <Link href={`/books/${bookId}/read/${nextChapter.id}`}>
                <Button variant="outline" className="flex items-center">
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : <div />}
          </div>
        </div>
      </div>
    </div>
  )
}
