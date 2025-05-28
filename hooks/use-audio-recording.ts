"use client"

import { useState, useRef, useCallback } from "react"
import { trimAudioSilence, validateAudioBlob } from "@/lib/audio-utils"
import type { TrimData } from "@/types"

export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isTrimming, setIsTrimming] = useState(false)
  const [trimData, setTrimData] = useState<TrimData | null>(null)
  const [isProcessed, setIsProcessed] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const processingRef = useRef(false)

  const startRecording = useCallback(async () => {
    try {
      console.log("🎤 Starting audio recording...")

      // Request microphone access with high quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // High quality sample rate
          channelCount: 1, // Mono recording for smaller files
        },
      })

      console.log("✅ Microphone access granted")

      // Use high quality audio recording settings
      const options: MediaRecorderOptions = {
        mimeType: "audio/webm;codecs=opus", // High quality codec
        audioBitsPerSecond: 128000, // 128 kbps for good quality
      }

      // Fallback for browsers that don't support the preferred format
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        console.log("⚠️ Preferred audio format not supported, using fallback")
        delete options.mimeType
        delete options.audioBitsPerSecond
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
          console.log("📊 Audio chunk received:", event.data.size, "bytes")
        }
      }

      mediaRecorder.onstop = async () => {
        console.log("🛑 Recording stopped, processing audio...")

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => {
          track.stop()
          console.log("🔇 Audio track stopped:", track.label)
        })

        // Create blob from recorded chunks
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" })
        console.log("🎵 Audio blob created:", {
          size: blob.size,
          type: blob.type,
          chunks: chunks.length,
        })

        // Validate the recorded audio
        const validation = await validateAudioBlob(blob)
        if (!validation.isValid) {
          console.error("❌ Recorded audio validation failed:", validation.details)
          alert(
            `Recording failed: ${validation.details}\n\nPlease try recording again and speak clearly into the microphone.`,
          )
          setIsRecording(false)
          return
        }

        console.log("✅ Recorded audio validation passed:", validation.details)

        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setIsProcessed(false)
      }

      mediaRecorder.onerror = (event) => {
        console.error("❌ MediaRecorder error:", event)
        alert("Recording error occurred. Please try again.")
        setIsRecording(false)
      }

      mediaRecorder.start(100) // Collect data every 100ms for better quality
      setIsRecording(true)
      console.log("🎤 Recording started with settings:", options)
    } catch (error) {
      console.error("❌ Error starting recording:", error)

      let errorMessage = "Error accessing microphone. "
      if (error.name === "NotAllowedError") {
        errorMessage += "Please grant microphone permission and try again."
      } else if (error.name === "NotFoundError") {
        errorMessage += "No microphone found. Please connect a microphone and try again."
      } else {
        errorMessage += "Please check your microphone settings and try again."
      }

      alert(errorMessage)
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log("🛑 Stopping recording...")
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const processAudio = useCallback(
    async (autoTrimEnabled: boolean) => {
      if (!audioBlob || processingRef.current || isProcessed) {
        return { blob: audioBlob, trimData }
      }

      processingRef.current = true
      let finalBlob = audioBlob
      let finalTrimData: TrimData | null = null

      if (autoTrimEnabled) {
        setIsTrimming(true)
        try {
          console.log("✂️ Starting audio trim processing...")
          const result = await trimAudioSilence(audioBlob)
          finalBlob = result.blob
          finalTrimData = result.trimData
          setTrimData(finalTrimData)

          // Validate the trimmed audio
          const validation = await validateAudioBlob(finalBlob)
          if (!validation.isValid) {
            console.error("❌ Trimmed audio validation failed:", validation.details)
            console.log("🔄 Falling back to original audio")
            finalBlob = audioBlob
            finalTrimData = null
          } else {
            console.log("✅ Trimmed audio validation passed:", validation.details)

            // Update audio blob and URL with trimmed version
            setAudioBlob(finalBlob)
            if (audioUrl) {
              URL.revokeObjectURL(audioUrl)
            }
            const newUrl = URL.createObjectURL(finalBlob)
            setAudioUrl(newUrl)
          }

          console.log("✅ Audio trim processing completed")
        } catch (error) {
          console.error("❌ Trimming failed, using original audio:", error)
          finalBlob = audioBlob
          finalTrimData = null
        } finally {
          setIsTrimming(false)
          setIsProcessed(true)
          processingRef.current = false
        }
      } else {
        setIsProcessed(true)
        processingRef.current = false
      }

      return { blob: finalBlob, trimData: finalTrimData }
    },
    [audioBlob, audioUrl, trimData, isProcessed],
  )

  const resetRecording = useCallback(() => {
    console.log("🔄 Resetting recording state")

    setAudioBlob(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl(null)
    setTrimData(null)
    setIsTrimming(false)
    setIsProcessed(false)
    processingRef.current = false
  }, [audioUrl])

  return {
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
  }
}
