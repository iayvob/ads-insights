"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface LineChartProps {
  data: number[]
  labels: string[]
  color?: string
  height?: number
  width?: number
  showArea?: boolean
}

export function LineChart({
  data,
  labels,
  color = "#3b82f6",
  height = 80,
  width = 150,
  showArea = true,
}: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    const canvasWidth = canvasRef.current.width
    const canvasHeight = canvasRef.current.height
    const padding = 10
    const chartWidth = canvasWidth - 2 * padding
    const chartHeight = canvasHeight - 2 * padding

    // Find min and max values
    const maxValue = Math.max(...data) * 1.1
    const minValue = 0

    // Create gradient for area
    const areaGradient = ctx.createLinearGradient(0, padding, 0, canvasHeight - padding)
    areaGradient.addColorStop(0, `${color}30`)
    areaGradient.addColorStop(1, `${color}05`)

    // Draw line with smooth curve
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2

    // Use bezier curves for smoother lines
    for (let i = 0; i < data.length; i++) {
      const x = padding + (i / (data.length - 1)) * chartWidth
      const y = canvasHeight - padding - ((data[i] - minValue) / (maxValue - minValue)) * chartHeight

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        const prevX = padding + ((i - 1) / (data.length - 1)) * chartWidth
        const prevY = canvasHeight - padding - ((data[i - 1] - minValue) / (maxValue - minValue)) * chartHeight

        const cpX1 = prevX + (x - prevX) / 3
        const cpX2 = prevX + (2 * (x - prevX)) / 3

        ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y)
      }
    }

    ctx.stroke()

    // Fill area under the line
    if (showArea) {
      const lastX = padding + chartWidth
      const lastY = canvasHeight - padding

      ctx.lineTo(lastX, lastY)
      ctx.lineTo(padding, lastY)
      ctx.closePath()
      ctx.fillStyle = areaGradient
      ctx.fill()
    }

    // Add subtle grid lines
    if (height > 60) {
      ctx.beginPath()
      ctx.strokeStyle = theme === "dark" ? "#222" : "#eee"
      ctx.lineWidth = 0.5

      const gridLines = 3
      for (let i = 1; i < gridLines; i++) {
        const y = padding + (i / gridLines) * chartHeight
        ctx.moveTo(padding, y)
        ctx.lineTo(padding + chartWidth, y)
      }

      ctx.stroke()
    }

    // Add dots for data points
    if (height > 60) {
      for (let i = 0; i < data.length; i++) {
        const x = padding + (i / (data.length - 1)) * chartWidth
        const y = canvasHeight - padding - ((data[i] - minValue) / (maxValue - minValue)) * chartHeight

        ctx.beginPath()
        ctx.fillStyle = theme === "dark" ? "#111" : "#fff"
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = color
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [data, labels, color, theme, height, showArea])

  return <canvas ref={canvasRef} width={width} height={height} className="w-full h-full" />
}
