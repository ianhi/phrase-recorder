"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, Volume2, Mic, Download, Keyboard, RotateCcw, Edit3, AlertTriangle } from "lucide-react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { DEFAULT_SHORTCUTS } from "@/constants/demo-data"
import type { AppSettings, KeyboardShortcut } from "@/types"

interface SettingsModalProps {
  isOpen: boolean
  settings: AppSettings
  onClose: () => void
  onUpdateSettings: (settings: Partial<AppSettings>) => void
}

export function SettingsModal({ isOpen, settings, onClose, onUpdateSettings }: SettingsModalProps) {
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(settings.shortcuts || DEFAULT_SHORTCUTS)
  const [conflicts, setConflicts] = useState<Array<{ key: string; shortcuts: KeyboardShortcut[] }>>([])

  const { checkConflicts } = useKeyboardShortcuts({
    shortcuts: [],
    enabled: false,
    context: [],
    onShortcut: () => {},
  })

  // Update shortcuts when settings change
  useEffect(() => {
    if (settings.shortcuts) {
      setShortcuts(settings.shortcuts)
    }
  }, [settings.shortcuts])

  // Check for conflicts whenever shortcuts change
  useEffect(() => {
    const newConflicts = checkConflicts(shortcuts)
    setConflicts(newConflicts)
  }, [shortcuts, checkConflicts])

  const categoryIcons = {
    playback: Volume2,
    recording: Mic,
    navigation: Keyboard,
    editing: Edit3,
  }

  const categoryColors = {
    playback: "bg-blue-100 text-blue-800 border-blue-200",
    recording: "bg-red-100 text-red-800 border-red-200",
    navigation: "bg-green-100 text-green-800 border-green-200",
    editing: "bg-purple-100 text-purple-800 border-purple-200",
  }

  const handleShortcutEdit = (shortcutId: string) => {
    setEditingShortcut(shortcutId)
  }

  const handleShortcutSave = (shortcutId: string, newKey: string) => {
    const updatedShortcuts = shortcuts.map((shortcut) =>
      shortcut.id === shortcutId ? { ...shortcut, currentKey: newKey } : shortcut,
    )
    setShortcuts(updatedShortcuts)
    setEditingShortcut(null)
    onUpdateSettings({ shortcuts: updatedShortcuts })
  }

  const handleShortcutReset = (shortcutId: string) => {
    const updatedShortcuts = shortcuts.map((shortcut) =>
      shortcut.id === shortcutId ? { ...shortcut, currentKey: shortcut.defaultKey } : shortcut,
    )
    setShortcuts(updatedShortcuts)
    onUpdateSettings({ shortcuts: updatedShortcuts })
  }

  const resetAllShortcuts = () => {
    const resetShortcuts = shortcuts.map((shortcut) => ({ ...shortcut, currentKey: shortcut.defaultKey }))
    setShortcuts(resetShortcuts)
    onUpdateSettings({ shortcuts: resetShortcuts })
  }

  const formatKeyDisplay = (key: string) => {
    return key
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace("Ctrl", "⌘")
      .replace("Control", "⌘")
      .replace("Shift", "⇧")
      .replace("Alt", "⌥")
      .replace("Meta", "⌘")
      .replace("Space", "␣")
      .replace("Enter", "↵")
      .replace("Backspace", "⌫")
      .replace("Escape", "⎋")
      .replace("Left", "←")
      .replace("Right", "→")
      .replace("Up", "↑")
      .replace("Down", "↓")
  }

  const normalizeKeyForCapture = (key: string) => {
    return key.toLowerCase().replace("control", "ctrl").replace("meta", "cmd")
  }

  const captureKeyPress = (e: React.KeyboardEvent, shortcutId: string) => {
    e.preventDefault()
    e.stopPropagation()

    const parts: string[] = []

    if (e.ctrlKey || e.metaKey) parts.push("Ctrl")
    if (e.shiftKey) parts.push("Shift")
    if (e.altKey) parts.push("Alt")

    let key = e.key
    if (key === " ") key = "Space"
    if (key.startsWith("Arrow")) key = key.replace("Arrow", "")

    // Don't capture modifier keys alone
    if (!["Control", "Shift", "Alt", "Meta"].includes(key)) {
      parts.push(key)
    }

    const newKey = parts.join("+")
    if (newKey && !newKey.endsWith("+") && parts.length > 0) {
      handleShortcutSave(shortcutId, newKey)
    }
  }

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<string, KeyboardShortcut[]>,
  )

  const isShortcutInConflict = (shortcut: KeyboardShortcut) => {
    return conflicts.some((conflict) => conflict.shortcuts.some((s) => s.id === shortcut.id))
  }

  const getConflictForShortcut = (shortcut: KeyboardShortcut) => {
    return conflicts.find((conflict) => conflict.shortcuts.some((s) => s.id === shortcut.id))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Settings
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Playback Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Playback Settings</h3>
            </div>

            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto-play after recording</Label>
                  <p className="text-xs text-gray-500">Automatically play audio when recording stops</p>
                </div>
                <Switch
                  checked={settings.autoPlayEnabled}
                  onCheckedChange={(checked) => onUpdateSettings({ autoPlayEnabled: checked })}
                />
              </div>

              {settings.autoPlayEnabled && (
                <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Label className="text-sm font-medium text-blue-800">
                    Auto-play delay: {settings.autoPlayDelay}ms
                  </Label>
                  <Slider
                    value={[settings.autoPlayDelay]}
                    onValueChange={([value]) => onUpdateSettings({ autoPlayDelay: value })}
                    max={1000}
                    min={0}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>Instant</span>
                    <span>1 second</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Recording Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-800">Recording Settings</h3>
            </div>

            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto-trim silence</Label>
                  <p className="text-xs text-gray-500">Automatically remove silence from recordings</p>
                </div>
                <Switch
                  checked={settings.autoTrimEnabled}
                  onCheckedChange={(checked) => onUpdateSettings({ autoTrimEnabled: checked })}
                />
              </div>

              {settings.autoTrimEnabled && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-4">
                  <div className="text-xs text-green-700">
                    <div className="font-medium mb-1">Auto-trim features:</div>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Removes silence from start and end</li>
                      <li>Preserves 0.1s buffer for natural sound</li>
                      <li>Shows waveform preview with trim points</li>
                      <li>Manual adjustment available in zoom view</li>
                    </ul>
                  </div>

                  {/* Relative Silence Threshold Setting */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-green-800">
                      Silence Threshold: {(settings.relativeSilenceFraction * 100).toFixed(1)}% of peak
                    </Label>
                    <Slider
                      value={[settings.relativeSilenceFraction]}
                      onValueChange={([value]) => onUpdateSettings({ relativeSilenceFraction: value })}
                      max={0.1} // Max threshold at 10% of peak
                      min={0.001} // Min threshold at 0.1% of peak
                      step={0.001} // 0.1% step
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-green-600">
                      <span>Very Quiet (0.1%)</span>
                      <span>Louder (10%)</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Determines the volume level relative to the loudest part of the audio below which silence is detected for trimming. A lower percentage detects quieter silence.
                    </p>
                  </div>
                </div>
              )}

              <Separator className="my-4" /> {/* Add separator */}

              {/* Extra Audio Processing Section */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Enable Extra Audio Processing</Label>
                  <p className="text-xs text-gray-500">Apply processing like compression after trimming</p>
                </div>
                <Switch
                  checked={settings.extraProcessingEnabled}
                  onCheckedChange={(checked) => onUpdateSettings({ extraProcessingEnabled: checked })}
                />
              </div>

              {settings.extraProcessingEnabled && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                  <div className="text-xs text-blue-700">
                    <div className="font-medium mb-1">Extra Processing Options:</div>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Apply dynamic range compression to even out volume</li>
                      <li>More options may be added in the future</li>
                    </ul>
                  </div>

                  {/* Dynamic Range Compression Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-blue-800">Enable Compression</Label>
                        <p className="text-xs text-gray-500">Reduce the dynamic range of the audio</p>
                      </div>
                      <Switch
                        checked={settings.compressionEnabled}
                        onCheckedChange={(checked) => onUpdateSettings({ compressionEnabled: checked })}
                      />
                    </div>

                    {settings.compressionEnabled && (
                      <div className="space-y-4 pl-4">
                        {/* Compression Threshold */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-blue-800">
                            Threshold: {settings.compressionThreshold.toFixed(1)} dB
                          </Label>
                          <Slider
                            value={[settings.compressionThreshold]}
                            onValueChange={([value]) => onUpdateSettings({ compressionThreshold: value })}
                            max={0}
                            min={-60}
                            step={0.5}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500">
                            The level above which compression is applied. Lower values mean more of the signal is compressed.
                          </p>
                        </div>

                        {/* Compression Ratio */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-blue-800">
                            Ratio: {settings.compressionRatio.toFixed(1)}:1
                          </Label>
                          <Slider
                            value={[settings.compressionRatio]}
                            onValueChange={([value]) => onUpdateSettings({ compressionRatio: value })}
                            max={20}
                            min={1}
                            step={0.5}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500">
                            Determines how much the signal is reduced above the threshold. A ratio of 4:1 means a signal 4dB over the threshold will be reduced to 1dB over.
                          </p>
                        </div>

                        {/* Compression Attack */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-blue-800">
                            Attack: {(settings.compressionAttack * 1000).toFixed(1)} ms
                          </Label>
                          <Slider
                            value={[settings.compressionAttack]}
                            onValueChange={([value]) => onUpdateSettings({ compressionAttack: value })}
                            max={0.1} // Max 100ms
                            min={0.001} // Min 1ms
                            step={0.001} // 1ms step
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500">
                            How quickly the compressor reacts to signals exceeding the threshold. Shorter times react faster.
                          </p>
                        </div>

                        {/* Compression Release */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-blue-800">
                            Release: {(settings.compressionRelease * 1000).toFixed(1)} ms
                          </Label>
                          <Slider
                            value={[settings.compressionRelease]}
                            onValueChange={([value]) => onUpdateSettings({ compressionRelease: value })}
                            max={1} // Max 1000ms
                            min={0.05} // Min 50ms
                            step={0.01} // 10ms step
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500">
                            How quickly the compressor stops reducing the signal once it falls below the threshold. Longer times result in a smoother release.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto-record next word</Label>
                  <p className="text-xs text-gray-500">Automatically start recording after saving current word</p>
                </div>
                <Switch
                  checked={settings.autoRecordNextEnabled}
                  onCheckedChange={(checked) => onUpdateSettings({ autoRecordNextEnabled: checked })}
                />
              </div>

              {settings.autoRecordNextEnabled && (
                <div className="space-y-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <Label className="text-sm font-medium text-red-800">
                    Auto-record delay: {settings.autoRecordDelay}ms
                  </Label>
                  <Slider
                    value={[settings.autoRecordDelay]}
                    onValueChange={([value]) => onUpdateSettings({ autoRecordDelay: value })}
                    max={1000}
                    min={50}
                    step={25}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-red-600">
                    <span>50ms</span>
                    <span>1 second</span>
                  </div>
                  <div className="text-xs text-red-700">
                    <div className="font-medium mb-1">Auto-record features:</div>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Starts recording automatically after saving</li>
                      <li>Same delay used for re-record button</li>
                      <li>Allows seamless word-to-word recording</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Export Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Export Settings</h3>
            </div>

            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto-download recordings</Label>
                  <p className="text-xs text-gray-500">Download audio files when saving recordings</p>
                </div>
                <Switch
                  checked={settings.autoDownloadEnabled}
                  onCheckedChange={(checked) => onUpdateSettings({ autoDownloadEnabled: checked })}
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-xs text-purple-700">
                  <div className="font-medium mb-1">Export options:</div>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>
                      <strong>Individual files:</strong> Auto-download saves each recording
                    </li>
                    <li>
                      <strong>Audio package:</strong> Export all recordings as ZIP with Anki templates
                    </li>
                    <li>
                      <strong>Format:</strong> High-quality WAV files for best compatibility
                    </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

          <Separator />

          {/* Keyboard Shortcuts Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-800">Keyboard Shortcuts</h3>
            </div>

            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Enable keyboard shortcuts</Label>
                  <p className="text-xs text-gray-500">Use keyboard shortcuts for faster navigation</p>
                </div>
                <Switch
                  checked={settings.keyboardShortcutsEnabled}
                  onCheckedChange={(checked) => onUpdateSettings({ keyboardShortcutsEnabled: checked })}
                />
              </div>

              {settings.keyboardShortcutsEnabled && (
                <div className="space-y-4">
                  {/* Conflict Warning */}
                  {conflicts.length > 0 && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <div className="font-medium mb-1">Shortcut Conflicts Detected:</div>
                        {conflicts.map((conflict, index) => (
                          <div key={index} className="text-sm">
                            <strong>{formatKeyDisplay(conflict.key)}</strong> is used by:{" "}
                            {conflict.shortcuts.map((s) => s.action).join(", ")}
                          </div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Configure shortcuts for different actions</p>
                    <Button variant="outline" size="sm" onClick={resetAllShortcuts}>
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset All
                    </Button>
                  </div>

                  {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
                    const IconComponent = categoryIcons[category as keyof typeof categoryIcons]
                    const colorClass = categoryColors[category as keyof typeof categoryColors]

                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4" />
                          <h4 className="text-sm font-semibold capitalize">{category}</h4>
                        </div>

                        <div className="space-y-2 pl-6">
                          {categoryShortcuts.map((shortcut) => {
                            const inConflict = isShortcutInConflict(shortcut)
                            const conflict = getConflictForShortcut(shortcut)

                            return (
                              <div
                                key={shortcut.id}
                                className={`flex items-center justify-between p-2 rounded-lg ${
                                  inConflict ? "bg-orange-50 border border-orange-200" : "bg-gray-50"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900">{shortcut.action}</div>
                                  <div className="text-xs text-gray-500 truncate">{shortcut.description}</div>
                                  {inConflict && conflict && (
                                    <div className="text-xs text-orange-600 mt-1">
                                      Conflicts with:{" "}
                                      {conflict.shortcuts
                                        .filter((s) => s.id !== shortcut.id)
                                        .map((s) => s.action)
                                        .join(", ")}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400 mt-1">
                                    Active in: {shortcut.contexts.join(", ")}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {editingShortcut === shortcut.id ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        className="w-32 h-8 text-xs"
                                        placeholder="Press keys..."
                                        onKeyDown={(e) => captureKeyPress(e, shortcut.id)}
                                        autoFocus
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingShortcut(null)}
                                        className="h-8 px-2"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <Badge
                                        variant="outline"
                                        className={`text-xs font-mono ${colorClass} ${
                                          inConflict ? "border-orange-300 bg-orange-100 text-orange-800" : ""
                                        }`}
                                      >
                                        {formatKeyDisplay(shortcut.currentKey)}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleShortcutEdit(shortcut.id)}
                                        className="h-8 px-2"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </Button>
                                      {shortcut.currentKey !== shortcut.defaultKey && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleShortcutReset(shortcut.id)}
                                          className="h-8 px-2"
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="text-xs text-indigo-700">
                      <div className="font-medium mb-1">Shortcut tips:</div>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Click the edit button to change a shortcut</li>
                        <li>Press the key combination you want to assign</li>
                        <li>Use Ctrl, Shift, and Alt modifiers for complex shortcuts</li>
                        <li>Shortcuts are context-aware to avoid conflicts</li>
                        <li>Some actions share shortcuts (like Record/Stop)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Settings Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Current Configuration</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-700">Auto-play</div>
                <div className="text-gray-600">
                  {settings.autoPlayEnabled ? `${settings.autoPlayDelay}ms delay` : "Disabled"}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-700">Auto-trim</div>
                <div className="text-gray-600">{settings.autoTrimEnabled ? "Enabled" : "Disabled"}</div>
              </div>
              {settings.autoTrimEnabled && (
                <div className="p-2 bg-gray-50 rounded">
                  <div className="font-medium text-gray-700">Trim Threshold</div>
                  <div className="text-gray-600">
                    {(settings.relativeSilenceFraction * 100).toFixed(1)}% of peak
                  </div>
                </div>
              )}
              <div className="p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-700">Extra Processing</div>
                <div className="text-gray-600">{settings.extraProcessingEnabled ? "Enabled" : "Disabled"}</div>
              </div>
              {settings.extraProcessingEnabled && (
                <>
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-700">Compression</div>
                    <div className="text-gray-600">{settings.compressionEnabled ? "Enabled" : "Disabled"}</div>
                  </div>
                  {settings.compressionEnabled && (
                    <>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="font-medium text-gray-700">Comp. Threshold</div>
                        <div className="text-gray-600">{settings.compressionThreshold.toFixed(1)} dB</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="font-medium text-gray-700">Comp. Ratio</div>
                        <div className="text-gray-600">{settings.compressionRatio.toFixed(1)}:1</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="font-medium text-gray-700">Comp. Attack</div>
                        <div className="text-gray-600">{(settings.compressionAttack * 1000).toFixed(1)} ms</div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="font-medium text-gray-700">Comp. Release</div>
                        <div className="text-gray-600">{(settings.compressionRelease * 1000).toFixed(1)} ms</div>
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-700">Auto-download</div>
                <div className="text-gray-600">{settings.autoDownloadEnabled ? "Individual files" : "Manual only"}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-700">Auto-record</div>
                <div className="text-gray-600">
                  {settings.autoRecordNextEnabled ? `${settings.autoRecordDelay}ms delay` : "Disabled"}
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-700">Shortcuts</div>
                <div className="text-gray-600">
                  {settings.keyboardShortcutsEnabled ? `${shortcuts.length} active` : "Disabled"}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t">
            <Button onClick={onClose} className="w-full">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
