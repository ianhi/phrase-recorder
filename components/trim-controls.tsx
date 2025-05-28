"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, Square, Volume2 } from "lucide-react"

interface TrimControlsProps {
  isPlaying: boolean
  currentTime: number
  trimStart: number
  trimEnd: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
}

export function TrimControls({
  isPlaying,
  currentTime,
  trimStart,
  trimEnd,
  onPlay,
  onPause,
  onStop,
}: TrimControlsProps) {
  const trimmedDuration = trimEnd - trimStart
  const playbackProgress = isPlaying ? ((currentTime - trimStart) / trimmedDuration) * 100 : 0

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          {/* Playback Controls */}
          <div className="flex items-center gap-3">
            <Button onClick={isPlaying ? onPause : onPlay} size="lg" className="bg-blue-600 hover:bg-blue-700">
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Play Trimmed
                </>
              )}
            </Button>

            <Button onClick={onStop} variant="outline" size="lg" disabled={!isPlaying}>
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </div>

          {/* Volume Indicator */}
          <div className="flex items-center gap-2 text-gray-600">
            <Volume2 className="w-5 h-5" />
            <span className="text-sm font-medium">Trimmed Audio Preview</span>
          </div>

          {/* Playback Info */}
          <div className="flex-1">
            {isPlaying ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600 font-medium">
                    Playing: {(currentTime - trimStart).toFixed(1)}s / {trimmedDuration.toFixed(1)}s
                  </span>
                  <span className="text-gray-500">{playbackProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${Math.max(0, Math.min(100, playbackProgress))}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                <div className="font-medium">Ready to play trimmed segment</div>
                <div>Duration: {trimmedDuration.toFixed(1)}s</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
