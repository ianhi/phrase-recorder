"use client"

import type React from "react"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Upload } from "lucide-react"

interface UploadInterfaceProps {
  onLoadDemo: () => void
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function UploadInterface({ onLoadDemo, onFileUpload }: UploadInterfaceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">Bangla Voice Recorder</CardTitle>
          <CardDescription>Upload your word list or try the demo</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Try the Demo</h3>
              <p className="text-sm text-blue-600 mb-3">
                Start with 15 common Bangla words and phrases to test the app
              </p>
              <Button onClick={onLoadDemo} className="w-full bg-blue-500 hover:bg-blue-600">
                <Play className="w-4 h-4 mr-2" />
                Start Demo
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or upload your own</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label htmlFor="csv-upload" className="text-sm font-medium">
              Upload CSV File
            </Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={onFileUpload}
              ref={fileInputRef}
              className="cursor-pointer"
            />
            <div className="text-xs text-gray-500 space-y-2">
              <p>
                <strong>CSV Format:</strong>
              </p>
              <div className="bg-gray-100 p-2 rounded text-xs font-mono">
                id,bangla,english
                <br />
                bn_001,আমি ভালো আছি,I am fine
                <br />
                bn_002,ধন্যবাদ,Thank you
              </div>
            </div>

            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Choose CSV File
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
