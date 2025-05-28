"use client"

import React from "react"

import { useState, useRef, useCallback } from "react"
import { generateWaveformData, audioBufferToWav } from "@/lib/audio-utils"
import type { WaveformData } from "@/types"

export function useAudioProcessor() {
  // Audio file state
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null)

  // Trim state
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  // Loading and error state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Load and process audio file
  const loadAudioFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setAudioFile(file)

    try {
      // Create audio URL
      const url = URL.createObjectURL(file)
      setAudioUrl(url)

      // Create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      // Load and decode audio
      const arrayBuffer = await file.arrayBuffer()
      const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer)

      setAudioBuffer(buffer)

      // Generate waveform data
      const waveform = generateWaveformData(buffer, 1000)
      setWaveformData(waveform)

      // Set initial trim points (full audio)
      setTrimStart(0)
      setTrimEnd(buffer.duration)

      console.log("Audio loaded successfully:", {
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
      })
    } catch (err) {
      console.error("Error loading audio:", err)
      setError("Failed to load audio file. Please try a different file.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Set trim points
  const setTrimPoints = useCallback((start: number, end: number) => {
    setTrimStart(start)
    setTrimEnd(end)
  }, [])

  // Play trimmed audio
  const playTrimmedAudio = useCallback(async () => {
    if (!audioUrl || !audioRef.current) return

    try {
      const audio = audioRef.current

      // Create new audio element for trimmed playback
      if (!audio.src) {
        audio.src = audioUrl
        audio.preload = "auto"
      }

      // Set to start of trim
      audio.currentTime = trimStart
      setCurrentTime(trimStart)

      // Play audio
      await audio.play()
      setIsPlaying(true)

      console.log(`Playing trimmed audio from ${trimStart}s to ${trimEnd}s`)
    } catch (err) {
      console.error("Playback failed:", err)
      setError("Failed to play audio")
    }
  }, [audioUrl, trimStart, trimEnd])

  // Pause audio
  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  // Stop audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = trimStart
      setIsPlaying(false)
      setCurrentTime(trimStart)
    }
  }, [trimStart])

  // Reset trim to full audio
  const resetTrim = useCallback(() => {
    if (audioBuffer) {
      setTrimStart(0)
      setTrimEnd(audioBuffer.duration)
    }
  }, [audioBuffer])

  // Download trimmed audio
  const downloadTrimmedAudio = useCallback(async () => {
    if (!audioBuffer) return

    try {
      // Create trimmed audio buffer
      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(trimStart * sampleRate)
      const endSample = Math.floor(trimEnd * sampleRate)
      const trimmedLength = endSample - startSample

      const trimmedBuffer = new AudioContext().createBuffer(
        audioBuffer.numberOfChannels,
        trimmedLength,
        audioBuffer.sampleRate,
      )

      // Copy trimmed audio data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel)
        const trimmedData = trimmedBuffer.getChannelData(channel)
        for (let i = 0; i < trimmedLength; i++) {
          trimmedData[i] = originalData[startSample + i]
        }
      }

      // Convert to WAV and download
      const wavBlob = audioBufferToWav(trimmedBuffer)
      const url = URL.createObjectURL(wavBlob)

      const link = document.createElement("a")
      link.href = url
      link.download = `trimmed_${audioFile?.name || "audio"}.wav`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)

      console.log("Trimmed audio downloaded successfully")
    } catch (err) {
      console.error("Download failed:", err)
      setError("Failed to download trimmed audio")
    }
  }, [audioBuffer, trimStart, trimEnd, audioFile])

  // Audio event listeners setup
  const setupAudioListeners = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const time = audio.currentTime
      setCurrentTime(time)

      // Auto-stop when reaching trim end
      if (isPlaying && time >= trimEnd - 0.01) {
        audio.pause()
        setIsPlaying(false)
        // Reset to start for next play
        setTimeout(() => {
          audio.currentTime = trimStart
          setCurrentTime(trimStart)
        }, 100)
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(trimStart)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [isPlaying, trimEnd, trimStart])

  // Setup audio listeners when audio URL changes
  React.useEffect(() => {
    if (audioUrl) {
      return setupAudioListeners()
    }
  }, [audioUrl, setupAudioListeners])

  return {
    // State
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

    // Actions
    loadAudioFile,
    setTrimPoints,
    playTrimmedAudio,
    pauseAudio,
    stopAudio,
    resetTrim,
    downloadTrimmedAudio,

    // Ref for audio element
    audioRef,
  }
}
