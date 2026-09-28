import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  FlipHorizontal,
  Circle,
  Square,
  Film,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/tokens'
import type { Recording } from '@/types'

interface CameraPanelProps {
  onRecorded: (rec: Recording) => void
  onOpenGallery: () => void
  galleryCount: number
}

export function CameraPanel({
  onRecorded,
  onOpenGallery,
  galleryCount,
}: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [micOn, setMicOn] = useState(true)
  const [mirror, setMirror] = useState(true)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  // (Re)acquire the media stream when camera/mic toggles change.
  const startStream = useCallback(
    async (video: boolean, audio: boolean) => {
      setError(null)
      stopStream()
      if (!video && !audio) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: video ? { facingMode: 'user' } : false,
          audio,
        })
        streamRef.current = stream
        if (videoRef.current && video) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not access camera / microphone.',
        )
        setCameraOn(false)
      }
    },
    [stopStream],
  )

  // Toggle camera.
  async function toggleCamera() {
    const next = !cameraOn
    setCameraOn(next)
    if (recording) return // mid-recording: don't yank the stream
    await startStream(next, next ? micOn : false)
  }

  // Toggle mic — re-acquire so the audio track is added/removed.
  async function toggleMic() {
    const next = !micOn
    setMicOn(next)
    if (cameraOn && !recording) {
      await startStream(true, next)
    }
  }

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType: mime })

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      onRecorded({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(blob),
        blob,
        size: blob.size,
        duration,
        timestamp: Date.now(),
      })
    }

    recorder.start()
    recorderRef.current = recorder
    startTimeRef.current = Date.now()
    setElapsed(0)
    setRecording(true)
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000))
    }, 250)
  }

  function stopRecording() {
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
    stopTimer()
  }

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopTimer()
      stopStream()
    }
  }, [stopStream])

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Video className="h-4 w-4 text-amber" /> Camera
        </h3>
        <Button variant="ghost" size="sm" onClick={onOpenGallery}>
          <Film className="h-4 w-4" /> Gallery
          {galleryCount > 0 && (
            <span className="ml-1 rounded-full bg-amber px-1.5 text-xs font-semibold text-[#0f1117]">
              {galleryCount}
            </span>
          )}
        </Button>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'h-full w-full object-cover',
            mirror && 'scale-x-[-1]',
            !cameraOn && 'hidden',
          )}
        />
        {!cameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <VideoOff className="h-8 w-8" />
            <span className="text-xs">Camera off</span>
          </div>
        )}
        {recording && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-red-500 backdrop-blur">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            REC {formatClock(elapsed)}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant={cameraOn ? 'secondary' : 'outline'}
          size="sm"
          onClick={toggleCamera}
        >
          {cameraOn ? (
            <Video className="h-4 w-4" />
          ) : (
            <VideoOff className="h-4 w-4" />
          )}
          {cameraOn ? 'On' : 'Off'}
        </Button>
        <Button
          variant={micOn ? 'secondary' : 'outline'}
          size="sm"
          onClick={toggleMic}
        >
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          {micOn ? 'Mic' : 'Muted'}
        </Button>
        <Button
          variant={mirror ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setMirror((m) => !m)}
        >
          <FlipHorizontal className="h-4 w-4" />
          {mirror ? 'Mirror' : 'Normal'}
        </Button>
      </div>

      {!recording ? (
        <Button
          onClick={startRecording}
          disabled={!cameraOn}
          className="bg-red-600 text-white hover:bg-red-500"
        >
          <Circle className="h-4 w-4 fill-current" /> Record
        </Button>
      ) : (
        <Button onClick={stopRecording} variant="secondary">
          <Square className="h-4 w-4 fill-current" /> Stop ({formatClock(elapsed)})
        </Button>
      )}
    </div>
  )
}
