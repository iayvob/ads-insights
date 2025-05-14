import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }

  return (
    <div className="flex items-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(sizeClasses[size], "text-blue-500", className)}
      >
        <path d="M3 3v18h18" />
        <path d="M18.4 9.6a9 9 0 1 1-4.2-5.4" />
        <path d="m13 7 4-4" />
        <path d="m17 3-4 4" />
        <path d="m8 12 3 3 5-5" />
      </svg>
      {showText && (
        <span
          className={cn(
            "font-bold tracking-tight",
            size === "sm" && "text-base",
            size === "md" && "text-xl",
            size === "lg" && "text-2xl",
          )}
        >
          Ads Insights
        </span>
      )}
    </div>
  )
}
