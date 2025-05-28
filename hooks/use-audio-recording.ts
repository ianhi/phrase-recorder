"use client"

import { useState, useRef, useCallback } from "react"
import { trimAudioSilence, validateAudioBlob, audioBufferToWav } from "@/lib/audio-utils" // Import audioBufferToWav
import type { TrimData, AppSettings } from "@/types" // Import AppSettings

export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isTrimming, setIsTrimming] = useState(false) // Use isTrimming to indicate any processing
  const [trimData, setTrimData] = useState<TrimData | null>(null)
  const [isProcessed, setIsProcessed] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const processingRef = useRef(false) // To prevent multiple simultaneous processing

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
        setIsProcessed(false) // Mark as not processed yet, will be processed by useEffect
      }

      mediaRecorder.onerror = (event) => {
        console.error("❌ MediaRecorder error:", event)
        alert("Recording error occurred. Please try again.")
        setIsRecording(false)
      }

      mediaRecorder.start(100) // Collect data every 100ms for better quality
      setIsRecording(true)
      console.log("🎤 Recording started with settings:", options)
    } catch (error: unknown) {
      console.error("❌ Error starting recording:", error);

      let errorMessage = "Error accessing microphone. ";
      if (error instanceof Error) {
        errorMessage += error.message;
        if (error.name === "NotAllowedError") {
          errorMessage = "Please grant microphone permission and try again.";
        } else if (error.name === "NotFoundError") {
        errorMessage = "No microphone found. Please connect a microphone and try again.";
        } else {
          errorMessage += " Please check your microphone settings and try again.";
        }
      } else if (typeof error === 'string') {
        errorMessage += error;
      } else {
        errorMessage += " Please check your microphone settings and try again.";
      }

      alert(errorMessage);
      setIsRecording(false);
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
    async (settings: AppSettings) => { // Accept AppSettings object
      if (!audioBlob || processingRef.current || isProcessed) {
        return { blob: audioBlob, trimData };
      }

      processingRef.current = true;
      setIsTrimming(true); // Indicate processing is starting

      let currentBlob = audioBlob;
      let currentTrimData: TrimData | null = null;
      let processedAudioBuffer: AudioBuffer;

      try {
        // Step 1: Handle Auto-trimming
        if (settings.autoTrimEnabled) {
          console.log("✂️ Starting audio trim processing with relative silence fraction:", settings.relativeSilenceFraction);
          const trimResult = await trimAudioSilence(audioBlob, settings.relativeSilenceFraction);
          currentBlob = trimResult.blob;
          currentTrimData = trimResult.trimData;
          setTrimData(currentTrimData);

          // Validate the trimmed audio blob
          const validation = await validateAudioBlob(currentBlob);
          if (!validation.isValid) {
            console.error("❌ Trimmed audio validation failed:", validation.details);
            console.log("🔄 Falling back to original audio after failed trim validation");
            currentBlob = audioBlob; // Fallback to original
            currentTrimData = null;
            // Need to re-decode original blob if trimming failed validation
            const audioContext = new AudioContext();
            const arrayBuffer = await audioBlob.arrayBuffer();
            processedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            await audioContext.close();
          } else {
            console.log("✅ Trimmed audio validation passed:", validation.details);
            // Decode the valid trimmed blob for further processing
            const audioContext = new AudioContext();
            const arrayBuffer = await currentBlob.arrayBuffer();
            processedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            await audioContext.close();
          }
        } else {
          console.log("⏭️ Auto-trim disabled, skipping trim processing.");
          // If trimming is disabled, decode the original blob for processing
          const audioContext = new AudioContext();
          const arrayBuffer = await audioBlob.arrayBuffer();
          processedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          await audioContext.close();
        }

        // Step 2: Handle Extra Audio Processing (Compression, etc.)
        if (settings.extraProcessingEnabled) {
          console.log("✨ Extra audio processing enabled.");

          // Apply Dynamic Range Compression if enabled
          if (settings.compressionEnabled) {
            console.log("🎛️ Applying dynamic range compression:", {
              threshold: settings.compressionThreshold,
              ratio: settings.compressionRatio,
              attack: settings.compressionAttack,
              release: settings.compressionRelease,
            });

            // Use OfflineAudioContext for processing
            const audioContext = new OfflineAudioContext(
              processedAudioBuffer.numberOfChannels,
              processedAudioBuffer.length,
              processedAudioBuffer.sampleRate
            );

            const source = audioContext.createBufferSource();
            source.buffer = processedAudioBuffer;

            const compressor = audioContext.createDynamicsCompressor();
            // The threshold parameter in Web Audio API's DynamicsCompressorNode is in dB, not linear gain reduction.
            // So we can use the settings value directly.
            compressor.threshold.setValueAtTime(settings.compressionThreshold, audioContext.currentTime);
            compressor.ratio.setValueAtTime(settings.compressionRatio, audioContext.currentTime);
            compressor.attack.setValueAtTime(settings.compressionAttack, audioContext.currentTime);
            compressor.release.setValueAtTime(settings.compressionRelease, audioContext.currentTime);

            source.connect(compressor);
            compressor.connect(audioContext.destination);

            source.start(0);
            processedAudioBuffer = await audioContext.startRendering();

            console.log("✅ Dynamic range compression applied.");
          } else {
            console.log("⏭️ Compression disabled, skipping compression.");
          }

          // Add other extra processing steps here if needed in the future
          // ...

        } else {
          console.log("⏭️ Extra audio processing disabled, skipping.");
        }

        // Step 3: Convert the final processed AudioBuffer back to WAV blob
        const finalBlob = audioBufferToWav(processedAudioBuffer);

        // Final validation of the output blob
        const finalValidation = await validateAudioBlob(finalBlob);
        if (!finalValidation.isValid) {
          console.error("❌ Final processed audio validation failed:", finalValidation.details);
          console.log("🔄 Falling back to original audio after final processing failure");
          // If final processing results in invalid audio, revert to original blob
          // Note: This might lose trimming if trimming was successful but subsequent processing failed
          // A more robust approach might involve saving intermediate valid blobs
          const audioContext = new AudioContext();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          await audioContext.close();
          const originalWavBlob = audioBufferToWav(originalAudioBuffer);
          setAudioBlob(originalWavBlob);
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
          const newUrl = URL.createObjectURL(originalWavBlob);
          setAudioUrl(newUrl);
          setTrimData(null); // Clear trim data as original audio is used
        } else {
          console.log("✅ Final processed audio validation passed:", finalValidation.details);
          // Update audio blob and URL with the final processed version
          setAudioBlob(finalBlob);
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
          const newUrl = URL.createObjectURL(finalBlob);
          setAudioUrl(newUrl);
          // trimData is already set after the trim step if successful
        }

        console.log("✅ Audio processing completed.");

        return { blob: finalBlob, trimData: currentTrimData }; // Return the final blob and trimData
      } catch (error: unknown) {
        console.error("❌ Audio processing failed:", error);
        let errorMessage = "Audio processing failed.";
         if (error instanceof Error) {
           errorMessage += ` ${error.message}`;
         } else if (typeof error === 'string') {
           errorMessage += ` ${error}`;
         }
        alert(errorMessage + "\n\nUsing original audio.");

        // On any processing error, fall back to the original audio blob
        const audioContext = new AudioContext();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const originalAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        await audioContext.close();
        const originalWavBlob = audioBufferToWav(originalAudioBuffer);
        setAudioBlob(originalWavBlob);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        const newUrl = URL.createObjectURL(originalWavBlob);
        setAudioUrl(newUrl);
        setTrimData(null); // Clear trim data as original audio is used

        return { blob: originalWavBlob, trimData: null };
      } finally {
        setIsTrimming(false); // isTrimming covers all processing steps now
        setIsProcessed(true);
        processingRef.current = false;
      }
    },
    [audioBlob, audioUrl, setAudioBlob, setAudioUrl, setTrimData, setIsTrimming, setIsProcessed, processingRef], // Dependencies
  );

  const resetRecording = useCallback(() => {
    console.log("🔄 Resetting recording state");

    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setTrimData(null);
    setIsTrimming(false);
    setIsProcessed(false);
    processingRef.current = false;
  }, [audioUrl, setAudioBlob, setAudioUrl, setTrimData, setIsTrimming, setIsProcessed, processingRef]);

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
  };
}
