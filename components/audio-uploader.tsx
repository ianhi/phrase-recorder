"use client"

import type React from "react"

import { useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Music } from "lucide-react"

interface AudioUploaderProps {
  onFileSelect: (file: File) => void
}

export function AudioUploader({ onFileSelect }: AudioUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith("audio/")) {
      onFileSelect(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  return (
    <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
      <CardContent className="p-12">
        <div className="text-center space-y-6" onDrop={handleDrop} onDragOver={handleDragOver}>
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Music className="w-8 h-8 text-blue-600" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">Upload Audio File</h3>
            <p className="text-gray-600">Drag and drop an audio file here, or click to browse</p>
          </div>

          <div className="space-y-4">
            <Button onClick={() => fileInputRef.current?.click()} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Upload className="w-5 h-5 mr-2" />
              Choose Audio File
            </Button>

            <div className="text-sm text-gray-500">Supported formats: MP3, WAV, M4A, OGG, FLAC</div>
          </div>

          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
        </div>
      </CardContent>
    </Card>
  )
}
