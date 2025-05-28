export interface WordData {
  id: string
  bangla: string
  english: string
}

export interface WaveformData {
  samples: number[]
  duration: number
  sampleRate: number
}

export interface TrimData {
  originalWaveform: WaveformData
  trimmedWaveform: WaveformData
  trimStart: number
  trimEnd: number
  originalAudioBuffer?: AudioBuffer
}

export interface StoredRecording {
  id: string
  wordId: string
  audioBlob: Blob
  timestamp: number
  trimData?: {
    originalWaveform: WaveformData
    trimmedWaveform: WaveformData
    trimStart: number
    trimEnd: number
  }
}

export interface KeyboardShortcut {
  id: string
  action: string
  description: string
  defaultKey: string
  currentKey: string
  category: "playback" | "recording" | "navigation" | "editing"
  contexts: string[]
}

export interface AppSettings {
  autoPlayEnabled: boolean
  autoPlayDelay: number
  autoTrimEnabled: boolean
  autoDownloadEnabled: boolean
  autoRecordNextEnabled: boolean
  autoRecordDelay: number
  keyboardShortcutsEnabled: boolean
  shortcuts: KeyboardShortcut[]
}
