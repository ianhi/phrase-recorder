import type { WaveformData, TrimData } from "@/types"

// Enhanced audio validation and debugging
const validateAudioBuffer = (audioBuffer: AudioBuffer): { isValid: boolean; details: string } => {
  if (!audioBuffer) {
    return { isValid: false, details: "AudioBuffer is null or undefined" }
  }

  if (audioBuffer.length === 0) {
    return { isValid: false, details: "AudioBuffer has zero length" }
  }

  if (audioBuffer.numberOfChannels === 0) {
    return { isValid: false, details: "AudioBuffer has no channels" }
  }

  // Check for actual audio content (not just silence)
  const channelData = audioBuffer.getChannelData(0)
  let maxAmplitude = 0
  let nonZeroSamples = 0

  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.abs(channelData[i])
    if (sample > maxAmplitude) {
      maxAmplitude = sample
    }
    if (sample > 0.001) {
      nonZeroSamples++
    }
  }

  const audioPercentage = (nonZeroSamples / channelData.length) * 100

  if (maxAmplitude < 0.001) {
    return {
      isValid: false,
      details: `Audio appears to be silent (max amplitude: ${maxAmplitude.toFixed(6)})`,
    }
  }

  if (audioPercentage < 1) {
    return {
      isValid: false,
      details: `Very little audio content detected (${audioPercentage.toFixed(2)}% non-silent)`,
    }
  }

  return {
    isValid: true,
    details: `Valid audio: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels} channels, max amplitude: ${maxAmplitude.toFixed(3)}, ${audioPercentage.toFixed(1)}% audio content`,
  }
}

// Enhanced blob validation
export const validateAudioBlob = async (blob: Blob): Promise<{ isValid: boolean; details: string }> => {
  if (!blob) {
    return { isValid: false, details: "Blob is null or undefined" }
  }

  if (blob.size === 0) {
    return { isValid: false, details: "Blob has zero size" }
  }

  if (blob.size < 1000) {
    return { isValid: false, details: `Blob is very small (${blob.size} bytes) - likely contains no audio` }
  }

  // Try to decode the blob to verify it contains valid audio
  try {
    const audioContext = new AudioContext()
    const arrayBuffer = await blob.arrayBuffer()

    if (arrayBuffer.byteLength === 0) {
      return { isValid: false, details: "ArrayBuffer has zero length" }
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const validation = validateAudioBuffer(audioBuffer)

    await audioContext.close()

    return {
      isValid: validation.isValid,
      details: `Blob: ${blob.size} bytes, ${blob.type} | ${validation.details}`,
    }
  } catch (error) {
    return {
      isValid: false,
      details: `Failed to decode audio blob: ${error.message}`,
    }
  }
}

// Generate waveform data from audio buffer
export const generateWaveformData = (audioBuffer: AudioBuffer, samplesCount = 400): WaveformData => {
  const validation = validateAudioBuffer(audioBuffer)
  console.log("🎵 Generating waveform:", validation.details)

  const channelData = audioBuffer.getChannelData(0)
  const samples: number[] = []
  const blockSize = Math.floor(channelData.length / samplesCount)

  for (let i = 0; i < samplesCount; i++) {
    const start = i * blockSize
    const end = Math.min(start + blockSize, channelData.length)

    let sum = 0
    for (let j = start; j < end; j++) {
      sum += channelData[j] * channelData[j]
    }
    const rms = Math.sqrt(sum / (end - start))
    samples.push(rms)
  }

  return {
    samples,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
  }
}

// Helper function to recreate AudioBuffer from Blob with validation
export const recreateAudioBufferFromBlob = async (blob: Blob): Promise<AudioBuffer> => {
  console.log("🔄 Recreating AudioBuffer from blob:", blob.size, "bytes")

  const validation = await validateAudioBlob(blob)
  if (!validation.isValid) {
    throw new Error(`Invalid audio blob: ${validation.details}`)
  }

  const audioContext = new AudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const bufferValidation = validateAudioBuffer(audioBuffer)
  console.log("✅ AudioBuffer recreated:", bufferValidation.details)

  await audioContext.close()
  return audioBuffer
}

// Enhanced WAV conversion with proper encoding and validation
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  console.log("🎵 Converting AudioBuffer to WAV:", {
    duration: buffer.duration,
    channels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
    length: buffer.length,
  })

  const validation = validateAudioBuffer(buffer)
  if (!validation.isValid) {
    console.error("❌ Invalid AudioBuffer for WAV conversion:", validation.details)
    throw new Error(`Cannot convert invalid AudioBuffer to WAV: ${validation.details}`)
  }

  const length = buffer.length
  const numberOfChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2 // 16-bit
  const blockAlign = numberOfChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = length * blockAlign
  const bufferSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)

  // Helper function to write string to DataView
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  // WAV header
  writeString(0, "RIFF") // ChunkID
  view.setUint32(4, bufferSize - 8, true) // ChunkSize
  writeString(8, "WAVE") // Format
  writeString(12, "fmt ") // Subchunk1ID
  view.setUint32(16, 16, true) // Subchunk1Size (PCM = 16)
  view.setUint16(20, 1, true) // AudioFormat (PCM = 1)
  view.setUint16(22, numberOfChannels, true) // NumChannels
  view.setUint32(24, sampleRate, true) // SampleRate
  view.setUint32(28, byteRate, true) // ByteRate
  view.setUint16(32, blockAlign, true) // BlockAlign
  view.setUint16(34, 16, true) // BitsPerSample
  writeString(36, "data") // Subchunk2ID
  view.setUint32(40, dataSize, true) // Subchunk2Size

  // Convert audio data to 16-bit PCM
  let offset = 44
  let maxSample = 0
  let minSample = 0
  let nonZeroSamples = 0

  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i]

      // Track audio statistics
      if (Math.abs(sample) > 0.001) nonZeroSamples++
      if (sample > maxSample) maxSample = sample
      if (sample < minSample) minSample = sample

      // Clamp sample to [-1, 1] and convert to 16-bit integer
      const clampedSample = Math.max(-1, Math.min(1, sample))
      const intSample = Math.round(clampedSample * 0x7fff)

      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  const audioPercentage = (nonZeroSamples / (length * numberOfChannels)) * 100

  console.log("🎵 WAV conversion complete:", {
    fileSize: bufferSize,
    audioPercentage: audioPercentage.toFixed(1) + "%",
    maxSample: maxSample.toFixed(3),
    minSample: minSample.toFixed(3),
    nonZeroSamples,
  })

  if (audioPercentage < 1) {
    console.warn("⚠️ WAV file may be mostly silent:", audioPercentage.toFixed(2) + "% audio content")
  }

  const blob = new Blob([arrayBuffer], { type: "audio/wav" })

  // Validate the created blob
  validateAudioBlob(blob).then((validation) => {
    if (validation.isValid) {
      console.log("✅ WAV blob validation passed:", validation.details)
    } else {
      console.error("❌ WAV blob validation failed:", validation.details)
    }
  })

  return blob
}

// Enhanced audio trimming with comprehensive validation
export const trimAudioSilence = async (audioBlob: Blob): Promise<{ blob: Blob; trimData: TrimData }> => {
  try {
    console.log("🎵 Starting audio trim process...")

    // Validate input blob
    const blobValidation = await validateAudioBlob(audioBlob)
    if (!blobValidation.isValid) {
      console.error("❌ Input blob validation failed:", blobValidation.details)
      throw new Error(`Invalid input audio blob: ${blobValidation.details}`)
    }

    console.log("✅ Input blob validation passed:", blobValidation.details)

    const audioContext = new AudioContext()
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Validate decoded audio buffer
    const bufferValidation = validateAudioBuffer(audioBuffer)
    if (!bufferValidation.isValid) {
      console.error("❌ AudioBuffer validation failed:", bufferValidation.details)
      await audioContext.close()
      throw new Error(`Invalid AudioBuffer: ${bufferValidation.details}`)
    }

    console.log("✅ AudioBuffer validation passed:", bufferValidation.details)

    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const silenceThreshold = 0.01 // Increased threshold for better detection

    const originalWaveform = generateWaveformData(audioBuffer)
    console.log("📊 Generated original waveform data")

    // Find start of audio (first non-silent sample)
    let startSample = 0
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > silenceThreshold) {
        startSample = Math.max(0, i - Math.floor(sampleRate * 0.05)) // 50ms buffer
        break
      }
    }

    // Find end of audio (last non-silent sample)
    let endSample = channelData.length
    for (let i = channelData.length - 1; i >= 0; i--) {
      if (Math.abs(channelData[i]) > silenceThreshold) {
        endSample = Math.min(channelData.length, i + Math.floor(sampleRate * 0.05)) // 50ms buffer
        break
      }
    }

    const trimStart = startSample / sampleRate
    const trimEnd = endSample / sampleRate
    const trimmedDuration = trimEnd - trimStart

    console.log("✂️ Trim points calculated:", {
      originalDuration: audioBuffer.duration.toFixed(3) + "s",
      trimStart: trimStart.toFixed(3) + "s",
      trimEnd: trimEnd.toFixed(3) + "s",
      trimmedDuration: trimmedDuration.toFixed(3) + "s",
      startSample,
      endSample,
      totalSamples: channelData.length,
    })

    // Validate trim points
    if (endSample <= startSample || trimmedDuration < 0.1) {
      console.warn("⚠️ Invalid trim points or audio too short, returning original")
      await audioContext.close()
      return {
        blob: audioBlob,
        trimData: {
          originalWaveform,
          trimmedWaveform: originalWaveform,
          trimStart: 0,
          trimEnd: audioBuffer.duration,
          originalAudioBuffer: audioBuffer,
        },
      }
    }

    // Create trimmed buffer
    const trimmedLength = endSample - startSample
    const trimmedBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, trimmedLength, audioBuffer.sampleRate)

    // Copy audio data to trimmed buffer
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel)
      const trimmedData = trimmedBuffer.getChannelData(channel)

      for (let i = 0; i < trimmedLength; i++) {
        trimmedData[i] = originalData[startSample + i]
      }
    }

    // Validate trimmed buffer
    const trimmedValidation = validateAudioBuffer(trimmedBuffer)
    if (!trimmedValidation.isValid) {
      console.error("❌ Trimmed buffer validation failed:", trimmedValidation.details)
      await audioContext.close()
      throw new Error(`Trimmed audio is invalid: ${trimmedValidation.details}`)
    }

    console.log("✅ Trimmed buffer validation passed:", trimmedValidation.details)

    const trimmedWaveform = generateWaveformData(trimmedBuffer)
    console.log("📊 Generated trimmed waveform data")

    // Render trimmed audio using OfflineAudioContext for better quality
    const offlineContext = new OfflineAudioContext(
      trimmedBuffer.numberOfChannels,
      trimmedBuffer.length,
      trimmedBuffer.sampleRate,
    )

    const source = offlineContext.createBufferSource()
    source.buffer = trimmedBuffer
    source.connect(offlineContext.destination)
    source.start()

    console.log("🎵 Starting offline audio rendering...")
    const renderedBuffer = await offlineContext.startRendering()

    // Validate rendered buffer
    const renderedValidation = validateAudioBuffer(renderedBuffer)
    if (!renderedValidation.isValid) {
      console.error("❌ Rendered buffer validation failed:", renderedValidation.details)
      await audioContext.close()
      throw new Error(`Rendered audio is invalid: ${renderedValidation.details}`)
    }

    console.log("✅ Rendered buffer validation passed:", renderedValidation.details)

    // Convert to WAV
    const wavBlob = audioBufferToWav(renderedBuffer)

    // Final validation of output blob
    const finalValidation = await validateAudioBlob(wavBlob)
    if (!finalValidation.isValid) {
      console.error("❌ Final WAV blob validation failed:", finalValidation.details)
      await audioContext.close()
      throw new Error(`Final WAV blob is invalid: ${finalValidation.details}`)
    }

    console.log("✅ Audio trim process completed successfully:", finalValidation.details)
    await audioContext.close()

    return {
      blob: wavBlob,
      trimData: {
        originalWaveform,
        trimmedWaveform,
        trimStart,
        trimEnd,
        originalAudioBuffer: audioBuffer,
      },
    }
  } catch (error) {
    console.error("❌ Error trimming audio:", error)
    throw error
  }
}

// Parse CSV file
export const parseCSV = (csvText: string): import("@/types").WordData[] => {
  const lines = csvText.trim().split("\n")
  const words: import("@/types").WordData[] = []

  const startIndex = lines[0].toLowerCase().includes("id") || lines[0].toLowerCase().includes("bangla") ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const columns = line.split(",").map((col) => col.trim().replace(/^["']|["']$/g, ""))

    if (columns.length >= 3) {
      words.push({
        id: columns[0],
        bangla: columns[1],
        english: columns[2],
      })
    }
  }

  return words
}

// Enhanced download file utility with validation
export const downloadFile = async (blob: Blob, filename: string) => {
  console.log("💾 Downloading file:", filename, blob.size, "bytes")

  // Validate blob before download
  if (blob.type.startsWith("audio/")) {
    const validation = await validateAudioBlob(blob)
    if (!validation.isValid) {
      console.error("❌ Attempting to download invalid audio file:", validation.details)
      alert(
        `Warning: The audio file may be corrupted or empty.\n\nDetails: ${validation.details}\n\nDownload will continue, but the file may not play correctly.`,
      )
    } else {
      console.log("✅ Audio file validation passed for download:", validation.details)
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  console.log("✅ File download initiated:", filename)
}
