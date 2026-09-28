import { useCallback, useState } from 'react'
import { MonitorPlay, FileText, Video, X } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ScriptEditor } from '@/components/ScriptEditor'
import { Prompter } from '@/components/Prompter'
import { CameraPanel } from '@/components/CameraPanel'
import { Gallery } from '@/components/Gallery'
import { SlotMachine } from '@/components/SlotMachine'
import type { Recording } from '@/types'
import { cn } from '@/lib/utils'

export default function App() {
  const [script, setScript] = useState('')
  const [wpm, setWpm] = useState(180)
  const [tab, setTab] = useState('prompter')

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false)

  const addRecording = useCallback((rec: Recording) => {
    setRecordings((prev) => [rec, ...prev])
  }, [])

  const deleteRecording = useCallback((id: string) => {
    setRecordings((prev) => {
      const target = prev.find((r) => r.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((r) => r.id !== id)
    })
  }, [])

  const editor = (
    <ScriptEditor script={script} setScript={setScript} wpm={wpm} />
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background font-mono">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MonitorPlay className="h-5 w-5 text-amber" />
          <span className="text-base font-bold tracking-tight">
            Cad<span className="text-amber">ence</span>
          </span>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="prompter">
              <MonitorPlay className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Prompter</span>
            </TabsTrigger>
            <TabsTrigger value="camera">
              <Video className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Camera</span>
            </TabsTrigger>
            <TabsTrigger value="topics">
              <span className="hidden sm:inline">Topics</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Mobile editor toggle */}
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileEditorOpen((o) => !o)}
          aria-label="Toggle script editor"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Main column: Prompter / Camera */}
        <main className="min-w-0 flex-1">
          <Tabs value={tab} onValueChange={setTab} className="h-full">
            <TabsContent value="prompter" className="m-0 h-full">
              <Prompter
                script={script}
                wpm={wpm}
                setWpm={setWpm}
                active={tab === 'prompter'}
              />
            </TabsContent>
            <TabsContent value="camera" className="m-0 h-full overflow-y-auto">
              <div className="mx-auto max-w-xl">
                <CameraPanel
                  onRecorded={addRecording}
                  onOpenGallery={() => setGalleryOpen(true)}
                  galleryCount={recordings.length}
                />
              </div>
            </TabsContent>
            <TabsContent value="topics" className="m-0 h-full">
              <SlotMachine />
            </TabsContent>
          </Tabs>
        </main>

        {/* Script editor sidebar (desktop) */}
        {tab !== 'topics' && (
          <aside className="hidden w-[400px] shrink-0 border-l border-border bg-card/40 lg:block">
            {editor}
          </aside>
        )}
      </div>

      {/* Script editor bottom sheet (mobile) */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 transform border-t border-border bg-card shadow-2xl transition-transform duration-300 lg:hidden',
          mobileEditorOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-sm font-semibold text-muted-foreground">
            Script Editor
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileEditorOpen(false)}
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-[70vh] overflow-y-auto">{editor}</div>
      </div>

      {mobileEditorOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileEditorOpen(false)}
        />
      )}

      <Gallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        recordings={recordings}
        onDelete={deleteRecording}
      />
    </div>
  )
}
