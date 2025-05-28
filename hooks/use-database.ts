"use client"

import { useState, useEffect, useRef } from "react"
import { BanglaRecorderDB } from "@/lib/database"
import { DEFAULT_SETTINGS } from "@/constants/demo-data"
import type { WordData, AppSettings, StoredRecording } from "@/types"

export function useDatabase() {
  const [dbInitialized, setDbInitialized] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [recordedWords, setRecordedWords] = useState<Set<string>>(new Set())

  const dbRef = useRef<BanglaRecorderDB>(new BanglaRecorderDB())

  useEffect(() => {
    const initDB = async () => {
      try {
        await dbRef.current.init()
        setDbInitialized(true)

        // Load data from IndexedDB
        const savedSettings = await dbRef.current.getSettings()
        if (savedSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...savedSettings })
        }

        const savedProgress = await dbRef.current.getProgress()
        setRecordedWords(savedProgress)
      } catch (error) {
        console.error("Error initializing database:", error)
        // Fallback to localStorage if IndexedDB fails
        loadFromLocalStorage()
      }
    }

    initDB()
  }, [])

  const loadFromLocalStorage = () => {
    try {
      const savedSettings = localStorage.getItem("banglaRecorderSettings")
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) })
      }

      const savedRecordedWords = localStorage.getItem("banglaRecordedWords")
      if (savedRecordedWords) {
        setRecordedWords(new Set(JSON.parse(savedRecordedWords)))
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error)
    }
  }

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    if (dbInitialized) {
      try {
        await dbRef.current.saveSettings(updatedSettings)
      } catch (error) {
        console.error("Error saving settings:", error)
        localStorage.setItem("banglaRecorderSettings", JSON.stringify(updatedSettings))
      }
    }
  }

  const saveWordList = async (wordList: WordData[], isDemo: boolean) => {
    if (dbInitialized) {
      try {
        await dbRef.current.saveWordList(wordList, isDemo)
      } catch (error) {
        console.error("Error saving word list:", error)
      }
    }
  }

  const getWordList = async () => {
    if (dbInitialized) {
      try {
        return await dbRef.current.getWordList()
      } catch (error) {
        console.error("Error getting word list:", error)
        return null
      }
    }
    return null
  }

  const saveRecording = async (recording: StoredRecording) => {
    if (dbInitialized) {
      try {
        await dbRef.current.saveRecording(recording)
      } catch (error) {
        console.error("Error saving recording:", error)
      }
    }
  }

  const getAllRecordings = async () => {
    if (dbInitialized) {
      try {
        return await dbRef.current.getAllRecordings()
      } catch (error) {
        console.error("Error getting recordings:", error)
        return []
      }
    }
    return []
  }

  const deleteRecording = async (wordId: string) => {
    if (dbInitialized) {
      try {
        await dbRef.current.deleteRecording(wordId)
      } catch (error) {
        console.error("Error deleting recording:", error)
      }
    }
  }

  const saveProgress = async (words: Set<string>) => {
    setRecordedWords(words)
    if (dbInitialized) {
      try {
        await dbRef.current.saveProgress(words)
      } catch (error) {
        console.error("Error saving progress:", error)
      }
    }
  }

  const clearAllData = async () => {
    if (dbInitialized) {
      try {
        await dbRef.current.clearAllData()
      } catch (error) {
        console.error("Error clearing database:", error)
      }
    }
  }

  return {
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
  }
}
