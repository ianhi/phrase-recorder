"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import type { WaveformData } from "@/types"

interface SimpleWaveformTrimmerProps {
  waveformData: WaveformData
  trimStart: number
  trimEnd: number
  currentTime: number
  isPlaying: boolean
  onTrimChange: (start: number, end: number) => void
}

export function SimpleWaveformTrimmer({
  waveformData,
  trimStart,
  trimEnd,
  currentTime,
  isPlaying,
  onTrimChange,
}: SimpleWaveformTrimmerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Interaction state
  const [isDragging, setIsDragging] = useState<"start" | "end" | null>(null)
  const [hoveredHandle, setHoveredHandle] = useState<"start" | "end" | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  // Canvas dimensions
  const canvasWidth = 800
  const canvasHeight = 150
  const handleWidth = 20
  const handleHeight = 40
  const hitAreaWidth = 40 // Large hit area for easy grabbing

  // Calculate positions
  const getPositions = useCallback(() => {
    const startX = (trimStart / waveformData.duration) * canvasWidth
    const endX = (trimEnd / waveformData.duration) * canvasWidth
    const playbackX = (currentTime / waveformData.duration) * canvasWidth

    return {
      startX,
      endX,
      playbackX,
      startHitArea: {
        left: startX - hitAreaWidth / 2,
        right: startX + hitAreaWidth / 2,
        top: 0,
        bottom: canvasHeight,
      },
      endHitArea: {
        left: endX - hitAreaWidth / 2,
        right: endX + hitAreaWidth / 2,
        top: 0,
        bottom: canvasHeight,
      },
    }
  }, [trimStart, trimEnd, currentTime, waveformData.duration])

  // Get event position
  const getEventPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return 0

    const rect = canvas.getBoundingClientRect()
    let clientX: number

    if ("touches" in e) {
      clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0
    } else {
      clientX = e.clientX
    }

    return clientX - rect.left
  }

  // Check handle hover
  const checkHandleHover = (x: number, y: number) => {
    const { startHitArea, endHitArea } = getPositions()

    if (x >= startHitArea.left && x <= startHitArea.right && y >= startHitArea.top && y <= startHitArea.bottom) {
      return "start"
    }

    if (x >= endHitArea.left && x <= endHitArea.right && y >= endHitArea.top && y <= endHitArea.bottom) {
      return "end"
    }

    return null
  }

  // Mouse event handlers
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (!isDragging) {
      setHoveredHandle(checkHandleHover(x, y))
    }

    if (isDragging) {
      handleDrag(e)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const x = getEventPosition(e)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const y = e.clientY - rect.top
    const handle = checkHandleHover(x, y)

    if (handle) {
      e.preventDefault()
      setIsDragging(handle)
      const { startX, endX } = getPositions()
      const handleX = handle === "start" ? startX : endX
      setDragOffset(x - handleX)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(null)
    setDragOffset(0)
  }

  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return

    const x = getEventPosition(e)
    const adjustedX = x - dragOffset
    const timePosition = (adjustedX / canvasWidth) * waveformData.duration
    const clampedTime = Math.max(0, Math.min(waveformData.duration, timePosition))

    if (isDragging === "start") {
      const newStart = Math.min(clampedTime, trimEnd - 0.1)
      onTrimChange(newStart, trimEnd)
    } else if (isDragging === "end") {
      const newEnd = Math.max(clampedTime, trimStart + 0.1)
      onTrimChange(trimStart, newEnd)
    }
  }

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const x = getEventPosition(e)
    const touch = e.touches[0]
    if (!touch) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const y = touch.clientY - rect.top
    const handle = checkHandleHover(x, y)

    if (handle) {
      e.preventDefault()
      setIsDragging(handle)
      const { startX, endX } = getPositions()
      const handleX = handle === "start" ? startX : endX
      setDragOffset(x - handleX)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      e.preventDefault()
      handleDrag(e)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(null)
    setDragOffset(0)
  }

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveformData.samples.length) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { samples } = waveformData
    const { startX, endX, playbackX } = getPositions()

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw background
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Draw grid lines
    ctx.strokeStyle = "#e2e8f0"
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * canvasWidth
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Draw center line
    const centerY = canvasHeight / 2
    ctx.strokeStyle = "#cbd5e1"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(canvasWidth, centerY)
    ctx.stroke()

    // Draw trimmed areas (will be removed)
    ctx.fillStyle = "rgba(248, 113, 113, 0.3)"
    if (startX > 0) {
      ctx.fillRect(0, 0, startX, canvasHeight)
    }
    if (endX < canvasWidth) {
      ctx.fillRect(endX, 0, canvasWidth - endX, canvasHeight)
    }

    // Draw kept area
    ctx.fillStyle = "rgba(34, 197, 94, 0.2)"
    ctx.fillRect(startX, 0, endX - startX, canvasHeight)

    // Draw waveform
    const maxAmplitude = Math.max(...samples.map(Math.abs))

    // Draw full waveform in gray
    ctx.strokeStyle = "#94a3b8"
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < samples.length; i++) {
      const x = (i / samples.length) * canvasWidth
      const y = centerY + (samples[i] / maxAmplitude) * (centerY * 0.8)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // Draw kept portion in green
    ctx.strokeStyle = "#16a34a"
    ctx.lineWidth = 2
    ctx.beginPath()
    let hasStarted = false
    for (let i = 0; i < samples.length; i++) {
      const x = (i / samples.length) * canvasWidth
      const y = centerY + (samples[i] / maxAmplitude) * (centerY * 0.8)

      if (x >= startX && x <= endX) {
        if (!hasStarted) {
          ctx.moveTo(x, y)
          hasStarted = true
        } else {
          ctx.lineTo(x, y)
        }
      }
    }
    ctx.stroke()

    // Draw handles
    const drawHandle = (x: number, label: string, isHovered: boolean, isDragging: boolean) => {
      // Handle line
      ctx.strokeStyle = "#dc2626"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()

      // Handle rectangle
      const currentWidth = isDragging ? handleWidth + 4 : isHovered ? handleWidth + 2 : handleWidth
      const currentHeight = isDragging ? handleHeight + 4 : isHovered ? handleHeight + 2 : handleHeight

      ctx.fillStyle = isDragging ? "#b91c1c" : isHovered ? "#dc2626" : "#ef4444"
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)"
      ctx.shadowBlur = isDragging ? 8 : isHovered ? 6 : 4
      ctx.shadowOffsetY = 2

      const handleX = x - currentWidth / 2
      const handleY = centerY - currentHeight / 2

      // Draw rounded rectangle
      ctx.beginPath()
      ctx.roundRect(handleX, handleY, currentWidth, currentHeight, 4)
      ctx.fill()

      // Handle border
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 2
      ctx.shadowColor = "transparent"
      ctx.stroke()

      // Handle label
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 10px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(label, x, centerY)

      // Reset shadow
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
    }

    // Draw trim handles
    drawHandle(startX, "S", hoveredHandle === "start", isDragging === "start")
    drawHandle(endX, "E", hoveredHandle === "end", isDragging === "end")

    // Draw playback line
    if (isPlaying && currentTime >= trimStart && currentTime <= trimEnd) {
      const relativeTime = currentTime - trimStart
      const relativeDuration = trimEnd - trimStart
      const relativeX = startX + (relativeTime / relativeDuration) * (endX - startX)

      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 3
      ctx.shadowColor = "rgba(59, 130, 246, 0.5)"
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(relativeX, 0)
      ctx.lineTo(relativeX, canvasHeight)
      ctx.stroke()

      // Playback indicator
      ctx.fillStyle = "#3b82f6"
      ctx.shadowColor = "rgba(59, 130, 246, 0.5)"
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(relativeX, 15, 6, 0, 2 * Math.PI)
      ctx.fill()

      // Reset shadow
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
    }

    // Update cursor
    if (isDragging) {
      canvas.style.cursor = "ew-resize"
    } else if (hoveredHandle) {
      canvas.style.cursor = "grab"
    } else {
      canvas.style.cursor = "default"
    }
  }, [waveformData, getPositions, hoveredHandle, isDragging, isPlaying, currentTime, trimStart, trimEnd])

  // Draw on mount and updates
  useEffect(() => {
    drawWaveform()
  }, [drawWaveform])

  return (
    <div className="space-y-4">
      {/* Waveform Canvas */}
      <div ref={containerRef} className="relative bg-white rounded-lg border-2 border-gray-200 p-4">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="w-full border rounded bg-gray-50 touch-none"
          style={{ maxWidth: "100%", touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp()
            setHoveredHandle(null)
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        />

        {/* Time markers */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>0s</span>
          <span>{(waveformData.duration / 4).toFixed(1)}s</span>
          <span>{(waveformData.duration / 2).toFixed(1)}s</span>
          <span>{((3 * waveformData.duration) / 4).toFixed(1)}s</span>
          <span>{waveformData.duration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Trim Information */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-2 bg-red-50 rounded border border-red-200">
          <div className="font-medium text-red-800">Start Time</div>
          <div className="text-red-600 font-mono">{trimStart.toFixed(2)}s</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded border border-green-200">
          <div className="font-medium text-green-800">Duration</div>
          <div className="text-green-600 font-mono">{(trimEnd - trimStart).toFixed(2)}s</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded border border-red-200">
          <div className="font-medium text-red-800">End Time</div>
          <div className="text-red-600 font-mono">{trimEnd.toFixed(2)}s</div>
        </div>
      </div>
    </div>
  )
}
