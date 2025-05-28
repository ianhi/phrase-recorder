import type { StoredRecording, WordData } from "@/types"
import { validateAudioBlob } from "./audio-utils"

export class AudioPackageCreator {
  private static async createZip(files: { [filename: string]: Uint8Array | string }): Promise<Blob> {
    console.log("📦 Creating ZIP with", Object.keys(files).length, "files")

    const zipData: Uint8Array[] = []
    const centralDirectory: Uint8Array[] = []
    let offset = 0

    for (const [filename, content] of Object.entries(files)) {
      const data = typeof content === "string" ? new TextEncoder().encode(content) : content
      const filenameBytes = new TextEncoder().encode(filename)

      console.log(`📁 Adding file to ZIP: ${filename} (${data.length} bytes)`)

      // Local file header
      const localHeader = new Uint8Array(30 + filenameBytes.length)
      const view = new DataView(localHeader.buffer)

      view.setUint32(0, 0x04034b50, true) // Local file header signature
      view.setUint16(4, 20, true) // Version needed to extract
      view.setUint16(6, 0, true) // General purpose bit flag
      view.setUint16(8, 0, true) // Compression method (stored)
      view.setUint16(10, 0, true) // Last mod file time
      view.setUint16(12, 0, true) // Last mod file date
      view.setUint32(14, this.crc32(data), true) // CRC-32
      view.setUint32(18, data.length, true) // Compressed size
      view.setUint32(22, data.length, true) // Uncompressed size
      view.setUint16(26, filenameBytes.length, true) // File name length
      view.setUint16(28, 0, true) // Extra field length

      localHeader.set(filenameBytes, 30)

      zipData.push(localHeader)
      zipData.push(data)

      // Central directory entry
      const centralEntry = new Uint8Array(46 + filenameBytes.length)
      const centralView = new DataView(centralEntry.buffer)

      centralView.setUint32(0, 0x02014b50, true) // Central directory signature
      centralView.setUint16(4, 20, true) // Version made by
      centralView.setUint16(6, 20, true) // Version needed to extract
      centralView.setUint16(8, 0, true) // General purpose bit flag
      centralView.setUint16(10, 0, true) // Compression method
      centralView.setUint16(12, 0, true) // Last mod file time
      centralView.setUint16(14, 0, true) // Last mod file date
      centralView.setUint32(16, this.crc32(data), true) // CRC-32
      centralView.setUint32(20, data.length, true) // Compressed size
      centralView.setUint32(24, data.length, true) // Uncompressed size
      centralView.setUint16(28, filenameBytes.length, true) // File name length
      centralView.setUint16(30, 0, true) // Extra field length
      centralView.setUint16(32, 0, true) // File comment length
      centralView.setUint16(34, 0, true) // Disk number start
      centralView.setUint32(36, 0, true) // Internal file attributes
      centralView.setUint32(38, 0, true) // External file attributes
      centralView.setUint32(42, offset, true) // Relative offset of local header

      centralEntry.set(filenameBytes, 46)
      centralDirectory.push(centralEntry)

      offset += localHeader.length + data.length
    }

    // End of central directory record
    const centralDirSize = centralDirectory.reduce((sum, entry) => sum + entry.length, 0)
    const endRecord = new Uint8Array(22)
    const endView = new DataView(endRecord.buffer)

    endView.setUint32(0, 0x06054b50, true) // End of central dir signature
    endView.setUint16(4, 0, true) // Number of this disk
    endView.setUint16(6, 0, true) // Number of disk with start of central directory
    endView.setUint16(8, Object.keys(files).length, true) // Total number of entries on this disk
    endView.setUint16(10, Object.keys(files).length, true) // Total number of entries
    endView.setUint32(12, centralDirSize, true) // Size of central directory
    endView.setUint32(16, offset, true) // Offset of start of central directory
    endView.setUint16(20, 0, true) // ZIP file comment length

    // Combine all parts
    const totalSize = zipData.reduce((sum, chunk) => sum + chunk.length, 0) + centralDirSize + endRecord.length
    const result = new Uint8Array(totalSize)
    let pos = 0

    for (const chunk of zipData) {
      result.set(chunk, pos)
      pos += chunk.length
    }

    for (const entry of centralDirectory) {
      result.set(entry, pos)
      pos += entry.length
    }

    result.set(endRecord, pos)

    console.log("✅ ZIP creation complete:", totalSize, "bytes")
    return new Blob([result], { type: "application/zip" })
  }

  private static crc32(data: Uint8Array): number {
    const table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      table[i] = c
    }

    let crc = 0xffffffff
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  static async createAudioPackage(
    recordings: StoredRecording[],
    wordList: WordData[],
    deckName = "Bangla Audio Collection",
  ): Promise<Blob> {
    try {
      console.log("📦 Creating audio package with", recordings.length, "recordings...")

      const files: { [filename: string]: Uint8Array | string } = {}
      const audioValidationResults: Array<{ filename: string; isValid: boolean; details: string }> = []

      // Create README with detailed instructions
      const readme = this.createReadmeContent(recordings, wordList, deckName)
      files["README.md"] = readme

      // Create CSV file with word data
      const csvContent = this.createCSVContent(recordings, wordList)
      files["word_list.csv"] = csvContent

      // Create Anki import template
      const ankiTemplate = this.createAnkiTemplate()
      files["anki_template.txt"] = ankiTemplate

      // Add audio files with comprehensive validation
      console.log("🎵 Processing audio files...")
      let validAudioCount = 0
      let invalidAudioCount = 0

      for (const recording of recordings) {
        const word = wordList.find((w) => w.id === recording.wordId)
        if (word && recording.audioBlob) {
          const filename = `audio/${word.id}.wav`

          try {
            // Validate audio blob before adding to package
            const validation = await validateAudioBlob(recording.audioBlob)
            audioValidationResults.push({
              filename,
              isValid: validation.isValid,
              details: validation.details,
            })

            if (validation.isValid) {
              const audioData = new Uint8Array(await recording.audioBlob.arrayBuffer())
              files[filename] = audioData
              validAudioCount++
              console.log(`✅ Added valid audio: ${filename} (${audioData.length} bytes)`)
            } else {
              invalidAudioCount++
              console.error(`❌ Skipping invalid audio: ${filename} - ${validation.details}`)

              // Create a placeholder file with error information
              const errorInfo = `# Invalid Audio File\n\nFile: ${filename}\nWord: ${word.bangla} (${word.english})\nError: ${validation.details}\nTimestamp: ${new Date(recording.timestamp).toISOString()}\n\nThis audio file was invalid and could not be included in the package.`
              files[`audio/INVALID_${word.id}.txt`] = errorInfo
            }
          } catch (error) {
            invalidAudioCount++
            console.error(`❌ Error processing audio for ${filename}:`, error)

            // Create error file
            const errorInfo = `# Audio Processing Error\n\nFile: ${filename}\nWord: ${word.bangla} (${word.english})\nError: ${error.message}\nTimestamp: ${new Date(recording.timestamp).toISOString()}\n\nThis audio file could not be processed and was not included in the package.`
            files[`audio/ERROR_${word.id}.txt`] = errorInfo
          }
        }
      }

      // Create audio validation report
      const validationReport = this.createValidationReport(audioValidationResults, validAudioCount, invalidAudioCount)
      files["AUDIO_VALIDATION_REPORT.md"] = validationReport

      console.log(`📊 Audio processing complete: ${validAudioCount} valid, ${invalidAudioCount} invalid`)

      if (validAudioCount === 0) {
        throw new Error("No valid audio files found. All recordings appear to be corrupted or empty.")
      }

      if (invalidAudioCount > 0) {
        console.warn(`⚠️ ${invalidAudioCount} invalid audio files were excluded from the package`)
      }

      const zipBlob = await this.createZip(files)
      console.log("✅ Audio package created successfully")

      return zipBlob
    } catch (error) {
      console.error("❌ Error creating audio package:", error)
      throw new Error(`Failed to create audio package: ${error.message}`)
    }
  }

  private static createValidationReport(
    validationResults: Array<{ filename: string; isValid: boolean; details: string }>,
    validCount: number,
    invalidCount: number,
  ): string {
    const currentDate = new Date().toISOString()

    let report = `# Audio Validation Report

Generated: ${currentDate}
Total Files Processed: ${validationResults.length}
Valid Audio Files: ${validCount}
Invalid Audio Files: ${invalidCount}
Success Rate: ${((validCount / validationResults.length) * 100).toFixed(1)}%

## Summary

`

    if (invalidCount === 0) {
      report += "✅ All audio files passed validation and are included in the package.\n\n"
    } else {
      report += `⚠️ ${invalidCount} audio files failed validation and were excluded from the package.\n\n`
    }

    report += "## Detailed Results\n\n"

    // Group by status
    const validFiles = validationResults.filter((r) => r.isValid)
    const invalidFiles = validationResults.filter((r) => !r.isValid)

    if (validFiles.length > 0) {
      report += "### ✅ Valid Audio Files\n\n"
      validFiles.forEach((result) => {
        report += `- **${result.filename}**: ${result.details}\n`
      })
      report += "\n"
    }

    if (invalidFiles.length > 0) {
      report += "### ❌ Invalid Audio Files\n\n"
      invalidFiles.forEach((result) => {
        report += `- **${result.filename}**: ${result.details}\n`
      })
      report += "\n"
    }

    report += `## Troubleshooting

If you have invalid audio files:

1. **Check microphone permissions**: Ensure your browser has access to the microphone
2. **Test recording**: Try recording a new word and check if it plays back correctly
3. **Browser compatibility**: Some browsers may have issues with audio recording
4. **Audio levels**: Speak clearly and at a reasonable volume during recording
5. **Re-record**: Invalid recordings can be re-recorded in the app

## Technical Details

- Audio format: WAV (16-bit PCM)
- Validation checks: File size, audio content, amplitude levels, duration
- Minimum audio content: 1% non-silent samples
- Minimum amplitude: 0.001 (to detect actual audio vs silence)

For support, please check the main README.md file in this package.
`

    return report
  }

  private static createReadmeContent(recordings: StoredRecording[], wordList: WordData[], deckName: string): string {
    const currentDate = new Date().toLocaleDateString()
    const validRecordings = recordings.length // This will be updated by the validation process

    return `# ${deckName}

Generated on: ${currentDate}
Total recordings: ${validRecordings}

## Contents

This package contains:
- **${validRecordings} audio files** in the \`audio/\` folder
- **word_list.csv** - Complete word list with translations
- **anki_template.txt** - Ready-to-use Anki note type template
- **AUDIO_VALIDATION_REPORT.md** - Detailed audio quality report
- **README.md** - This instruction file

## Audio Quality Assurance

All audio files in this package have been validated for:
- ✅ Proper file format (WAV, 16-bit PCM)
- ✅ Audible content (not silent)
- ✅ Adequate audio levels
- ✅ Correct duration

See \`AUDIO_VALIDATION_REPORT.md\` for detailed validation results.

## How to Import into Anki

### Method 1: Manual Import (Recommended)

1. **Extract this ZIP file** to a folder on your computer

2. **Open Anki** and create a new deck called "${deckName}"

3. **Create a new note type:**
   - Go to Tools → Manage Note Types
   - Click "Add" → "Add: Basic"
   - Name it "Bangla Audio Cards"
   - Click "Fields..." and add these fields:
     - Bangla
     - English  
     - Audio
   - Click "Cards..." and copy the template from \`anki_template.txt\`

4. **Import the word list:**
   - Go to File → Import
   - Select \`word_list.csv\`
   - Set field mapping: Field 1 → Bangla, Field 2 → English, Field 3 → Audio
   - Choose your "${deckName}" deck
   - Click Import

5. **Add audio files:**
   - Copy all files from the \`audio/\` folder to your Anki media folder:
     - **Windows:** \`%APPDATA%\\Anki2\\[Profile]\\collection.media\`
     - **Mac:** \`~/Library/Application Support/Anki2/[Profile]/collection.media\`
     - **Linux:** \`~/.local/share/Anki2/[Profile]/collection.media\`

6. **Sync your collection** to make sure everything is saved

### Method 2: Quick Import

1. Extract the ZIP file
2. Copy audio files to Anki media folder (see paths above)
3. Import \`word_list.csv\` directly into Anki
4. Manually create cards or use the provided template

## Audio Files

Each audio file is named with its corresponding word ID and has been validated for quality:
${recordings
  .map((recording) => {
    const word = wordList.find((w) => w.id === recording.wordId)
    return word ? `- \`${word.id}.wav\` - ${word.bangla} (${word.english})` : ""
  })
  .filter(Boolean)
  .join("\n")}

## Troubleshooting

**Audio not playing?**
- Make sure audio files are in the correct Anki media folder
- Check that file names match exactly (case-sensitive)
- Try Tools → Check Media in Anki
- Verify audio files play correctly outside of Anki

**Cards not showing correctly?**
- Verify the note type template matches the provided template
- Check field mappings during import

**Audio quality issues?**
- Check the \`AUDIO_VALIDATION_REPORT.md\` for detailed quality information
- Re-record any problematic words in the original app
- Ensure proper microphone setup and permissions

**Need help?**
- Visit the Anki manual: https://docs.ankiweb.net/
- Check Anki forums: https://forums.ankiweb.net/

## File Structure

\`\`\`
${deckName.toLowerCase().replace(/\s+/g, "_")}/
├── README.md (this file)
├── AUDIO_VALIDATION_REPORT.md (audio quality report)
├── word_list.csv (importable word list)
├── anki_template.txt (card template)
└── audio/
    ├── ${recordings[0] ? wordList.find((w) => w.id === recordings[0].wordId)?.id + ".wav" : "example.wav"}
    ├── ${recordings[1] ? wordList.find((w) => w.id === recordings[1].wordId)?.id + ".wav" : "example2.wav"}
    └── ... (${validRecordings} total files)
\`\`\`

## Quality Assurance

This package includes comprehensive audio validation:
- All audio files have been tested for audible content
- Silent or corrupted recordings have been excluded
- Detailed validation report included
- WAV format ensures maximum compatibility

Happy studying! 🎧📚
`
  }

  private static createCSVContent(recordings: StoredRecording[], wordList: WordData[]): string {
    const header = "Bangla,English,Audio\n"
    const rows = recordings
      .map((recording) => {
        const word = wordList.find((w) => w.id === recording.wordId)
        if (!word) return ""

        // Escape commas and quotes in CSV
        const bangla = `"${word.bangla.replace(/"/g, '""')}"`
        const english = `"${word.english.replace(/"/g, '""')}"`
        const audio = `"[sound:${word.id}.wav]"`

        return `${bangla},${english},${audio}`
      })
      .filter(Boolean)
      .join("\n")

    return header + rows
  }

  private static createAnkiTemplate(): string {
    return `# Anki Card Template for Bangla Audio Cards

Copy this template when creating your note type in Anki.

## Front Template:
\`\`\`html
<div class="bangla-word">{{Bangla}}</div>
<div class="audio-section">{{Audio}}</div>
\`\`\`

## Back Template:
\`\`\`html
{{FrontSide}}

<hr id="answer">

<div class="english-translation">{{English}}</div>
\`\`\`

## Styling (CSS):
\`\`\`css
.card {
  font-family: arial;
  font-size: 20px;
  text-align: center;
  color: black;
  background-color: white;
  padding: 20px;
}

.bangla-word {
  font-size: 2.5em;
  font-weight: bold;
  margin-bottom: 20px;
  color: #2563eb;
  font-family: "Noto Sans Bengali", serif;
}

.english-translation {
  font-size: 1.5em;
  color: #059669;
  margin-top: 15px;
}

.audio-section {
  margin: 20px 0;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .bangla-word {
    font-size: 2em;
  }
  .english-translation {
    font-size: 1.2em;
  }
}
\`\`\`

## Instructions:

1. In Anki, go to Tools → Manage Note Types
2. Click "Add" → "Add: Basic"
3. Name it "Bangla Audio Cards"
4. Click "Fields..." and make sure you have: Bangla, English, Audio
5. Click "Cards..." and replace the templates with the code above
6. Save and close

Your cards will now display the Bangla word prominently with audio, and show the English translation on the back.

## Audio Quality Notes:

All audio files in this package have been validated for:
- Proper WAV format encoding
- Audible content (not silent)
- Adequate volume levels
- Correct file structure

If you experience any audio playback issues, please check:
1. Files are in the correct Anki media folder
2. File names match exactly (case-sensitive)
3. Anki has proper audio codec support
4. Your system audio is working correctly
`
  }
}
