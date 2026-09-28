import { useRef, useState } from 'react'
import { Upload, FileText, Clock, Hash, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PdfImportDialog } from '@/components/PdfImportDialog'
import { countWords, formatReadTime } from '@/lib/tokens'

interface ScriptEditorProps {
  script: string
  setScript: (s: string) => void
  wpm: number
}

const SAMPLE = `Welcome to the teleprompter.

Paste your script here, or import a .txt, .md or .pdf file using the Import button.

Switch to the Prompter tab when you're ready. Adjust WPM and words-per-line to taste — the text scrolls like film credits past the marker at center.

Press space to pause or resume, and press R to reset back to the top.`

export function ScriptEditor({ script, setScript, wpm }: ScriptEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const words = countWords(script)
  const readTime = formatReadTime(words, wpm)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return

    const isPdf =
      file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (isPdf) {
      setPdfFile(file) // hand off to the PDF page picker
      return
    }
    const reader = new FileReader()
    reader.onload = () => setScript(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-amber" />
          Script Editor
        </h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScript(SAMPLE)}
            disabled={!!script}
          >
            Load sample
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <PdfImportDialog
            file={pdfFile}
            onExtracted={setScript}
            onClose={() => setPdfFile(null)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScript('')}
            disabled={!script}
            aria-label="Clear script"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="script" className="text-muted-foreground">
          Your script
        </Label>
        <Textarea
          id="script"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Paste or type your script here…"
          className="flex-1 resize-none rounded-lg bg-card/60 p-4 text-base leading-relaxed font-mono"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-amber" />
          <span className="font-semibold text-foreground">{words}</span>
          <span className="text-muted-foreground">words</span>
        </span>
        <span className="h-4 w-px bg-border" />
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber" />
          <span className="font-semibold text-foreground">{readTime}</span>
          <span className="text-muted-foreground">at {wpm} WPM</span>
        </span>
      </div>
    </div>
  )
}
