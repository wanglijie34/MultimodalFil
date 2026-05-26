"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Menu, Search, BookOpen } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/lib/i18n"

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
  author: string | null
  description: string | null
  cover_path: string | null
  chapters: ChapterSummary[]
}

export default function BookReaderPage() {
  const { id: bookId, chapterId } = useParams()
  const router = useRouter()
  const { t } = useI18n()
  
  const [chapter, setChapter] = useState<ChapterText | null>(null)
  const [book, setBook] = useState<BookDetails | null>(null)
  const [loading, setLoading] = useState(true)
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Refs
  const contentRef = useRef<HTMLDivElement>(null)
  const saveProgressTimeout = useRef<NodeJS.Timeout | null>(null)
  const initialScrollRestored = useRef(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [bookRes, chapterRes, progressRes] = await Promise.all([
          fetch(`http://localhost:8000/api/v1/books/${bookId}`).then(r => r.json()),
          fetch(`http://localhost:8000/api/v1/books/${bookId}/chapters/${chapterId}`).then(r => r.json()),
          fetch(`http://localhost:8000/api/v1/books/${bookId}/progress`).then(r => r.json()).catch(() => null)
        ])
        
        setBook(bookRes)
        setChapter(chapterRes)
        
        // Restore progress if it matches the current chapter, or if we just landed on the page and should redirect
        if (progressRes && progressRes.chapter_id) {
          // Note: A smarter implementation would redirect to progressRes.chapter_id if the user 
          // just clicked "Read" from the library, but since they clicked a specific chapter link,
          // we only restore scroll if they are on the saved chapter.
          if (progressRes.chapter_id === chapterId) {
            setTimeout(() => {
              if (contentRef.current) {
                contentRef.current.scrollTop = progressRes.scroll_offset
                initialScrollRestored.current = true
              }
            }, 100) // slight delay to ensure render
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [bookId, chapterId])

  const saveProgress = useCallback((offset: number) => {
    fetch(`http://localhost:8000/api/v1/books/${bookId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapter_id: chapterId,
        scroll_offset: offset
      })
    }).catch(console.error)
  }, [bookId, chapterId])

  const handleScroll = () => {
    if (!contentRef.current || !initialScrollRestored.current) return
    
    const offset = contentRef.current.scrollTop
    
    // Debounce save progress
    if (saveProgressTimeout.current) clearTimeout(saveProgressTimeout.current)
    saveProgressTimeout.current = setTimeout(() => {
      saveProgress(offset)
    }, 1000)
  }

  if (loading) {
    return <div className="p-8 flex justify-center h-full items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!chapter || !book) {
    return <div className="p-8 text-center text-muted-foreground">Chapter not found.</div>
  }

  const currentIndex = book.chapters.findIndex(c => c.id === chapterId)
  const prevChapter = currentIndex > 0 ? book.chapters[currentIndex - 1] : null
  const nextChapter = currentIndex < book.chapters.length - 1 ? book.chapters[currentIndex + 1] : null

  const scrollToFootnote = (e: React.MouseEvent, citation: string) => {
    const elements = Array.from(document.querySelectorAll(`[data-citation="${citation}"]`));
    const target = e.currentTarget;
    const isLast = elements.indexOf(target as Element) === elements.length - 1;
    
    if (isLast && elements.length > 1) {
      elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (!isLast && elements.length > 1) {
      elements[elements.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Function to highlight search terms and format citations
  const renderContent = () => {
    let rawText = chapter?.content_text || ""
    if (!rawText.trim()) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
          <FileText className="h-12 w-12 opacity-20" />
          <p className="text-lg">This section contains no text.</p>
          <p className="text-sm max-w-sm text-center">In EPUB files, this usually means it is a structural divider (like a Part or Section header) rather than a readable chapter.</p>
          {nextChapter && (
            <Link href={`/books/${book.id}/read/${nextChapter.id}`} className="mt-4">
              <Button variant="outline">Continue to Next Chapter</Button>
            </Link>
          )}
        </div>
      )
    }
    
    // Fix literal \n that might be stored in the database
    rawText = rawText.replace(/\\n/g, '\n')
    
    const searchPattern = searchQuery.trim() ? `|(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})` : ''
    const regex = new RegExp(`(\\[\\d+\\])${searchPattern}`, 'gi')
    
    const parts = rawText.split(regex).filter(Boolean)
    
    return (
      <>
        {parts.map((part, i) => {
          if (/^\[\d+\]$/.test(part)) {
            return (
              <button 
                key={i} 
                onClick={(e) => scrollToFootnote(e, part)}
                data-citation={part}
                className="text-primary hover:text-primary/80 font-semibold cursor-pointer align-super text-sm mx-0.5 transition-colors"
                title={`Jump to ${part}`}
              >
                {part}
              </button>
            )
          }
          
          if (searchQuery.trim() && part.toLowerCase() === searchQuery.toLowerCase()) {
            return <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-1">{part}</mark>
          }
          
          return <span key={i}>{part}</span>
        })}
      </>
    )
  }

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      {/* Left Pane: TOC Sidebar */}
      <div 
        className={`absolute lg:relative inset-y-0 left-0 bg-white border-r w-72 z-20 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <Link href={`/books/${bookId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Library
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)] p-2 pb-20">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t("Chapters")}</div>
          {book.chapters.map(c => (
            <Link key={c.id} href={`/books/${bookId}/read/${c.id}`} onClick={() => setSidebarOpen(false)}>
              <div 
                className={`px-3 py-2 text-sm rounded-md mb-1 cursor-pointer transition-colors ${c.id === chapterId ? 'bg-primary/10 text-primary font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                style={{ paddingLeft: `${Math.max(0.5, c.level * 0.75)}rem` }}
              >
                {c.title}
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Overlay when sidebar open on mobile */}
      {sidebarOpen && (
        <div className="absolute inset-0 bg-black/20 z-10 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Middle Pane: Main Reader Content */}
      <div 
        className="flex-1 overflow-y-auto relative scroll-smooth" 
        ref={contentRef}
        onScroll={handleScroll}
      >
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b px-4 py-3 flex items-center gap-4 z-10 shadow-sm">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex items-center justify-between max-w-3xl mx-auto">
            <div className="text-sm font-medium text-slate-700 line-clamp-1 flex-1">{chapter.title}</div>
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                type="text" 
                placeholder="Search in chapter..." 
                className="pl-9 bg-slate-50 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto py-12 px-6 lg:px-12 min-h-full flex flex-col">
          {/* Mobile search */}
          <div className="relative w-full sm:hidden mb-8">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search in chapter..." 
              className="pl-9 bg-white h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <h1 className="text-3xl font-bold mb-10 text-slate-900 leading-tight">{chapter.title}</h1>
          <div className="prose prose-slate prose-lg max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap font-serif flex-1">
            {renderContent()}
          </div>

          <div className="mt-20 pt-8 border-t flex items-center justify-between pb-12">
            {prevChapter ? (
              <Link href={`/books/${bookId}/read/${prevChapter.id}`}>
                <Button variant="outline" className="flex items-center hover:bg-slate-100">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
              </Link>
            ) : <div />}
            
            {nextChapter ? (
              <Link href={`/books/${bookId}/read/${nextChapter.id}`}>
                <Button variant="outline" className="flex items-center hover:bg-slate-100">
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : <div />}
          </div>
        </div>
      </div>

      {/* Right Pane: Book Info (Phase 2) / AI Space (Phase 4) */}
      <div className="hidden xl:block w-80 bg-slate-50 border-l overflow-y-auto p-6">
        <div className="space-y-6">
          <div className="aspect-[2/3] bg-slate-200 rounded-md overflow-hidden shadow-sm relative">
             {book.cover_path ? (
                <img src={`http://localhost:8000${book.cover_path}`} alt="cover" className="object-cover w-full h-full" />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-slate-400">
                  <BookOpen className="h-16 w-16" />
                </div>
              )}
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">{book.title}</h3>
            <p className="text-muted-foreground mt-1">{book.author || "Unknown Author"}</p>
          </div>
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">About this book</h4>
            <div className="text-sm text-slate-600 prose prose-sm max-w-none">
               {book.description ? (
                  <div dangerouslySetInnerHTML={{ __html: book.description }} />
                ) : (
                  <p>No description available.</p>
                )}
            </div>
          </div>
          <div className="pt-4 border-t mt-auto">
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <h4 className="text-sm font-medium text-primary mb-1">AI Assistant</h4>
              <p className="text-xs text-slate-500">Intelligent chat and analysis features will be available here in upcoming phases.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
