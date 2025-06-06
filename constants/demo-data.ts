import type { WordData, AppSettings, KeyboardShortcut } from "@/types"

export const DEMO_WORD_LIST: WordData[] = [
  { id: "demo_001", bangla: "আমি ভালো আছি", english: "I am fine" },
  { id: "demo_002", bangla: "ধন্যবাদ", english: "Thank you" },
  { id: "demo_003", bangla: "আপনার নাম কি?", english: "What is your name?" },
  { id: "demo_004", bangla: "আমি বাংলা শিখছি", english: "I am learning Bengali" },
  { id: "demo_005", bangla: "সুপ্রভাত", english: "Good morning" },
  { id: "demo_006", bangla: "শুভ রাত্রি", english: "Good night" },
  { id: "demo_007", bangla: "আমি ক্ষুধার্ত", english: "I am hungry" },
  { id: "demo_008", bangla: "পানি দিন", english: "Please give me water" },
  { id: "demo_009", bangla: "এটা কত টাকা?", english: "How much does this cost?" },
  { id: "demo_010", bangla: "আমি বুঝতে পারছি না", english: "I don't understand" },
  { id: "demo_011", bangla: "দুঃখিত", english: "Sorry" },
  { id: "demo_012", bangla: "আবার বলুন", english: "Please say again" },
  { id: "demo_013", bangla: "আমি বাংলাদেশী", english: "I am Bangladeshi" },
  { id: "demo_014", bangla: "আপনি কেমন আছেন?", english: "How are you?" },
  { id: "demo_015", bangla: "আমার সাহায্য লাগবে", english: "I need help" },
]

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: "play-pause",
    action: "Play/Pause",
    description: "Toggle audio playback",
    defaultKey: "Space",
    currentKey: "Space",
    category: "playback",
    contexts: ["has-audio", "waveform-modal"],
  },
  {
    id: "record-stop",
    action: "Record/Stop",
    description: "Start or stop recording",
    defaultKey: "r",
    currentKey: "r",
    category: "recording",
    contexts: ["main", "waveform-modal"],
  },
  {
    id: "save-next",
    action: "Save & Next",
    description: "Save current recording and move to next word",
    defaultKey: "Enter",
    currentKey: "Enter",
    category: "recording",
    contexts: ["has-audio"],
  },
  {
    id: "skip-word",
    action: "Skip Word",
    description: "Skip to next word without recording",
    defaultKey: "s",
    currentKey: "s",
    category: "navigation",
    contexts: ["main"],
  },
  {
    id: "re-record",
    action: "Re-record",
    description: "Delete current recording and start over",
    defaultKey: "Backspace",
    currentKey: "Backspace",
    category: "recording",
    contexts: ["has-audio"],
  },
  {
    id: "zoom-in",
    action: "Zoom In",
    description: "Zoom into waveform",
    defaultKey: "=",
    currentKey: "=",
    category: "editing",
    contexts: ["waveform-modal"],
  },
  {
    id: "zoom-out",
    action: "Zoom Out",
    description: "Zoom out of waveform",
    defaultKey: "-",
    currentKey: "-",
    category: "editing",
    contexts: ["waveform-modal"],
  },
  {
    id: "reset-zoom",
    action: "Reset Zoom",
    description: "Reset waveform zoom to 1x",
    defaultKey: "0",
    currentKey: "0",
    category: "editing",
    contexts: ["waveform-modal"],
  },
  {
    id: "open-settings",
    action: "Open Settings",
    description: "Open settings modal",
    defaultKey: "Ctrl+,",
    currentKey: "Ctrl+,",
    category: "navigation",
    contexts: ["main"],
  },
  {
    id: "open-progress",
    action: "View Progress",
    description: "Open progress tracking modal",
    defaultKey: "Ctrl+p",
    currentKey: "Ctrl+p",
    category: "navigation",
    contexts: ["main"],
  },
  {
    id: "open-waveform",
    action: "Open Waveform",
    description: "Open detailed waveform editor",
    defaultKey: "w",
    currentKey: "w",
    category: "editing",
    contexts: ["has-audio"],
  },
  {
    id: "close-modal",
    action: "Close Modal",
    description: "Close any open modal",
    defaultKey: "Escape",
    currentKey: "Escape",
    category: "navigation",
    contexts: ["modal"],
  },
]

export const DEFAULT_SETTINGS: AppSettings = {
  autoPlayEnabled: true,
  autoPlayDelay: 200,
  autoTrimEnabled: true,
  relativeSilenceFraction: 0.05, // Default relative silence threshold (5%)
  extraProcessingEnabled: false, // Default to extra processing disabled
  compressionEnabled: false, // Default to compression disabled
  compressionThreshold: -24, // Default compression threshold (dBFS)
  compressionRatio: 4, // Default compression ratio (4:1)
  compressionAttack: 0.003, // Default compression attack time (seconds)
  compressionRelease: 0.25, // Default compression release time (seconds)
  autoDownloadEnabled: false,
  autoRecordNextEnabled: true,
  autoRecordDelay: 100,
  keyboardShortcutsEnabled: true,
  shortcuts: DEFAULT_SHORTCUTS,
};
