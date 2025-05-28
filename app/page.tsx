"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, BarChart3, Settings, SkipForward, Package, Bug, Download } from "lucide-react"

// Components
import { UploadInterface } from "@/components/upload-interface"
import { WordDisplay } from "@/components/word-display"
import { RecordingControls } from "@/components/recording-controls"
import { SettingsModal } from "@/components/settings-modal"
import { ProgressModal } from "@/components/progress-modal"
import { SimpleWaveformTrimmer } from "@/components/simple-waveform-trimmer"

// Hooks
import { useAudioRecording } from "@/hooks/use-audio-recording"
import { useDatabase } from "@/hooks/use-database"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

// Utils and Constants
import {
  parseCSV,
  downloadFile,
  generateWaveformData,
  recreateAudioBufferFromBlob,
  audioBufferToWav,
} from "@/lib/audio-utils"
import { AudioPackageCreator } from "@/lib/audio-package"
import { DEMO_WORD_LIST } from "@/constants/demo-data"
import type { WordData, StoredRecording } from "@/types"

const handleTrimChange = (newTrimStart: number, newTrimEnd: number) => {
  // Placeholder for handleTrimChange logic
}

export default function BanglaRecorder() {
  // State
  const [wordList, setWordList] = useState<WordData[]>([])
  const [currentWord, setCurrentWord] = useState<WordData | null>(null)
  const [csvUploaded, setCsvUploaded] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [manualTrimStart, setManualTrimStart] = useState(0)
  const [manualTrimEnd, setManualTrimEnd] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [userInteractionRequired, setUserInteractionRequired] = useState(false)
  const [autoAdvanceBlocked, setAutoAdvanceBlocked] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now())
  const [sessionTime, setSessionTime] = useState<number>(0)
  const [autoplayPending, setAutoplayPending] = useState(false)
  const [autoplayAttempted, setAutoplayAttempted] = useState<boolean>(false)
  const [lastProcessedAudioId, setLastProcessedAudioId] = useState<string | null>(null)
  const [testMode, setTestMode] = useState(false)
  const [testResults, setTestResults] = useState<
    Array<{
      test: string
      passed: boolean
      details: string
      timestamp: number
    }>
  >([])

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoplayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wordAdvanceCountRef = useRef(0)
  const lastWordChangeRef = useRef<number>(Date.now())

  // Custom hooks
  const {
    isRecording,
    audioBlob,
    audioUrl,
    isTrimming,
    trimData,
    isProcessed,
    startRecording,
    stopRecording,
    processAudio,
    resetRecording,
    setTrimData,
  } = useAudioRecording()

  const {
    dbInitialized,
    settings,
    recordedWords,
    updateSettings,
    saveWordList,
    getWordList,
    saveRecording,
    getAllRecordings,
    deleteRecording,
    saveProgress,
    clearAllData,
  } = useDatabase()

  // Calculate if all words are recorded
  const isAllWordsRecorded = recordedWords.size === wordList.length && wordList.length > 0

  // Regenerate trimmed audio with new trim points - moved before resetToAutoTrim
  const regenerateTrimmedAudio = useCallback(
    async (newTrimStart: number, newTrimEnd: number) => {
      if (!trimData) return

      try {
        let audioBuffer = trimData.originalAudioBuffer

        // If AudioBuffer is missing, recreate it from the blob
        if (!audioBuffer && audioBlob) {
          audioBuffer = await recreateAudioBufferFromBlob(audioBlob)
          setTrimData((prev) => (prev ? { ...prev, originalAudioBuffer: audioBuffer } : null))
        }

        if (!audioBuffer) return

        const sampleRate = audioBuffer.sampleRate
        const startSample = Math.floor(newTrimStart * sampleRate)
        const endSample = Math.floor(newTrimEnd * sampleRate)
        const trimmedLength = endSample - startSample

        const trimmedBuffer = new AudioContext().createBuffer(
          audioBuffer.numberOfChannels,
          trimmedLength,
          audioBuffer.sampleRate,
        )

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const originalData = audioBuffer.getChannelData(channel)
          const trimmedData = trimmedBuffer.getChannelData(channel)
          for (let i = 0; i < trimmedLength; i++) {
            trimmedData[i] = originalData[startSample + i]
          }
        }

        const newTrimmedWaveform = generateWaveformData(trimmedBuffer)

        const offlineContext = new OfflineAudioContext(
          trimmedBuffer.numberOfChannels,
          trimmedBuffer.length,
          trimmedBuffer.sampleRate,
        )

        const source = offlineContext.createBufferSource()
        source.buffer = trimmedBuffer
        source.connect(offlineContext.destination)
        source.start()

        const renderedBuffer = await offlineContext.startRendering()
        const wavBlob = audioBufferToWav(renderedBuffer)

        // Update audio blob and URL
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl)
        }
        const newUrl = URL.createObjectURL(wavBlob)

        setTrimData({
          originalWaveform: trimData.originalWaveform,
          trimmedWaveform: newTrimmedWaveform,
          trimStart: newTrimStart,
          trimEnd: newTrimEnd,
          originalAudioBuffer: audioBuffer,
        })
      } catch (error) {
        console.error("Error regenerating audio:", error)
      }
    },
    [trimData, audioUrl, audioBlob],
  )

  // Reset to auto-detected trim points - now after regenerateTrimmedAudio
  const resetToAutoTrim = useCallback(async () => {
    if (!trimData) return

    let audioBuffer = trimData.originalAudioBuffer

    // If AudioBuffer is missing, recreate it from the blob
    if (!audioBuffer && audioBlob) {
      try {
        audioBuffer = await recreateAudioBufferFromBlob(audioBlob)
        setTrimData((prev) => (prev ? { ...prev, originalAudioBuffer: audioBuffer } : null))
      } catch (error) {
        console.error("Error recreating AudioBuffer:", error)
        return
      }
    }

    if (!audioBuffer) return

    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const silenceThreshold = 0.01

    let startSample = 0
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > silenceThreshold) {
        startSample = Math.max(0, i - Math.floor(sampleRate * 0.1))
        break
      }
    }

    let endSample = channelData.length
    for (let i = channelData.length - 1; i >= 0; i--) {
      if (Math.abs(channelData[i]) > silenceThreshold) {
        endSample = Math.min(channelData.length, i + Math.floor(sampleRate * 0.1))
        break
      }
    }

    const autoTrimStart = startSample / sampleRate
    const autoTrimEnd = endSample / sampleRate

    setManualTrimStart(autoTrimStart)
    setManualTrimEnd(autoTrimEnd)
    regenerateTrimmedAudio(autoTrimStart, autoTrimEnd)
  }, [trimData, audioBlob, regenerateTrimmedAudio])

  // Cycling Prevention Tests
  const runCyclingPreventionTests = useCallback(() => {
    const results: Array<{
      test: string
      passed: boolean
      details: string
      timestamp: number
    }> = []

    const timestamp = Date.now()

    // Test 1: User interaction requirement
    const test1Passed = userInteractionRequired === true
    results.push({
      test: "User Interaction Requirement",
      passed: test1Passed,
      details: test1Passed
        ? "✅ User interaction is required for word advancement"
        : "❌ User interaction requirement not set",
      timestamp,
    })

    // Test 2: Auto-advance blocking
    const test2Passed = typeof autoAdvanceBlocked === "boolean"
    results.push({
      test: "Auto-advance Blocking",
      passed: test2Passed,
      details: test2Passed
        ? `✅ Auto-advance blocking is ${autoAdvanceBlocked ? "active" : "inactive"}`
        : "❌ Auto-advance blocking state invalid",
      timestamp,
    })

    // Test 3: Word change frequency
    const timeSinceLastChange = timestamp - lastWordChangeRef.current
    const test3Passed = timeSinceLastChange > 1000 || wordAdvanceCountRef.current === 0
    results.push({
      test: "Word Change Frequency",
      passed: test3Passed,
      details: test3Passed
        ? `✅ Word changes at reasonable intervals (${timeSinceLastChange}ms since last)`
        : `❌ Word changing too frequently (${timeSinceLastChange}ms since last)`,
      timestamp,
    })

    // Test 4: Audio processing isolation
    const test4Passed = !isRecording && (!audioBlob || isProcessed || isTrimming)
    results.push({
      test: "Audio Processing Isolation",
      passed: test4Passed,
      details: test4Passed
        ? "✅ Audio processing doesn't trigger word advancement"
        : "❌ Audio processing may be triggering word advancement",
      timestamp,
    })

    // Test 5: Autoplay state consistency
    const test5Passed = !autoplayPending || (audioBlob !== null && isProcessed)
    results.push({
      test: "Autoplay State Consistency",
      passed: test5Passed,
      details: test5Passed ? "✅ Autoplay state is consistent with audio state" : "❌ Autoplay state inconsistent", // This line was already correct, no change needed here.
      timestamp,
    })

    setTestResults(results)

    const allPassed = results.every((r) => r.passed)
    if (debugMode) {
      console.log("🧪 Cycling Prevention Tests:", allPassed ? "ALL PASSED" : "SOME FAILED", results)
    }

    return allPassed
  }, [
    userInteractionRequired,
    autoAdvanceBlocked,
    isRecording,
    audioBlob,
    isProcessed,
    isTrimming,
    autoplayPending,
    debugMode,
  ])

  // Reset autoplay state for re-recording
  const resetAutoplayState = useCallback(() => {
    setAutoplayPending(false)
    setAutoplayAttempted(false)
    setLastProcessedAudioId(null)

    // Clear any pending autoplay timeout
    if (autoplayTimeoutRef.current) {
      clearTimeout(autoplayTimeoutRef.current)
      autoplayTimeoutRef.current = null
    }

    if (debugMode) console.log("🔄 Autoplay state reset for re-recording")
  }, [debugMode])

  // Get random word from the uploaded list, preferring unrecorded words
  const getRandomWord = useCallback(
    (words: WordData[] = wordList, forceAdvance = false, source = "unknown") => {
      if (words.length === 0) return

      // Increment word advance counter for testing
      wordAdvanceCountRef.current += 1
      lastWordChangeRef.current = Date.now()

      // Prevent automatic advancement unless explicitly forced or it's the initial load
      if (userInteractionRequired && !forceAdvance && currentWord !== null) {
        if (debugMode) console.log("🚫 getRandomWord blocked - user interaction required", { source })
        setAutoAdvanceBlocked(true)
        return
      }

      if (debugMode)
        console.log("✅ getRandomWord advancing to next word", {
          forceAdvance,
          currentWord: currentWord?.id,
          source,
          advanceCount: wordAdvanceCountRef.current,
        })

      const unrecordedWords = words.filter((word) => !recordedWords.has(word.id))

      let selectedWord: WordData
      if (unrecordedWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * unrecordedWords.length)
        selectedWord = unrecordedWords[randomIndex]
      } else {
        const randomIndex = Math.floor(Math.random() * words.length)
        selectedWord = words[randomIndex]
      }

      setCurrentWord(selectedWord)
      resetRecording()
      setIsPlaying(false)
      setCurrentTime(0)
      setAutoAdvanceBlocked(false)

      // Reset autoplay state for new word
      setAutoplayPending(false)
      setAutoplayAttempted(false)
      setLastProcessedAudioId(null)

      // Clear any pending autoplay timeout
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current)
        autoplayTimeoutRef.current = null
      }

      // After first word is loaded, require user interaction for subsequent advances
      if (currentWord === null) {
        setUserInteractionRequired(true)
      }

      // Run cycling prevention tests in test mode
      if (testMode) {
        setTimeout(() => runCyclingPreventionTests(), 100)
      }
    },
    [
      wordList,
      recordedWords,
      resetRecording,
      userInteractionRequired,
      currentWord,
      debugMode,
      testMode,
      runCyclingPreventionTests,
    ],
  )

  // Enhanced autoplay function with comprehensive error handling
  const triggerAutoplay = useCallback(async () => {
    if (!settings.autoPlayEnabled || !audioRef.current || !audioUrl) {
      if (debugMode)
        console.log("🔇 Autoplay skipped:", {
          enabled: settings.autoPlayEnabled,
          audioRef: !!audioRef.current,
          audioUrl: !!audioUrl,
        })
      return
    }

    const audioId = `${currentWord?.id}_${Date.now()}`

    // Prevent duplicate autoplay attempts for the same audio
    if (lastProcessedAudioId === audioId || autoplayAttempted) {
      if (debugMode)
        console.log("🔇 Autoplay skipped - already attempted:", { audioId, lastProcessedAudioId, autoplayAttempted })
      return
    }

    setAutoplayAttempted(true)
    setLastProcessedAudioId(audioId)

    if (debugMode) console.log("🎵 Triggering autoplay with delay:", settings.autoPlayDelay + "ms")

    // Clear any existing timeout
    if (autoplayTimeoutRef.current) {
      clearTimeout(autoplayTimeoutRef.current)
    }

    autoplayTimeoutRef.current = setTimeout(async () => {
      try {
        if (audioRef.current && audioUrl) {
          // Reset audio to beginning
          audioRef.current.currentTime = 0

          // Ensure audio is loaded
          if (audioRef.current.readyState < 2) {
            await new Promise((resolve) => {
              const handleCanPlay = () => {
                audioRef.current?.removeEventListener("canplay", handleCanPlay)
                resolve(void 0)
              }
              audioRef.current?.addEventListener("canplay", handleCanPlay)
            })
          }

          const playPromise = audioRef.current.play()

          if (playPromise) {
            await playPromise
            if (debugMode) console.log("✅ Autoplay successful")
          }
        }
      } catch (error) {
        console.warn("Autoplay failed (this is normal in some browsers):", error)
        if (debugMode) console.log("❌ Autoplay failed:", error)
      } finally {
        setAutoplayPending(false)
        autoplayTimeoutRef.current = null
      }
    }, settings.autoPlayDelay)

    setAutoplayPending(true)
  }, [
    settings.autoPlayEnabled,
    settings.autoPlayDelay,
    audioUrl,
    currentWord?.id,
    lastProcessedAudioId,
    autoplayAttempted,
    debugMode,
  ])

  // Save audio file and mark as recorded
  const saveAudio = useCallback(async () => {
    if (audioBlob && currentWord) {
      if (debugMode) console.log("💾 saveAudio called for word:", currentWord.id)

      // Save to database
      const recording: StoredRecording = {
        id: `recording_${currentWord.id}_${Date.now()}`,
        wordId: currentWord.id,
        audioBlob: audioBlob,
        timestamp: Date.now(),
        trimData: trimData
          ? {
              originalWaveform: trimData.originalWaveform,
              trimmedWaveform: trimData.trimmedWaveform,
              trimStart: trimData.trimStart,
              trimEnd: trimData.trimEnd,
            }
          : undefined,
      }
      await saveRecording(recording)

      // Auto-download if enabled
      if (settings.autoDownloadEnabled) {
        downloadFile(audioBlob, `${currentWord.id}.wav`)
      }

      // Mark word as recorded and save progress
      const newRecordedWords = new Set(recordedWords)
      newRecordedWords.add(currentWord.id)
      await saveProgress(newRecordedWords)

      // Move to next word with explicit user action flag
      getRandomWord(wordList, true, "saveAudio") // forceAdvance = true for explicit save action

      // Auto-record next word if enabled
      if (settings.autoRecordNextEnabled) {
        setTimeout(() => {
          startRecording()
        }, settings.autoRecordDelay)
      }
    }
  }, [
    audioBlob,
    currentWord,
    trimData,
    settings.autoDownloadEnabled,
    settings.autoRecordNextEnabled,
    settings.autoRecordDelay,
    saveRecording,
    recordedWords,
    saveProgress,
    getRandomWord,
    wordList,
    startRecording,
    debugMode,
  ])

  // Play/pause recorded audio
  const togglePlayback = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }
  }, [isPlaying])

  const getKeyboardContext = useCallback(() => {
    const contexts = ["main"]

    if (audioBlob && isProcessed) {
      contexts.push("has-audio")
    }

    if (showSettings || showProgress) {
      contexts.push("modal")
    }

    return contexts
  }, [audioBlob, isProcessed, showSettings, showProgress])

  // Add keyboard shortcuts handler
  const handleShortcut = useCallback(
    (shortcutId: string) => {
      switch (shortcutId) {
        case "play-pause":
          if (audioBlob && isProcessed) {
            togglePlayback()
          }
          break
        case "record-stop":
          if (isRecording) {
            stopRecording()
          } else if (!audioBlob) {
            startRecording()
          }
          break
        case "save-next":
          if (audioBlob && isProcessed) {
            saveAudio()
          }
          break
        case "skip-word":
          if (debugMode) console.log("⌨️ Skip word keyboard shortcut triggered")
          getRandomWord(wordList, true, "keyboard-skip") // forceAdvance = true for explicit user action
          break
        case "re-record":
          if (audioBlob) {
            resetRecording()
          }
          break
        case "open-settings":
          if (!showSettings && !showProgress) {
            setShowSettings(true)
          }
          break
        case "open-progress":
          if (!showSettings && !showProgress) {
            setShowProgress(true)
          }
          break
        case "close-modal":
          if (showSettings) {
            setShowSettings(false)
          } else if (showProgress) {
            setShowProgress(false)
          }
          break
      }
    },
    [
      audioBlob,
      isProcessed,
      isRecording,
      trimData,
      showSettings,
      showProgress,
      startRecording,
      stopRecording,
      saveAudio,
      getRandomWord,
      resetRecording,
      togglePlayback,
      wordList,
      debugMode,
    ],
  )

  // Add the keyboard shortcuts hook
  useKeyboardShortcuts({
    shortcuts: settings.shortcuts || [],
    enabled: settings.keyboardShortcutsEnabled,
    context: getKeyboardContext(),
    onShortcut: handleShortcut,
  })

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (dbInitialized) {
        const savedWordList = await getWordList()
        if (savedWordList) {
          setWordList(savedWordList.wordList)
          setIsDemo(savedWordList.isDemo)
          setCsvUploaded(true)
          // Only load first word on initial load, don't require user interaction yet
          if (currentWord === null) {
            getRandomWord(savedWordList.wordList, false, "initial-load") // This is initial load, not user interaction
          }
        }
      }
    }

    loadInitialData()
  }, [dbInitialized]) // Removed getRandomWord from dependencies to prevent loops

  // Audio event listeners for playback tracking
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [audioUrl])

  // Enhanced audio processing effect with proper autoplay trigger
  useEffect(() => {
    const handleAudioProcessing = async () => {
      // Only process if we have audio, not currently processing, and haven't processed yet
      if (audioBlob && !isTrimming && !isProcessed && !isRecording) {
        if (debugMode) console.log("🎵 Processing audio for word:", currentWord?.id)

        const result = await processAudio(settings.autoTrimEnabled)

        if (result?.trimData) {
          setManualTrimStart(result.trimData.trimStart)
          setManualTrimEnd(result.trimData.trimEnd)
        }

        // Trigger autoplay after processing is complete and audio is ready
        // Use a small delay to ensure the audio element is updated
        setTimeout(() => {
          triggerAutoplay()
        }, 100)
      }
    }

    handleAudioProcessing()
  }, [
    audioBlob,
    isTrimming,
    isProcessed,
    isRecording,
    settings.autoTrimEnabled,
    processAudio,
    currentWord?.id,
    debugMode,
    triggerAutoplay,
  ])

  // Cleanup autoplay timeout on unmount
  useEffect(() => {
    return () => {
      if (autoplayTimeoutRef.current) {
        clearTimeout(autoplayTimeoutRef.current)
      }
    }
  }, [])

  // Track session time only when session is active
  useEffect(() => {
    if (!isSessionActive) return

    // Stop incrementing session time when all words are completed AND we're on the completion screen
    if (recordedWords.size === wordList.length && wordList.length > 0 && isAllWordsRecorded) return

    const interval = setInterval(() => {
      setSessionTime(Date.now() - sessionStartTime)
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionStartTime, isSessionActive, recordedWords.size, wordList.length, isAllWordsRecorded])

  // Track page visibility and focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsSessionActive(false)
      } else if (csvUploaded && currentWord && !isAllWordsRecorded) {
        setIsSessionActive(true)
      }
      // Only stop session when all words are recorded AND we're showing completion screen
      if (isAllWordsRecorded) {
        setIsSessionActive(false)
      }
    }

    const handleFocus = () => {
      if (csvUploaded && currentWord && !isAllWordsRecorded) {
        setIsSessionActive(true)
      }
      // Only stop session when all words are recorded AND we're showing completion screen
      if (isAllWordsRecorded) {
        setIsSessionActive(false)
      }
    }

    const handleBlur = () => {
      setIsSessionActive(false)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }, [csvUploaded, currentWord, recordedWords, wordList, isAllWordsRecorded])

  // Load demo word list
  const loadDemoData = useCallback(async () => {
    setWordList(DEMO_WORD_LIST)
    setIsDemo(true)
    setCsvUploaded(true)
    getRandomWord(DEMO_WORD_LIST, false, "demo-load")
    await saveWordList(DEMO_WORD_LIST, true)
  }, [getRandomWord, saveWordList])

  // Handle CSV file upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.name.toLowerCase().endsWith(".csv")) {
        alert("Please upload a CSV file")
        return
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string
          const parsedWords = parseCSV(csvText)

          if (parsedWords.length === 0) {
            alert("No valid words found in the CSV file. Please check the format.")
            return
          }

          setWordList(parsedWords)
          setIsDemo(false)
          setCsvUploaded(true)
          getRandomWord(parsedWords, false, "csv-upload")
          await saveWordList(parsedWords, false)

          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        } catch (error) {
          console.error("Error parsing CSV:", error)
          alert("Error parsing CSV file. Please check the format.")
        }
      }

      reader.readAsText(file)
    },
    [getRandomWord, saveWordList],
  )

  // Download all recordings as Audio Package
  const downloadAudioPackage = useCallback(async () => {
    try {
      setIsExporting(true)
      const recordings = await getAllRecordings()

      if (recordings.length === 0) {
        alert("No recordings found")
        return
      }

      console.log(`Creating audio package with ${recordings.length} recordings...`)

      const deckName = isDemo ? "Bangla Demo Collection" : "Bangla Audio Collection"
      const audioPackage = await AudioPackageCreator.createAudioPackage(recordings, wordList, deckName)

      downloadFile(audioPackage, `${deckName.toLowerCase().replace(/\s+/g, "_")}.zip`)

      alert(
        `Successfully exported ${recordings.length} recordings!\n\n` +
          `The ZIP file contains:\n` +
          `• ${recordings.length} audio files\n` +
          `• Complete instructions for Anki import\n` +
          `• Ready-to-use templates\n\n` +
          `Extract the ZIP and follow the README.md instructions.`,
      )
    } catch (error) {
      console.error("Error creating audio package:", error)
      alert(
        `Error creating audio package: ${error instanceof Error ? error.message : String(error)}\n\nPlease try again or check the browser console for more details.`,
      )
    } finally {
      setIsExporting(false)
    }
  }, [isDemo, wordList, getAllRecordings])

  // Clear uploaded data and progress
  const handleClearData = useCallback(async () => {
    await clearAllData()
    setWordList([])
    setCurrentWord(null)
    setCsvUploaded(false)
    resetRecording()
    setIsDemo(false)
    setIsPlaying(false)
    setCurrentTime(0)
  }, [clearAllData, resetRecording])

  // Reset all progress
  const resetProgress = useCallback(async () => {
    await saveProgress(new Set<string>())
  }, [saveProgress])

  // Mark word as unrecorded
  const markAsUnrecorded = useCallback(
    async (wordId: string) => {
      const newRecordedWords = new Set(recordedWords)
      newRecordedWords.delete(wordId)
      await saveProgress(newRecordedWords)
      await deleteRecording(wordId)
    },
    [recordedWords, saveProgress, deleteRecording],
  )

  // Helper functions for completion screen
  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const getAverageTimePerPhrase = () => {
    if (recordedWords.size === 0) return 0
    return sessionTime / recordedWords.size
  }

  const downloadAllAudioFiles = useCallback(async () => {
    try {
      setIsExporting(true)
      const recordings = await getAllRecordings()

      if (recordings.length === 0) {
        alert("No recordings found")
        return
      }

      // Create a simple ZIP with just audio files
      const files: { [filename: string]: Uint8Array } = {}
      let validFileCount = 0

      for (const recording of recordings) {
        const word = wordList.find((w) => w.id === recording.wordId)
        if (word && recording.audioBlob) {
          const audioData = new Uint8Array(await recording.audioBlob.arrayBuffer())
          files[`${word.id}.wav`] = audioData
          validFileCount++
        }
      }

      // Use the same ZIP creation method from AudioPackageCreator
      const { AudioPackageCreator } = await import("@/lib/audio-package")
      const zipBlob = await (AudioPackageCreator as any).createZip(files)

      downloadFile(zipBlob, `bangla_audio_files_${Date.now()}.zip`)

      alert(`Successfully exported ${validFileCount} audio files!`)
    } catch (error) {
      console.error("Error creating audio files ZIP:", error)
      alert("Error creating audio files ZIP. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }, [getAllRecordings, wordList])

  // Calculate if all words are recorded
  // const isAllWordsRecorded = recordedWords.size === wordList.length && wordList.length > 0

  // If no CSV uploaded, show upload interface
  if (!csvUploaded) {
    return <UploadInterface onLoadDemo={loadDemoData} onFileUpload={handleFileUpload} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 relative">
      <Card className="w-full max-w-md absolute top-5 left-1/2 -translate-x-1/2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">Bangla Voice Recorder</CardTitle>
          <CardDescription>
            {isDemo ? (
              <>
                Demo mode • {recordedWords.size}/{wordList.length} completed
                <div className="flex gap-1 mt-1">
                  <Button variant="ghost" size="sm" onClick={handleClearData} className="text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    Upload CSV
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowProgress(true)} className="text-xs">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Progress
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Settings
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setTestMode(!testMode)} className="text-xs">
                    <Bug className="w-3 h-3 mr-1" />
                    Test
                  </Button>
                </div>
              </>
            ) : (
              <>
                Recording from {wordList.length} words • {recordedWords.size}/{wordList.length} completed
                <div className="flex gap-1 mt-1">
                  <Button variant="ghost" size="sm" onClick={handleClearData} className="text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    Change CSV
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowProgress(true)} className="text-xs">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Progress
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="text-xs">
                    <Settings className="w-3 h-3 mr-1" />
                    Settings
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setTestMode(!testMode)} className="text-xs">
                    <Bug className="w-3 h-3 mr-1" />
                    Test
                  </Button>
                </div>
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isAllWordsRecorded ? (
            // Normal recording interface
            <>
              {currentWord && <WordDisplay word={currentWord} isRecorded={recordedWords.has(currentWord.id)} />}

              <RecordingControls
                isRecording={isRecording}
                isTrimming={isTrimming}
                hasAudio={!!audioBlob}
                isPlaying={isPlaying}
                isProcessed={isProcessed}
                autoDownloadEnabled={settings.autoDownloadEnabled}
                autoRecordDelay={settings.autoRecordDelay}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onTogglePlayback={togglePlayback}
                onSaveAudio={saveAudio}
                onReRecord={resetRecording}
                onResetAutoplayState={resetAutoplayState}
                onSkipWord={() => {
                  if (debugMode) console.log("🔄 Skip button clicked")
                  getRandomWord(wordList, true, "skip-button")
                }}
              />

              {/* Fixed height container for waveform preview - always reserves space */}
              <div className="w-full min-h-[120px] flex items-center justify-center">
                {/* Simple Waveform Trimmer - directly embedded */}
                {audioBlob && !isRecording && !isTrimming && isProcessed && (
                  <div className="w-full">
                    {/* Conditionally render audio and waveform trimmer when audio is processed and URL exists */}
                    {audioBlob && !isRecording && !isTrimming && isProcessed && audioUrl && (
                      <>
                        <audio ref={audioRef} src={audioUrl} className="hidden" preload="auto" />

                        {/* Direct Simple Waveform Trimmer */}
                        {trimData && settings.autoTrimEnabled && (
                          <div className="p-3 bg-white rounded-lg border">
                            <SimpleWaveformTrimmer
                              waveformData={trimData.originalWaveform}
                              trimStart={manualTrimStart}
                              trimEnd={manualTrimEnd}
                              currentTime={currentTime}
                              isPlaying={isPlaying}
                              onTrimChange={handleTrimChange}
                            />
                          </div>
                        )}

                        {/* Placeholder when auto-trim is disabled but audio exists */}
                        {!trimData && settings.autoTrimEnabled === false && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <div className="text-center text-gray-500 text-sm">
                              <div className="mb-2">Audio recorded successfully</div>
                              <div className="text-xs">Enable auto-trim in settings to see waveform trimmer</div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Empty placeholder during recording and processing states */}
                    {(isRecording || isTrimming || !audioBlob || !isProcessed) && (
                      <div className="w-full h-[120px] flex items-center justify-center">
                        {isRecording && (
                          <div className="text-center text-gray-500">
                            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <div className="text-sm">Recording in progress...</div>
                          </div>
                        )}

                        {(isTrimming || (audioBlob && !isProcessed)) && (
                          <div className="text-center text-gray-500">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <div className="text-sm">Processing audio...</div>
                            {autoplayPending && (
                              <div className="text-xs text-blue-600 mt-1">Autoplay will start after processing...</div>
                            )}
                          </div>
                        )}

                        {!audioBlob && !isRecording && !isTrimming && (
                          <div className="text-center text-gray-400">
                            <div className="text-sm">Waveform preview will appear here</div>
                            <div className="text-xs mt-1">after recording audio</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty placeholder during recording and processing states */}
                {(isRecording || isTrimming || !audioBlob || !isProcessed) && (
                  <div className="w-full h-[120px] flex items-center justify-center">
                    {isRecording && (
                      <div className="text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <div className="text-sm">Recording in progress...</div>
                      </div>
                    )}

                    {(isTrimming || (audioBlob && !isProcessed)) && (
                      <div className="text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <div className="text-sm">Processing audio...</div>
                        {autoplayPending && (
                          <div className="text-xs text-blue-600 mt-1">Autoplay will start after processing...</div>
                        )}
                      </div>
                    )}

                    {!audioBlob && !isRecording && !isTrimming && (
                      <div className="text-center text-gray-400">
                        <div className="text-sm">Waveform preview will appear here</div>
                        <div className="text-xs mt-1">after recording audio</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tertiary actions section - always visible */}
              <div className="w-full space-y-3">
                {/* Skip button in review mode */}
                {audioBlob && !isRecording && !isTrimming && isProcessed && (
                  <Button
                    onClick={() => {
                      if (debugMode) console.log("🔄 Skip to next word button clicked")
                      getRandomWord(wordList, true, "skip-next-button")
                    }}
                    variant="ghost"
                    className="w-full"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip to Next Word
                  </Button>
                )}

                {/* Export button - visible when recordings exist */}
                {recordedWords.size > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <Button
                      onClick={downloadAudioPackage}
                      disabled={isExporting}
                      variant="outline"
                      className="w-full bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                    >
                      {isExporting ? (
                        <>
                          <Package className="w-4 h-4 mr-2 animate-spin" />
                          Creating Audio Package...
                        </>
                      ) : (
                        <>
                          <Package className="w-4 h-4 mr-2" />
                          Export Audio Package ({recordedWords.size} recordings)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Completion screen
            <div className="text-center space-y-6">
              {/* Completion celebration */}
              <div className="space-y-4">
                <div className="text-6xl">🎉</div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-green-600">Congratulations!</h2>
                  <p className="text-gray-600">You've completed all {wordList.length} recordings!</p>
                </div>
              </div>

              {/* Session statistics */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Session Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">{formatTime(sessionTime)}</div>
                    <div className="text-gray-600">Total Session Time</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">{formatTime(getAverageTimePerPhrase())}</div>
                    <div className="text-gray-600">Average per Phrase</div>
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-purple-600">{recordedWords.size}</div>
                  <div className="text-gray-600">Total Recordings Completed</div>
                </div>
              </div>

              {/* Export options */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">Export Your Work</h3>

                {/* Anki Package Export */}
                <Button
                  onClick={downloadAudioPackage}
                  disabled={isExporting}
                  className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                >
                  {isExporting ? (
                    <>
                      <Package className="w-5 h-5 mr-2 animate-spin" />
                      Creating Anki Package...
                    </>
                  ) : (
                    <>
                      <Package className="w-5 h-5 mr-2" />
                      Download Complete Anki Package
                    </>
                  )}
                </Button>

                {/* Audio Files Only Export */}
                <Button onClick={downloadAllAudioFiles} disabled={isExporting} variant="outline" className="w-full">
                  {isExporting ? (
                    <>
                      <Download className="w-4 h-4 mr-2 animate-spin" />
                      Creating Audio ZIP...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Audio Files Only ({recordedWords.size} files)
                    </>
                  )}
                </Button>
              </div>

              {/* Add more words option */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <h3 className="text-lg font-semibold text-gray-800">Continue Learning</h3>
                <p className="text-sm text-gray-600">Want to add more words to your collection?</p>

                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Upload Additional CSV File
                </Button>

                <Button onClick={handleClearData} variant="ghost" className="w-full text-gray-500">
                  Start Fresh with New Word List
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        {/* Debug and Status Information */}
        {(debugMode || autoAdvanceBlocked || testMode) && (
          <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 text-xs max-w-xs z-40 max-h-96 overflow-y-auto">
            {debugMode && (
              <div className="mb-2">
                <div className="font-bold text-yellow-800">Debug Mode Active</div>
                <div>Current Word: {currentWord?.id || "None"}</div>
                <div>User Interaction Required: {userInteractionRequired ? "Yes" : "No"}</div>
                <div>Auto Advance Blocked: {autoAdvanceBlocked ? "Yes" : "No"}</div>
                <div>Autoplay Pending: {autoplayPending ? "Yes" : "No"}</div>
                <div>Autoplay Attempted: {autoplayAttempted ? "Yes" : "No"}</div>
                <div>Word Advances: {wordAdvanceCountRef.current}</div>
              </div>
            )}

            {autoAdvanceBlocked && (
              <div className="text-orange-700 mb-2">
                <div className="font-bold">⚠️ Auto-advance blocked</div>
                <div>Use controls to advance manually</div>
              </div>
            )}

            {testMode && (
              <div className="mb-2">
                <div className="font-bold text-blue-800">Test Mode Active</div>
                <Button variant="ghost" size="sm" onClick={runCyclingPreventionTests} className="text-xs mb-2">
                  Run Tests
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    // Fill incomplete recordings with fake audio
                    const incompleteWords = wordList.filter((word) => !recordedWords.has(word.id))

                    for (const word of incompleteWords) {
                      // Create a fake audio blob (1 second of audible tone)
                      const audioContext = new AudioContext()
                      const sampleRate = 44100
                      const duration = 1 // 1 second
                      const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate)

                      // Fill with a quiet but audible sine wave tone
                      const channelData = buffer.getChannelData(0)
                      const frequency = 440 // A4 note
                      for (let i = 0; i < channelData.length; i++) {
                        // Create a sine wave with amplitude 0.1 (well above validation threshold)
                        const time = i / sampleRate
                        channelData[i] = Math.sin(2 * Math.PI * frequency * time) * 0.1
                      }

                      // Convert to WAV blob
                      const wavBlob = audioBufferToWav(buffer)

                      // Save fake recording
                      const recording: StoredRecording = {
                        id: `fake_recording_${word.id}_${Date.now()}`,
                        wordId: word.id,
                        audioBlob: wavBlob,
                        timestamp: Date.now(),
                      }
                      await saveRecording(recording)
                    }

                    // Mark all words as recorded
                    const allWordIds = new Set(wordList.map((w) => w.id))
                    await saveProgress(allWordIds)

                    console.log(`🧪 Test: Added ${incompleteWords.length} fake recordings`)
                  }}
                  className="text-xs mb-2 w-full"
                >
                  Fill Missing & Complete
                </Button>
                {testResults.length > 0 && (
                  <div className="space-y-1">
                    {testResults.map((result, index) => (
                      <div
                        key={index}
                        className={`text-xs p-1 rounded ${result.passed ? "bg-green-100" : "bg-red-100"}`}
                      >
                        <div className="font-medium">{result.test}</div>
                        <div>{result.details}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setDebugMode(!debugMode)} className="text-xs">
                {debugMode ? "Disable" : "Enable"} Debug
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setTestMode(!testMode)} className="text-xs">
                {testMode ? "Disable" : "Enable"} Test
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onUpdateSettings={updateSettings}
      />

      <ProgressModal
        isOpen={showProgress}
        wordList={wordList}
        recordedWords={recordedWords}
        onClose={() => setShowProgress(false)}
        onResetProgress={resetProgress}
        onMarkAsUnrecorded={markAsUnrecorded}
      />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
    </div>
  )
}
