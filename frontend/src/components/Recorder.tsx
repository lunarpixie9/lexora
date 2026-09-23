import { Mic, Square, Trash2, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface Recording { blob: Blob; url: string; duration: number; filename: string }

/**
 * Browser microphone recorder built on MediaRecorder. Produces WebM/Opus in
 * Chromium/Firefox and MP4/AAC in Safari; the backend converts either with ffmpeg.
 */
export function useRecorder() {
  const [recording, setRecording] = useState(false)
  const [supported] = useState(() => typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Recording | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current) }, [])

  const start = useCallback(async () => {
    setError(null); setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m)) || ''
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunks.current = []
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const type = mr.mimeType || 'audio/webm'
        const ext = type.includes('mp4') ? '.m4a' : type.includes('ogg') ? '.ogg' : '.webm'
        const blob = new Blob(chunks.current, { type })
        const duration = (Date.now() - startedAt.current) / 1000
        setResult({ blob, url: URL.createObjectURL(blob), duration, filename: `recording${ext}` })
        setRecording(false)
        if (timer.current) window.clearInterval(timer.current)
      }
      rec.current = mr
      startedAt.current = Date.now()
      setElapsed(0)
      timer.current = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 200)
      mr.start()
      setRecording(true)
    } catch (e) {
      setError(e instanceof Error && e.name === 'NotAllowedError' ? 'Microphone access was denied.' : 'Could not start the microphone.')
    }
  }, [])

  const stop = useCallback(() => { if (rec.current?.state === 'recording') rec.current.stop() }, [])
  const reset = useCallback(() => { if (result) URL.revokeObjectURL(result.url); setResult(null); setElapsed(0) }, [result])

  return { recording, supported, error, result, elapsed, start, stop, reset }
}

export function RecorderControl({ rec, big = false, label = 'Record' }: { rec: ReturnType<typeof useRecorder>; big?: boolean; label?: string }) {
  if (!rec.supported) return <p className="text-sm text-ink-600">Recording is not supported in this browser.</p>
  const size = big ? 'h-20 w-20' : 'h-12 w-12'
  return (
    <div className="flex flex-col items-center gap-3">
      {!rec.result ? (
        <button type="button" onClick={rec.recording ? rec.stop : rec.start}
          aria-label={rec.recording ? 'Stop recording' : label}
          className={`relative grid ${size} place-items-center rounded-full text-white shadow-card transition ${rec.recording ? 'recording-ring bg-coral-500' : 'bg-teal-500 hover:bg-teal-700'}`}>
          {rec.recording ? <Square className={big ? 'h-8 w-8' : 'h-5 w-5'} /> : <Mic className={big ? 'h-9 w-9' : 'h-5 w-5'} />}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <audio src={rec.result.url} controls className="h-10 max-w-[240px]" />
          <button type="button" onClick={rec.reset} className="btn-ghost p-2" aria-label="Discard recording"><Trash2 className="h-4 w-4" /></button>
        </div>
      )}
      <p className="text-xs font-semibold text-ink-600">
        {rec.recording ? `Recording… ${rec.elapsed.toFixed(0)} s — tap to stop` : rec.result ? `${rec.result.duration.toFixed(1)} s recorded` : `Tap to ${label.toLowerCase()}`}
      </p>
      {rec.error && <p className="text-xs font-semibold text-coral-500" role="alert">{rec.error}</p>}
    </div>
  )
}

export function SpeakButton({ text, className = '' }: { text: string; className?: string }) {
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window
  if (!ok) return null
  return (
    <button type="button" className={`btn-secondary ${className}`} onClick={() => {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text); u.lang = 'en-IN'; u.rate = 0.85
      window.speechSynthesis.speak(u)
    }}><Volume2 className="h-4 w-4" /> Hear it</button>
  )
}
