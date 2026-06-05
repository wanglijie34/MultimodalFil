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
      <div className="flex items-center justify-between border-b border-[#c09a53]/30 pb-4">
        <h2 className="text-3xl font-bold tracking-[0.2em] text-[#e4cfa1]">{t("锦衣卫密查")}</h2>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a38a6a]" />
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="诏令锦衣卫暗访百官、刺探敌情..." 
            className="pl-10 h-12 text-[15px] shadow-sm bg-[#1a110b]/90 border-[#c09a53]/50 text-[#e4cfa1] placeholder:text-[#a38a6a]/60 focus-visible:ring-[#c09a53]"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-5 w-5 animate-spin text-[#c09a53]" />
            </div>
          )}
        </form>
        
        <div className="space-y-4">
          {results.length > 0 ? (
            results.map((result, i) => (
              <Card key={i} className="bg-[#1a110b]/90 border-[#c09a53]/30 rounded-sm relative overflow-hidden shadow-lg">
                <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none z-10" />
                <CardHeader className="p-4 pb-2 border-b border-[#c09a53]/20 bg-[#2a1d15]/50 relative z-20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[15px] font-bold tracking-widest text-[#e4cfa1] flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#c09a53]" />
                      残卷 {result.file_id.slice(0, 8)}... (第 {result.page_number} 页)
                    </CardTitle>
                    <div className="text-[11px] font-bold px-2 py-1 bg-[#2a1d15] border border-[#c09a53]/30 rounded-sm text-[#c09a53]">
                      契合：{result.score.toFixed(2)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-4 relative z-20">
                  <p className="text-[13px] leading-relaxed text-[#a38a6a] line-clamp-3">
                    {result.content}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button variant="link" size="sm" className="h-auto p-0 text-[#c09a53] hover:text-[#e4cfa1]">
                      细阅卷宗 <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : query && !loading ? (
            <div className="text-center py-12">
              <p className="text-[15px] font-bold tracking-widest text-[#a38a6a]">锦衣卫遍查内外，未搜得：“{query}”之干系</p>
            </div>
          ) : !query && (
            <div className="text-center py-12 border border-dashed border-[#c09a53]/50 rounded-sm bg-[#1a110b]/50 relative">
              <div className="absolute inset-1 border border-[#c09a53]/10 pointer-events-none" />
              <p className="text-[15px] font-bold tracking-widest text-[#a38a6a] relative z-10">赐下缇骑密令，命锦衣卫顺藤摸瓜，搜罗机要情报。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
