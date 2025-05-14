import { Button } from "@/components/ui/button"
import { Calendar, Download } from "lucide-react"

interface DashboardHeaderProps {
  title: string
  description?: string
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function DashboardHeader({ title, description, user }: DashboardHeaderProps) {
  return (
    <div className="border-b border-border/40 bg-card/30">
      <div className="container py-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            {description && <p className="text-muted-foreground mt-1">{description}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Date Range</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
