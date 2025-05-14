"use client"

import { useEffect, useRef } from "react"

interface ChartProps {
  data: number[]
  labels: string[]
  color?: string
  title?: string
}

export function LineChart({ data, labels, color = "blue" }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    const width = canvasRef.current.width
    const height = canvasRef.current.height
    const padding = 10
    const chartWidth = width - 2 * padding
    const chartHeight = height - 2 * padding

    // Find min and max values
    const maxValue = Math.max(...data) * 1.1
    const minValue = 0

    // Draw line
    ctx.beginPath()
    ctx.strokeStyle = getColorCode(color)
    ctx.lineWidth = 2

    data.forEach((value, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth
      const y = height - padding - ((value - minValue) / (maxValue - minValue)) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Fill area under the line
    ctx.lineTo(padding + chartWidth, height - padding)
    ctx.lineTo(padding, height - padding)
    ctx.closePath()
    ctx.fillStyle = `${getColorCode(color)}20`
    ctx.fill()
  }, [data, labels, color])

  return <canvas ref={canvasRef} width="150" height="80" className="w-full h-full"></canvas>
}

export function BarChart({ data, labels, color = "blue", title }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    const width = canvasRef.current.width
    const height = canvasRef.current.height
    const padding = 40
    const chartWidth = width - 2 * padding
    const chartHeight = height - 2 * padding

    // Find max value
    const maxValue = Math.max(...data) * 1.1

    // Draw title if provided
    if (title) {
      ctx.fillStyle = "#000"
      ctx.font = "14px Arial"
      ctx.textAlign = "center"
      ctx.fillText(title, width / 2, 20)
    }

    // Draw y-axis
    ctx.beginPath()
    ctx.strokeStyle = "#ddd"
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.stroke()

    // Draw x-axis
    ctx.beginPath()
    ctx.strokeStyle = "#ddd"
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Draw bars
    const barWidth = (chartWidth / data.length) * 0.8
    const barSpacing = (chartWidth / data.length) * 0.2

    data.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2
      const y = height - padding - barHeight

      ctx.fillStyle = getColorCode(color)
      ctx.fillRect(x, y, barWidth, barHeight)

      // Draw label
      ctx.fillStyle = "#666"
      ctx.font = "10px Arial"
      ctx.textAlign = "center"
      ctx.fillText(labels[index], x + barWidth / 2, height - padding + 15)
    })

    // Draw y-axis labels
    const ySteps = 5
    for (let i = 0; i <= ySteps; i++) {
      const value = (maxValue / ySteps) * i
      const y = height - padding - (i / ySteps) * chartHeight

      ctx.fillStyle = "#666"
      ctx.font = "10px Arial"
      ctx.textAlign = "right"
      ctx.fillText(value.toLocaleString(), padding - 5, y + 3)

      // Draw grid line
      ctx.beginPath()
      ctx.strokeStyle = "#eee"
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }
  }, [data, labels, color, title])

  return <canvas ref={canvasRef} width="600" height="300" className="w-full h-full"></canvas>
}

export function PieChart({ data, labels, colors }: { data: number[]; labels: string[]; colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    const width = canvasRef.current.width
    const height = canvasRef.current.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(centerX, centerY) - 40

    // Calculate total
    const total = data.reduce((sum, value) => sum + value, 0)

    // Draw pie
    let startAngle = 0
    data.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
      ctx.closePath()

      ctx.fillStyle = colors[index] || getColorCode("blue")
      ctx.fill()

      // Draw label
      const labelAngle = startAngle + sliceAngle / 2
      const labelRadius = radius * 0.7
      const labelX = centerX + Math.cos(labelAngle) * labelRadius
      const labelY = centerY + Math.sin(labelAngle) * labelRadius

      ctx.fillStyle = "#fff"
      ctx.font = "bold 12px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      const percentage = ((value / total) * 100).toFixed(1)
      ctx.fillText(`${percentage}%`, labelX, labelY)

      startAngle += sliceAngle
    })

    // Draw legend
    const legendX = width - 120
    const legendY = 40

    labels.forEach((label, index) => {
      const y = legendY + index * 25

      // Draw color box
      ctx.fillStyle = colors[index] || getColorCode("blue")
      ctx.fillRect(legendX, y, 15, 15)

      // Draw label
      ctx.fillStyle = "#000"
      ctx.font = "12px Arial"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText(label, legendX + 25, y + 7)
    })
  }, [data, labels, colors])

  return <canvas ref={canvasRef} width="400" height="300" className="w-full h-full"></canvas>
}

function getColorCode(color: string): string {
  const colorMap: Record<string, string> = {
    blue: "#3b82f6",
    green: "#22c55e",
    red: "#ef4444",
    yellow: "#eab308",
    purple: "#a855f7",
    pink: "#ec4899",
    orange: "#f97316",
  }

  return colorMap[color] || "#3b82f6"
}
