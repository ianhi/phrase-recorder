"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Circle, Trash2, X } from "lucide-react"
import type { WordData } from "@/types"

interface ProgressModalProps {
  isOpen: boolean
  wordList: WordData[]
  recordedWords: Set<string>
  onClose: () => void
  onResetProgress: () => void
  onMarkAsUnrecorded: (wordId: string) => void
}

export function ProgressModal({
  isOpen,
  wordList,
  recordedWords,
  onClose,
  onResetProgress,
  onMarkAsUnrecorded,
}: ProgressModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Progress Tracking
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            {recordedWords.size} of {wordList.length} words recorded (
            {Math.round((recordedWords.size / wordList.length) * 100)}%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(recordedWords.size / wordList.length) * 100}%` }}
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {wordList.map((word) => (
              <div key={word.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{word.bangla}</div>
                  <div className="text-xs text-gray-500 truncate">{word.english}</div>
                </div>
                <div className="flex items-center gap-2">
                  {recordedWords.has(word.id) ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <Button variant="ghost" size="sm" onClick={() => onMarkAsUnrecorded(word.id)} className="text-xs">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onResetProgress} className="flex-1">
              Reset Progress
            </Button>
            <Button onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
