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
  relativeSilenceFraction: number; // Relative volume threshold for auto-trim (0.0 to 1.0)
  extraProcessingEnabled: boolean; // Whether to apply processing beyond basic trimming
  compressionEnabled: boolean; // Whether to apply dynamic range compression
  compressionThreshold: number; // Compression threshold (linear gain reduction, -1 to 0)
  compressionRatio: number; // Compression ratio (e.g., 2 for 2:1)
  compressionAttack: number; // Compression attack time (seconds)
  compressionRelease: number; // Compression release time (seconds)
  autoDownloadEnabled: boolean
  autoRecordNextEnabled: boolean
  autoRecordDelay: number
  keyboardShortcutsEnabled: boolean
  shortcuts: KeyboardShortcut[]
}
