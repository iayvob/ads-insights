"use client"

import { motion } from "framer-motion"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface FooterProps {
  className?: string
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "mt-auto border-t bg-gradient-to-b from-background to-muted/20",
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Credit Bar Only */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0"
        >
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <span>© {currentYear} AdInsights. Made with</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
            </motion.div>
            <Link
              href="https://apptomatch.com/"
              className="font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            >
              AppToMatch
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.footer>
  )
}
