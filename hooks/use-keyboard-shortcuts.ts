"use client"

import { useEffect, useCallback, useRef } from "react"
import type { KeyboardShortcut } from "@/types"

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  enabled: boolean
  context: string[]
  onShortcut: (shortcutId: string) => void
}

export function useKeyboardShortcuts({ shortcuts, enabled, context, onShortcut }: UseKeyboardShortcutsProps) {
  const activeShortcuts = useRef<Map<string, string>>(new Map())

  // Build active shortcuts map based on current context
  useEffect(() => {
    if (!enabled) {
      activeShortcuts.current.clear()
      return
    }

    const newActiveShortcuts = new Map<string, string>()

    shortcuts.forEach((shortcut) => {
      // Check if shortcut is active in current context
      const isActive = shortcut.contexts.some((shortcutContext) => context.includes(shortcutContext))

      if (isActive) {
        const normalizedKey = normalizeKey(shortcut.currentKey)
        newActiveShortcuts.set(normalizedKey, shortcut.id)
      }
    })

    activeShortcuts.current = newActiveShortcuts
  }, [shortcuts, enabled, context])

  const normalizeKey = useCallback((key: string) => {
    return key
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace("ctrl", "control")
      .replace("cmd", "meta")
      .split("+")
      .sort()
      .join("+")
  }, [])

  const getKeyFromEvent = useCallback(
    (event: KeyboardEvent) => {
      const parts: string[] = []

      if (event.ctrlKey || event.metaKey) parts.push("control")
      if (event.shiftKey) parts.push("shift")
      if (event.altKey) parts.push("alt")

      // Handle special keys
      let key = event.key.toLowerCase()
      if (key === " ") key = "space"
      if (key === "arrowleft") key = "left"
      if (key === "arrowright") key = "right"
      if (key === "arrowup") key = "up"
      if (key === "arrowdown") key = "down"

      // Don't add modifier keys as the main key
      if (!["control", "shift", "alt", "meta"].includes(key)) {
        parts.push(key)
      }

      return parts.sort().join("+")
    },
    [normalizeKey],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't handle shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true" ||
        target.closest('[contenteditable="true"]')
      ) {
        return
      }

      const eventKey = getKeyFromEvent(event)
      const shortcutId = activeShortcuts.current.get(eventKey)

      if (shortcutId) {
        event.preventDefault()
        event.stopPropagation()
        onShortcut(shortcutId)
      }
    },
    [enabled, getKeyFromEvent, onShortcut],
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener("keydown", handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true })
    }
  }, [enabled, handleKeyDown])

  // Return function to check for conflicts
  const checkConflicts = useCallback(
    (newShortcuts: KeyboardShortcut[]) => {
      const conflicts: Array<{ key: string; shortcuts: KeyboardShortcut[] }> = []
      const keyMap = new Map<string, KeyboardShortcut[]>()

      // Group shortcuts by normalized key
      newShortcuts.forEach((shortcut) => {
        const normalizedKey = normalizeKey(shortcut.currentKey)
        if (!keyMap.has(normalizedKey)) {
          keyMap.set(normalizedKey, [])
        }
        keyMap.get(normalizedKey)!.push(shortcut)
      })

      // Find conflicts (same key with overlapping contexts)
      keyMap.forEach((shortcuts, key) => {
        if (shortcuts.length > 1) {
          // Check if any contexts overlap
          for (let i = 0; i < shortcuts.length; i++) {
            for (let j = i + 1; j < shortcuts.length; j++) {
              const shortcut1 = shortcuts[i]
              const shortcut2 = shortcuts[j]

              const hasOverlap = shortcut1.contexts.some((context1) =>
                shortcut2.contexts.some((context2) => context1 === context2),
              )

              if (hasOverlap) {
                const existingConflict = conflicts.find((c) => c.key === key)
                if (existingConflict) {
                  if (!existingConflict.shortcuts.includes(shortcut1)) {
                    existingConflict.shortcuts.push(shortcut1)
                  }
                  if (!existingConflict.shortcuts.includes(shortcut2)) {
                    existingConflict.shortcuts.push(shortcut2)
                  }
                } else {
                  conflicts.push({
                    key,
                    shortcuts: [shortcut1, shortcut2],
                  })
                }
              }
            }
          }
        }
      })

      return conflicts
    },
    [normalizeKey],
  )

  return { checkConflicts }
}
