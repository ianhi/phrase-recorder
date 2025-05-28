"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AudioStatsProps {
  audioBuffer: AudioBuffer
  originalDuration: number
  trimStart: number
  trimEnd: number
}

export function AudioStats({ audioBuffer, originalDuration, trimStart, trimEnd }: AudioStatsProps) {
  const trimmedDuration = trimEnd - trimStart
  const reductionPercentage = ((originalDuration - trimmedDuration) / originalDuration) * 100
  const keptPercentage = (trimmedDuration / originalDuration) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Original Duration */}
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{originalDuration.toFixed(1)}s</div>
            <div className="text-sm text-blue-800 font-medium">Original Duration</div>
          </div>

          {/* Trimmed Duration */}
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{trimmedDuration.toFixed(1)}s</div>
            <div className="text-sm text-green-800 font-medium">Trimmed Duration</div>
          </div>

          {/* Reduction */}
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">{reductionPercentage.toFixed(1)}%</div>
            <div className="text-sm text-red-800 font-medium">Reduction</div>
          </div>

          {/* Efficiency */}
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">{keptPercentage.toFixed(1)}%</div>
            <div className="text-sm text-purple-800 font-medium">Kept</div>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-800">Sample Rate</div>
            <div className="text-gray-600">{audioBuffer.sampleRate.toLocaleString()} Hz</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-800">Channels</div>
            <div className="text-gray-600">{audioBuffer.numberOfChannels}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="font-medium text-gray-800">Bit Depth</div>
            <div className="text-gray-600">32-bit Float</div>
          </div>
        </div>

        {/* Trim Points */}
        <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-green-50 rounded-lg border">
          <div className="text-sm font-medium text-gray-800 mb-2">Trim Points</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-red-600 font-medium">Start:</span> {trimStart.toFixed(3)}s
            </div>
            <div>
              <span className="text-green-600 font-medium">Duration:</span> {trimmedDuration.toFixed(3)}s
            </div>
            <div>
              <span className="text-red-600 font-medium">End:</span> {trimEnd.toFixed(3)}s
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
