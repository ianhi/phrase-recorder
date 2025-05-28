import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"
import type { WordData } from "@/types"

interface WordDisplayProps {
  word: WordData
  isRecorded: boolean
}

export function WordDisplay({ word, isRecorded }: WordDisplayProps) {
  return (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Badge variant="secondary" className="text-xs">
          ID: {word.id}
        </Badge>
        {isRecorded && (
          <Badge variant="default" className="text-xs bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Recorded
          </Badge>
        )}
      </div>

      {/* Fixed height container for word display - prevents layout shifts */}
      <div className="p-6 bg-white rounded-lg border-2 border-blue-200 min-h-[140px] flex flex-col justify-center">
        {/* Bangla text with responsive sizing and line height */}
        <div
          className="font-bold text-gray-800 mb-3 leading-tight break-words hyphens-auto"
          style={{
            fontFamily: "serif",
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            lineHeight: "1.2",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {word.bangla}
        </div>

        {/* English translation with responsive sizing */}
        <div
          className="text-gray-600 leading-relaxed break-words"
          style={{
            fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)",
            lineHeight: "1.4",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {word.english}
        </div>
      </div>
    </div>
  )
}
