"use client"

import { useI18n } from "@/lib/i18n"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search as SearchIcon, Loader2, FileText, ExternalLink } from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SearchPage() {

  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    try {
      const data = await api.search.query(query)
      setResults(data.results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t("Search")}</h2>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across your knowledge base..." 
            className="pl-10 h-12 text-lg shadow-sm"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </form>
        
        <div className="space-y-4">
          {results.length > 0 ? (
            results.map((result, i) => (
              <Card key={i}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Chunk from {result.file_id.slice(0, 8)}... (Page {result.page_number})
                    </CardTitle>
                    <div className="text-xs font-medium px-2 py-1 bg-secondary rounded text-secondary-foreground">
                      Score: {result.score.toFixed(2)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                    {result.content}
                  </p>
                  <div className="mt-2 flex justify-end">
                    <Button variant="link" size="sm" className="h-auto p-0">
                      View Details <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : query && !loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found for "{query}"</p>
            </div>
          ) : !query && (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground">Enter a query to start searching your knowledge base.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
