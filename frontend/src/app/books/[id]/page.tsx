"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useI18n } from "@/lib/i18n"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, BookOpen } from "lucide-react"
import Link from "next/link"

interface Chapter {
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
  language: string | null
  chapters: Chapter[]
}

export default function BookDetailsPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const [book, setBook] = useState<BookDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [id])

  if (loading) {
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
              <img src={`http://localhost:8000${book.cover_path}`} alt="cover" className="w-full rounded-md shadow-md" />
            ) : (
              <div className="w-full aspect-[2/3] bg-slate-200 rounded-md shadow-md flex items-center justify-center text-slate-400">
                <BookOpen className="h-16 w-16" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">{book.title}</h1>
            <p className="text-lg text-muted-foreground">{book.author || "Unknown Author"}</p>
            {book.language && <span className="inline-block bg-slate-200 text-slate-600 px-2 py-1 text-xs rounded uppercase">{book.language}</span>}
            
            <div className="prose prose-sm max-w-none text-slate-600">
              {book.description ? (
                <div dangerouslySetInnerHTML={{ __html: book.description }} />
              ) : (
                <p>No description available.</p>
              )}
            </div>
            
            <div className="pt-4">
              {book.chapters.length > 0 && (
                <Link href={`/books/${book.id}/read/${book.chapters[0].id}`}>
                  <Button size="lg">{t("Read")} from Beginning</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t">
          <h2 className="text-2xl font-bold mb-4">{t("Chapters")}</h2>
          <div className="space-y-1">
            {book.chapters.map(chapter => (
              <Link key={chapter.id} href={`/books/${book.id}/read/${chapter.id}`} className="block">
                <div 
                  className="px-4 py-2 hover:bg-slate-100 rounded-md transition-colors text-slate-700"
                  style={{ paddingLeft: `${chapter.level * 1}rem` }}
                >
                  {chapter.title}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
