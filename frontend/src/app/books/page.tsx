"use client"

import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n"
import { api } from "@/lib/api"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Book as BookIcon, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"

interface Book {
  id: string
  title: string
  author: string | null
  language: string | null
  cover_path: string | null
  source_file_id: string | null
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
        api.files.list()
      ])
      
      setBooks(booksRes)
      setFiles(filesRes.filter((f: any) => ['epub', 'pdf'].includes(f.file_type)))
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

  const handleReExtract = async (fileId: string) => {
    setExtractingId(fileId)
    try {
      await fetch(`http://localhost:8000/api/v1/books/extract/${fileId}?force=true`, {
        method: 'POST'
      })
      await fetchData()
    } catch (error) {
      console.error("Re-extract failed:", error)
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
    <div className="flex-1 overflow-auto p-8 bg-transparent">
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <div className="border-b border-[#c09a53]/30 pb-4">
          <h1 className="text-3xl font-bold tracking-[0.2em] text-[#e4cfa1]">皇家藏书</h1>
          <p className="text-[#a38a6a] mt-2 tracking-wide">
            内府所藏之经史子集与天下舆图，皆可在此御览。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <Card key={book.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow bg-[#1a110b]/90 border-[#c09a53]/30 rounded-sm relative">
              <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none z-10" />
              <div className="aspect-[2/3] bg-[#0a0705] relative border-b border-[#c09a53]/30">
                {book.cover_path ? (
                  <img src={`http://localhost:8000${book.cover_path}`} alt="cover" className="object-cover w-full h-full opacity-80 mix-blend-luminosity" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-[#c09a53]/30">
                    <BookIcon className="h-16 w-16" />
                  </div>
                )}
              </div>
              <CardHeader className="p-4 flex-1">
                <CardTitle className="line-clamp-2 text-lg font-bold text-[#e4cfa1] tracking-wide">{book.title}</CardTitle>
                <p className="text-[13px] text-[#a38a6a] mt-1">著者：{book.author || "佚名"}</p>
              </CardHeader>
              <CardFooter className="p-4 pt-0 flex gap-2 relative z-20">
                <Link href={`/books/${book.id}`} className="flex-1">
                  <Button variant="default" className="w-full bg-[#8b2323] hover:bg-[#6a1b1b] text-[#f4ebd0] tracking-widest font-bold border border-[#3d2b1f]">御览</Button>
                </Link>
                {book.source_file_id && (
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="bg-[#2a1d15] text-[#c09a53] border-[#c09a53]/50 hover:bg-[#c09a53]/20 hover:text-[#e4cfa1]"
                    onClick={() => handleReExtract(book.source_file_id!)}
                    disabled={extractingId === book.source_file_id}
                    title="重新收录"
                  >
                    {extractingId === book.source_file_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
          
          {/* Unextracted EPUB files */}
          {files.map((file) => {
            // Check if this specific file ID is already extracted to a book
            const isExtracted = books.some(b => b.source_file_id === file.id)
            if (isExtracted) return null
            
            return (
              <Card key={file.id} className="overflow-hidden flex flex-col border-dashed border-[#c09a53]/40 bg-[#1a110b]/60 rounded-sm">
                <div className="aspect-[2/3] bg-[#0a0705]/50 flex items-center justify-center border-b border-dashed border-[#c09a53]/40">
                   <BookIcon className="h-16 w-16 text-[#c09a53]/20" />
                </div>
                <CardHeader className="p-4 flex-1">
                  <CardTitle className="line-clamp-2 text-lg text-[#cca366] font-bold tracking-wide">{file.original_filename}</CardTitle>
                  <p className="text-[13px] text-[#a38a6a] mt-1">未入库之卷帙</p>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full bg-[#2a1d15] text-[#e4cfa1] border-[#c09a53]/50 hover:bg-[#c09a53]/20 tracking-widest font-bold"
                    onClick={() => handleExtract(file.id)}
                    disabled={extractingId === file.id}
                  >
                    {extractingId === file.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    收录入库
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
