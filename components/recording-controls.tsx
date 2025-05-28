"use client"

import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause, Download, SkipForward, Scissors } from "lucide-react"

interface RecordingControlsProps {
  isRecording: boolean
  isTrimming: boolean
  hasAudio: boolean
  isPlaying: boolean
  isProcessed: boolean
  autoDownloadEnabled: boolean
  autoRecordDelay: number // Add this prop
  onStartRecording: () => void
  onStopRecording: () => void
  onTogglePlayback: () => void
  onSaveAudio: () => void
  onReRecord: () => void
  onSkipWord: () => void
  onResetAutoplayState?: () => void
}

export function RecordingControls({
  isRecording,
  isTrimming,
  hasAudio,
  isPlaying,
  isProcessed,
  autoDownloadEnabled,
  autoRecordDelay, // Add this
  onStartRecording,
  onStopRecording,
  onTogglePlayback,
  onSaveAudio,
  onReRecord,
  onSkipWord,
  onResetAutoplayState,
}: RecordingControlsProps) {
  // Determine if we're in a processing state (recording just stopped but not yet processed)
  const isProcessing = hasAudio && !isProcessed && !isRecording

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Fixed height container for primary action buttons - positions swap based on mode */}
      <div className="w-full min-h-[60px] flex items-center justify-center">
        {/* Recording Mode: Show Record/Stop buttons in primary position */}
        {(isRecording || (!hasAudio && !isTrimming && !isProcessing)) && (
          <>
            {!isRecording && !isTrimming && !isProcessing && (
              <Button onClick={onStartRecording} size="lg" className="w-full bg-red-500 hover:bg-red-600">
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button onClick={onStopRecording} size="lg" variant="destructive" className="w-full animate-pulse">
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </Button>
            )}
          </>
        )}

        {/* Review Mode: Show Save & Re-record buttons in primary position */}
        {hasAudio && !isRecording && !isTrimming && !isProcessing && isProcessed && (
          <div className="flex gap-2 w-full">
            <Button onClick={onSaveAudio} size="lg" className="flex-1 bg-green-500 hover:bg-green-600">
              <Download className="w-4 h-4 mr-2" />
              {autoDownloadEnabled ? "Save & Next" : "Store & Next"}
            </Button>

            <Button
              onClick={() => {
                onReRecord()
                onResetAutoplayState?.()
                setTimeout(() => {
                  onStartRecording()
                }, autoRecordDelay)
              }}
              size="lg"
              variant="outline"
              className="flex-1"
            >
              Re-record
            </Button>
          </div>
        )}

        {/* Processing State: Show processing indicator */}
        {(isTrimming || isProcessing) && (
          <Button disabled size="lg" className="w-full">
            <Scissors className="w-5 h-5 mr-2 animate-spin" />
            {isTrimming ? "Trimming Audio..." : "Processing Audio..."}
          </Button>
        )}
      </div>

      {/* Fixed height container for secondary controls */}
      <div className="w-full min-h-[60px] flex items-center justify-center">
        {/* Recording Mode: Show Skip button in secondary position */}
        {(isRecording || (!hasAudio && !isTrimming && !isProcessing)) && (
          <Button onClick={onSkipWord} variant="ghost" size="lg" className="w-full">
            <SkipForward className="w-4 h-4 mr-2" />
            Skip to Next Word
          </Button>
        )}

        {/* Review Mode: Show playback controls in secondary position */}
        {hasAudio && !isRecording && !isTrimming && !isProcessing && isProcessed && (
          <Button onClick={onTogglePlayback} variant="outline" size="lg" className="w-full">
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 mr-2" />
                Pause Recording
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Play Recording
              </>
            )}
          </Button>
        )}

        {/* Processing State: Show empty space to maintain layout */}
        {(isTrimming || isProcessing) && <div className="w-full h-[44px]" />}
      </div>
    </div>
  )
}
