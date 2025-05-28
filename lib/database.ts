import type { WordData, AppSettings, StoredRecording } from "@/types"

export class BanglaRecorderDB {
  private dbName = "BanglaRecorderDB"
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains("wordLists")) {
          db.createObjectStore("wordLists", { keyPath: "id" })
        }

        if (!db.objectStoreNames.contains("recordings")) {
          const recordingsStore = db.createObjectStore("recordings", { keyPath: "id" })
          recordingsStore.createIndex("wordId", "wordId", { unique: false })
        }

        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" })
        }

        if (!db.objectStoreNames.contains("progress")) {
          db.createObjectStore("progress", { keyPath: "key" })
        }
      }
    })
  }

  async saveWordList(wordList: WordData[], isDemo: boolean): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["wordLists"], "readwrite")
    const store = transaction.objectStore("wordLists")

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        id: "current",
        wordList,
        isDemo,
        timestamp: Date.now(),
      })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getWordList(): Promise<{ wordList: WordData[]; isDemo: boolean } | null> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["wordLists"], "readonly")
    const store = transaction.objectStore("wordLists")

    return new Promise((resolve, reject) => {
      const request = store.get("current")
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          resolve({ wordList: result.wordList, isDemo: result.isDemo })
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveRecording(recording: StoredRecording): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["recordings"], "readwrite")
    const store = transaction.objectStore("recordings")

    await new Promise<void>((resolve, reject) => {
      const request = store.put(recording)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getRecording(wordId: string): Promise<StoredRecording | null> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["recordings"], "readonly")
    const store = transaction.objectStore("recordings")
    const index = store.index("wordId")

    return new Promise((resolve, reject) => {
      const request = index.get(wordId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllRecordings(): Promise<StoredRecording[]> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["recordings"], "readonly")
    const store = transaction.objectStore("recordings")

    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteRecording(wordId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["recordings"], "readwrite")
    const store = transaction.objectStore("recordings")
    const index = store.index("wordId")

    return new Promise((resolve, reject) => {
      const getRequest = index.get(wordId)
      getRequest.onsuccess = () => {
        const recording = getRequest.result
        if (recording) {
          const deleteRequest = store.delete(recording.id)
          deleteRequest.onsuccess = () => resolve()
          deleteRequest.onerror = () => reject(deleteRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["settings"], "readwrite")
    const store = transaction.objectStore("settings")

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key: "appSettings", value: settings })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getSettings(): Promise<AppSettings | null> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["settings"], "readonly")
    const store = transaction.objectStore("settings")

    return new Promise((resolve, reject) => {
      const request = store.get("appSettings")
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.value : null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveProgress(recordedWords: Set<string>): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["progress"], "readwrite")
    const store = transaction.objectStore("progress")

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        key: "recordedWords",
        value: Array.from(recordedWords),
      })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getProgress(): Promise<Set<string>> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["progress"], "readonly")
    const store = transaction.objectStore("progress")

    return new Promise((resolve, reject) => {
      const request = store.get("recordedWords")
      request.onsuccess = () => {
        const result = request.result
        resolve(new Set(result ? result.value : []))
      }
      request.onerror = () => reject(request.error)
    })
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const transaction = this.db.transaction(["wordLists", "recordings", "progress"], "readwrite")

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore("wordLists").clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore("recordings").clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore("progress").clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
    ])
  }
}
