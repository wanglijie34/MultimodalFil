import { Button } from "@/components/ui/button"
import { FileBarChart } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <Button>
          <FileBarChart className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      <div className="border rounded-lg bg-card p-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-medium">No reports generated</p>
          <p className="text-sm text-muted-foreground">Generate your first analysis report based on your documents.</p>
        </div>
      </div>
    </div>
  )
}
