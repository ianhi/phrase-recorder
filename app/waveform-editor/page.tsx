"use client"

import type React from "react"

import { useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ArrowLeft, Download, RotateCcw } from "lucide-react"
import { SimpleWaveformTrimmer } from "@/components/simple-waveform-trimmer"
import { AudioUploader } from "@/components/audio-uploader"
import { TrimControls } from "@/components/trim-controls"
import { AudioStats } from "@/components/audio-stats"
import { useAudioProcessor } from "@/hooks/use-audio-processor"
import Link from "next/link"

export default function WaveformEditorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    audioFile,
    audioUrl,
    audioBuffer,
    waveformData,
    trimStart,
    trimEnd,
    isLoading,
    isPlaying,
    currentTime,
    error,
    loadAudioFile,
    setTrimPoints,
    playTrimmedAudio,
    pauseAudio,
    stopAudio,
    resetTrim,
    downloadTrimmedAudio,
  } = useAudioProcessor()

  const handleFileSelect = useCallback(
    (file: File) => {
      loadAudioFile(file)
    },
    [loadAudioFile],
  )

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleTrimChange = useCallback(
    (start: number, end: number) => {
      setTrimPoints(start, end)
    },
    [setTrimPoints],
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Recorder
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Advanced Waveform Editor</h1>
              <p className="text-gray-600">Precise audio trimming with interactive handles</p>
            </div>
          </div>

          {audioFile && (
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Load New Audio
            </Button>
          )}
        </div>

        {/* Main Content */}
        {!audioFile ? (
          /* Upload Interface */
          <AudioUploader onFileSelect={handleFileSelect} />
        ) : (
          /* Editor Interface */
          <div className="space-y-6">
            {/* Audio Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Audio File: {audioFile.name}</span>
                  <div className="flex gap-2">
                    <Button onClick={resetTrim} variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                    <Button onClick={downloadTrimmedAudio} variant="outline" size="sm" disabled={!audioBuffer}>
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>Use the handles below to select the audio segment you want to keep</CardDescription>
              </CardHeader>
            </Card>

            {/* Loading State */}
            {isLoading && (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Processing audio file...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="text-red-800">
                    <h3 className="font-semibold mb-2">Error Loading Audio</h3>
                    <p>{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Waveform Editor */}
            {audioBuffer && waveformData && !isLoading && (
              <>
                {/* Playback Controls */}
                <TrimControls
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                  onPlay={playTrimmedAudio}
                  onPause={pauseAudio}
                  onStop={stopAudio}
                />

                {/* Main Waveform Editor */}
                <Card>
                  <CardHeader>
                    <CardTitle>Waveform Trimmer</CardTitle>
                    <CardDescription>
                      Drag the red handles to select the audio segment you want to keep. The green area shows what will
                      be preserved.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SimpleWaveformTrimmer
                      waveformData={waveformData}
                      trimStart={trimStart}
                      trimEnd={trimEnd}
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      onTrimChange={handleTrimChange}
                    />
                  </CardContent>
                </Card>

                {/* Audio Statistics */}
                <AudioStats
                  audioBuffer={audioBuffer}
                  originalDuration={waveformData.duration}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                />
              </>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
      </div>
    </div>
  )
}
