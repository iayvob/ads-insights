"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface BarChartProps {
  data: number[]
  labels: string[]
  color?: string
  title?: string
  height?: number
  width?: number
}

export function BarChart({ data, labels, color = "#3b82f6", title, height = 300, width = 600 }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    const canvasWidth = canvasRef.current.width
    const canvasHeight = canvasRef.current.height
    const padding = 40
    const chartWidth = canvasWidth - 2 * padding
    const chartHeight = canvasHeight - 2 * padding

    // Find max value
    const maxValue = Math.max(...data) * 1.1

    // Draw title if provided
    if (title) {
      ctx.fillStyle = theme === "dark" ? "#fff" : "#000"
      ctx.font = "14px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(title, canvasWidth / 2, 20)
    }

    // Draw y-axis
    ctx.beginPath()
    ctx.strokeStyle = theme === "dark" ? "#333" : "#ddd"
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, canvasHeight - padding)
    ctx.stroke()

    // Draw x-axis
    ctx.beginPath()
    ctx.strokeStyle = theme === "dark" ? "#333" : "#ddd"
    ctx.moveTo(padding, canvasHeight - padding)
    ctx.lineTo(canvasWidth - padding, canvasHeight - padding)
    ctx.stroke()

    // Draw bars
    const barWidth = (chartWidth / data.length) * 0.8
    const barSpacing = (chartWidth / data.length) * 0.2

    data.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2
      const y = canvasHeight - padding - barHeight

      // Draw bar with gradient
      const gradient = ctx.createLinearGradient(x, y, x, canvasHeight - padding)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, `${color}50`)

      ctx.fillStyle = gradient

      // Draw rounded top corners
      const radius = Math.min(barWidth / 2, 4)
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + barWidth - radius, y)
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius)
      ctx.lineTo(x + barWidth, canvasHeight - padding)
      ctx.lineTo(x, canvasHeight - padding)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
      ctx.fill()

      // Add hover effect
      if (hoveredIndex === index) {
        ctx.fillStyle = `${color}30`
        ctx.fillRect(x - 2, padding, barWidth + 4, chartHeight)

        // Draw tooltip
        const tooltipWidth = 100
        const tooltipHeight = 40
        let tooltipX = mousePos.x - tooltipWidth / 2
        let tooltipY = mousePos.y - tooltipHeight - 10

        // Ensure tooltip stays within canvas
        if (tooltipX < 5) tooltipX = 5
        if (tooltipX + tooltipWidth > canvasWidth - 5) tooltipX = canvasWidth - tooltipWidth - 5
        if (tooltipY < 5) tooltipY = 5

        // Draw tooltip background
        ctx.fillStyle = theme === "dark" ? "#1a1a1a" : "#fff"
        ctx.strokeStyle = theme === "dark" ? "#333" : "#ddd"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4)
        ctx.fill()
        ctx.stroke()

        // Draw tooltip content
        ctx.fillStyle = theme === "dark" ? "#fff" : "#000"
        ctx.font = "bold 12px Inter, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(value.toLocaleString(), tooltipX + tooltipWidth / 2, tooltipY + 16)

        ctx.font = "10px Inter, sans-serif"
        ctx.fillText(labels[index], tooltipX + tooltipWidth / 2, tooltipY + 30)
      }

      // Draw label
      ctx.fillStyle = theme === "dark" ? "#aaa" : "#666"
      ctx.font = "10px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(labels[index], x + barWidth / 2, canvasHeight - padding + 15)
    })

    // Draw y-axis labels
    const ySteps = 5
    for (let i = 0; i <= ySteps; i++) {
      const value = (maxValue / ySteps) * i
      const y = canvasHeight - padding - (i / ySteps) * chartHeight

      ctx.fillStyle = theme === "dark" ? "#aaa" : "#666"
      ctx.font = "10px Inter, sans-serif"
      ctx.textAlign = "right"
      ctx.fillText(value.toLocaleString(), padding - 5, y + 3)

      // Draw grid line
      ctx.beginPath()
      ctx.strokeStyle = theme === "dark" ? "#222" : "#eee"
      ctx.moveTo(padding, y)
      ctx.lineTo(canvasWidth - padding, y)
      ctx.stroke()
    }
  }, [data, labels, color, title, theme, hoveredIndex, mousePos])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || data.length === 0) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePos({ x, y })

    const canvasWidth = canvasRef.current.width
    const padding = 40
    const chartWidth = canvasWidth - 2 * padding
    const barWidth = (chartWidth / data.length) * 0.8
    const barSpacing = (chartWidth / data.length) * 0.2

    // Check if mouse is over a bar
    for (let i = 0; i < data.length; i++) {
      const barX = padding + i * (barWidth + barSpacing) + barSpacing / 2
      if (x >= barX && x <= barX + barWidth) {
        setHoveredIndex(i)
        return
      }
    }

    setHoveredIndex(null)
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}
