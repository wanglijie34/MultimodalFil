"use client"

import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { api } from "@/lib/api"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Book as BookIcon, Loader2 } from "lucide-react"
import Link from "next/link"

interface Book {
  id: string
  title: string
  author: string | null
  language: string | null
  cover_path: string | null
}

interface FileItem {
  id: string
  original_filename: string
  file_type: string
}

export default function BooksPage() {
  const { t } = useI18n()
  const [books, setBooks] = useState<Book[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [extractingId, setExtractingId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const [booksRes, filesRes] = await Promise.all([
        fetch('http://localhost:8000/api/v1/books').then(res => res.json()),
        api.files.list("00000000-0000-0000-0000-000000000000") // Default workspace
      ])
      
      setBooks(booksRes)
      setFiles(filesRes.filter((f: any) => f.file_type === 'epub'))
    } catch (error) {
      console.error("Error fetching books/files:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleExtract = async (fileId: string) => {
    setExtractingId(fileId)
    try {
      await fetch(`http://localhost:8000/api/v1/books/extract/${fileId}`, {
        method: 'POST'
      })
      await fetchData()
    } catch (error) {
      console.error("Extract failed:", error)
    } finally {
      setExtractingId(null)
    }
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  // Find EPUB files that are not yet extracted
  // We match by assuming Book is created from File (currently we didn't return source_file_id in GET /books, but we can match by title/filename loosely or just show all EPUBs)
  // Let's just show extracted books first, then unextracted files.

  return (
    <div className="flex-1 overflow-auto p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("Books")}</h1>
          <p className="text-muted-foreground mt-2">
            Your personal library of parsed EPUB books.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <Card key={book.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="aspect-[2/3] bg-slate-200 relative">
                {book.cover_path ? (
                  <img src={`http://localhost:8000${book.cover_path}`} alt="cover" className="object-cover w-full h-full" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-400">
                    <BookIcon className="h-16 w-16" />
                  </div>
                )}
              </div>
              <CardHeader className="p-4 flex-1">
                <CardTitle className="line-clamp-2 text-lg">{book.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{book.author || "Unknown Author"}</p>
              </CardHeader>
              <CardFooter className="p-4 pt-0">
                <Link href={`/books/${book.id}`} className="w-full">
                  <Button variant="default" className="w-full">{t("Read")}</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
          
          {/* Unextracted EPUB files */}
          {files.map((file) => {
            // Very naive check if it's extracted: title match
            const isExtracted = books.some(b => b.title === file.original_filename || b.title.includes(file.original_filename.replace('.epub', '')))
            if (isExtracted) return null
            
            return (
              <Card key={file.id} className="overflow-hidden flex flex-col border-dashed">
                <div className="aspect-[2/3] bg-slate-100 flex items-center justify-center">
                   <BookIcon className="h-16 w-16 text-slate-300" />
                </div>
                <CardHeader className="p-4 flex-1">
                  <CardTitle className="line-clamp-2 text-lg text-muted-foreground">{file.original_filename}</CardTitle>
                  <p className="text-sm text-muted-foreground">EPUB File</p>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleExtract(file.id)}
                    disabled={extractingId === file.id}
                  >
                    {extractingId === file.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("Extract Book")}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
