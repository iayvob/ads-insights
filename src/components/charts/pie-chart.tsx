"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"

interface PieChartProps {
  data: number[]
  labels: string[]
  colors: string[]
  height?: number
  width?: number
}

export function PieChart({ data, labels, colors, height = 300, width = 400 }: PieChartProps) {
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
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const radius = Math.min(centerX, centerY) - 40

    // Calculate total
    const total = data.reduce((sum, value) => sum + value, 0)

    // Draw pie
    let startAngle = 0
    const sliceInfo = []

    data.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI
      const endAngle = startAngle + sliceAngle
      const midAngle = startAngle + sliceAngle / 2

      // Store slice info for hover detection
      sliceInfo.push({
        startAngle,
        endAngle,
        midAngle,
        value,
      })

      // Draw slice with slight padding for hover effect
      const padding = hoveredIndex === index ? 10 : 0
      const sliceRadius = radius + padding

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, sliceRadius, startAngle, endAngle)
      ctx.closePath()

      ctx.fillStyle = colors[index] || "#3b82f6"
      ctx.fill()

      // Add subtle shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.1)"
      ctx.shadowBlur = 5
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 2

      // Add stroke
      ctx.strokeStyle = theme === "dark" ? "#111" : "#fff"
      ctx.lineWidth = 1
      ctx.stroke()

      // Reset shadow
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0

      // Draw percentage label if not hovered
      if (hoveredIndex !== index) {
        const labelRadius = radius * 0.7
        const labelX = centerX + Math.cos(midAngle) * labelRadius
        const labelY = centerY + Math.sin(midAngle) * labelRadius

        ctx.fillStyle = "#fff"
        ctx.font = "bold 12px Inter, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        const percentage = ((value / total) * 100).toFixed(1)
        ctx.fillText(`${percentage}%`, labelX, labelY)
      }

      startAngle = endAngle
    })

    // Draw tooltip for hovered slice
    if (hoveredIndex !== null) {
      const slice = sliceInfo[hoveredIndex]

      // Draw tooltip
      const tooltipWidth = 120
      const tooltipHeight = 60
      let tooltipX = mousePos.x - tooltipWidth / 2
      let tooltipY = mousePos.y - tooltipHeight - 10

      // Ensure tooltip stays within canvas
      if (tooltipX < 5) tooltipX = 5
      if (tooltipX + tooltipWidth > canvasWidth - 5) tooltipX = canvasWidth - tooltipWidth - 5
      if (tooltipY < 5) tooltipY = 5

      // Draw tooltip background
      ctx.fillStyle = theme === "dark" ? "rgba(26, 26, 26, 0.9)" : "rgba(255, 255, 255, 0.9)"
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
      ctx.fillText(labels[hoveredIndex], tooltipX + tooltipWidth / 2, tooltipY + 16)

      const percentage = ((slice.value / total) * 100).toFixed(1)
      ctx.font = "12px Inter, sans-serif"
      ctx.fillText(`${percentage}%`, tooltipX + tooltipWidth / 2, tooltipY + 36)

      // Draw color indicator
      ctx.fillStyle = colors[hoveredIndex]
      ctx.beginPath()
      ctx.roundRect(tooltipX + tooltipWidth / 2 - 15, tooltipY + 46, 30, 6, 3)
      ctx.fill()
    }

    // Draw legend
    const legendX = canvasWidth - 120
    const legendY = 40

    labels.forEach((label, index) => {
      const y = legendY + index * 25

      // Draw color box
      ctx.fillStyle = colors[index] || "#3b82f6"
      ctx.beginPath()
      ctx.roundRect(legendX, y, 15, 15, 3)
      ctx.fill()

      // Draw label
      ctx.fillStyle = theme === "dark" ? "#fff" : "#000"
      ctx.font = "12px Inter, sans-serif"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText(label, legendX + 25, y + 7)
    })
  }, [data, labels, colors, theme, hoveredIndex, mousePos])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || data.length === 0) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePos({ x, y })

    const canvasWidth = canvasRef.current.width
    const canvasHeight = canvasRef.current.height
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const radius = Math.min(centerX, centerY) - 40

    // Calculate angle from center to mouse position
    const dx = x - centerX
    const dy = y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Check if mouse is within the pie chart
    if (distance <= radius) {
      let angle = Math.atan2(dy, dx)
      if (angle < 0) angle += 2 * Math.PI

      // Calculate total
      const total = data.reduce((sum, value) => sum + value, 0)

      // Find which slice the angle corresponds to
      let startAngle = 0
      for (let i = 0; i < data.length; i++) {
        const sliceAngle = (data[i] / total) * 2 * Math.PI
        const endAngle = startAngle + sliceAngle

        if (angle >= startAngle && angle <= endAngle) {
          setHoveredIndex(i)
          return
        }

        startAngle = endAngle
      }
    } else {
      setHoveredIndex(null)
    }
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
