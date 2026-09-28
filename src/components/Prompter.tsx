import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Gauge, AlignLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { countWords, parseLines } from '@/lib/tokens'
import { cn } from '@/lib/utils'

interface PrompterProps {
  script: string
  wpm: number
  setWpm: (n: number) => void
  active: boolean
}

export function Prompter({ script, wpm, setWpm, active }: PrompterProps) {
  const [creditProgress, setCreditProgress] = useState(0)
  const [finished, setFinished] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [wordsPerLine, setWordsPerLine] = useState(5)

  const scrollRef = useRef<HTMLDivElement>(null)
  const lastProgressRef = useRef(0)

  const lines = useMemo(
    () => parseLines(script, wordsPerLine),
    [script, wordsPerLine],
  )
  const totalWords = useMemo(() => countWords(script), [script])

  const hasContent = script.trim().length > 0
  const done = finished
  const progress = creditProgress

  const resetPositions = useCallback(() => {
    setCreditProgress(0)
    setFinished(false)
    lastProgressRef.current = 0
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [])

  // Reset when the script or line grouping changes.
  useEffect(() => {
    setPlaying(false)
    resetPositions()
  }, [script, wordsPerLine, resetPositions])

  const reset = useCallback(() => {
    setPlaying(false)
    resetPositions()
  }, [resetPositions])

  const togglePlay = useCallback(() => {
    if (!hasContent) return
    if (done) {
      resetPositions()
      setPlaying(true)
      return
    }
    setPlaying((p) => !p)
  }, [hasContent, done, resetPositions])

  // --- Movie-credit constant-speed scroll ---
  // The container scrolls upward at a steady velocity so the whole script
  // passes the centered reading guide over its estimated read time.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let exactScroll = scrollRef.current?.scrollTop || 0

    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const c = scrollRef.current
      if (c && playing && !finished && hasContent) {
        const maxScroll = c.scrollHeight - c.clientHeight
        if (maxScroll > 0) {
          // Re-sync exactScroll if the user manually scrolled
          if (Math.abs(c.scrollTop - exactScroll) > 2) {
            exactScroll = c.scrollTop
          }

          const totalSeconds = Math.max((totalWords / wpm) * 60, 0.1)
          const velocity = maxScroll / totalSeconds // px per second
          
          exactScroll += velocity * dt
          
          if (exactScroll >= maxScroll) {
            exactScroll = maxScroll
            setFinished(true)
            setPlaying(false)
            setCreditProgress(1)
          }
          c.scrollTop = exactScroll

          // Throttle React updates for the progress bar to ~10fps.
          if (now - lastProgressRef.current > 100) {
            lastProgressRef.current = now
            setCreditProgress(exactScroll / maxScroll)
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, finished, hasContent, wpm, totalWords])

  // --- Keyboard shortcuts (only when this tab is active & body focused) ---
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement
      const tag = el?.tagName
      const typing =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (el as HTMLElement | null)?.isContentEditable
      if (typing) return

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, togglePlay, reset])

  return (
    <div className="flex h-full flex-col">
      {/* Settings bar */}
      <div className="z-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border bg-card/70 px-4 py-3 backdrop-blur">
        <div className="flex min-w-[180px] flex-1 items-center gap-3">
          <Gauge className="h-4 w-4 shrink-0 text-amber" />
          <input
            type="range"
            value={wpm}
            min={60}
            max={250}
            step={5}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="flex-1 accent-amber"
            aria-label="Words per minute"
          />
          <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {wpm} WPM
          </span>
        </div>

        <div className="flex min-w-[150px] items-center gap-3">
          <AlignLeft className="h-4 w-4 shrink-0 text-amber" />
          <input
            type="range"
            value={wordsPerLine}
            min={3}
            max={8}
            step={1}
            onChange={(e) => setWordsPerLine(Number(e.target.value))}
            className="w-24 accent-amber"
            aria-label="Words per line"
          />
          <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {wordsPerLine} w/line
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={togglePlay} disabled={!hasContent}>
            {playing ? (
              <>
                <Pause className="h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> {done ? 'Restart' : 'Play'}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={reset}
            disabled={!hasContent}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-secondary">
        <div
          className={cn(
            'h-full bg-amber transition-[width] duration-200 ease-linear',
            done && 'shadow-[0_0_12px_rgba(245,166,35,0.8)]',
          )}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Scrolling viewport */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="prompter-scroll absolute inset-0 overflow-y-auto px-5 py-[45vh] sm:px-10"
        >
          {!hasContent ? (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground">
              <p>
                No script yet. Add one in the{' '}
                <span className="text-amber">Script Editor</span>.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-1 text-center">
              {lines.map((line, i) => (
                <div
                  key={`l-${i}`}
                  className="px-6 py-1.5 text-2xl leading-relaxed sm:text-3xl"
                >
                  {line.text || ' '}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fixed reading guide — text scrolls under it like film credits. */}
        {hasContent && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center px-2 sm:px-6">
            <ChevronRight className="h-7 w-7 shrink-0 text-amber drop-shadow-[0_0_6px_rgba(245,166,35,0.6)] sm:h-9 sm:w-9" />
            <div className="ml-1 h-[2px] flex-1 bg-gradient-to-r from-amber/40 via-amber/10 to-transparent" />
          </div>
        )}
      </div>

      {/* Footer status */}
      <div className="flex items-center justify-between border-t border-border bg-card/70 px-4 py-2 text-xs text-muted-foreground">
        <span>{Math.round(creditProgress * 100)}%</span>
        <span className="hidden sm:inline">Space = play/pause · R = reset</span>
        <span className={cn(done && 'font-semibold text-amber')}>
          {done ? 'Done' : playing ? 'Playing' : 'Paused'}
        </span>
      </div>
    </div>
  )
}
