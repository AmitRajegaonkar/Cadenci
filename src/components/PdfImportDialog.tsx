import { useEffect, useRef, useState } from 'react'
import { FileType2, Loader2, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  extractPages,
  loadPdf,
  renderThumbnail,
  type PDFDocumentProxy,
} from '@/lib/pdf'
import { cn } from '@/lib/utils'

interface PdfImportDialogProps {
  /** The PDF to import; when non-null the dialog opens and loads it. */
  file: File | null
  onExtracted: (text: string) => void
  onClose: () => void
}

export function PdfImportDialog({
  file,
  onExtracted,
  onClose,
}: PdfImportDialogProps) {
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  // Bumped on each new import so an in-flight thumbnail render can bail out.
  const renderToken = useRef(0)

  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState('')
  const [numPages, setNumPages] = useState(0)
  const [thumbs, setThumbs] = useState<Record<number, string>>({})
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load (and render thumbnails for) the incoming PDF file.
  useEffect(() => {
    if (!file) return
    let active = true
    const token = ++renderToken.current
    setError(null)
    setLoading(true)
    setFileName(file.name)
    setThumbs({})
    setSelected(new Set())
    setNumPages(0)
    setOpen(true)
    ;(async () => {
      try {
        const pdf = await loadPdf(file)
        if (!active || renderToken.current !== token) return
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setSelected(
          new Set(Array.from({ length: pdf.numPages }, (_, i) => i + 1)),
        )
        setLoading(false)
        // Render thumbnails progressively so the grid fills in as they finish.
        for (let p = 1; p <= pdf.numPages; p++) {
          const url = await renderThumbnail(pdf, p)
          if (!active || renderToken.current !== token) return
          setThumbs((prev) => ({ ...prev, [p]: url }))
        }
      } catch {
        if (active && renderToken.current === token) {
          setError('Could not read this PDF.')
          setNumPages(0)
          setLoading(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [file])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) onClose()
  }

  function togglePage(p: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  const allPages = Array.from({ length: numPages }, (_, i) => i + 1)
  const selectAll = () => setSelected(new Set(allPages))
  const clearAll = () => setSelected(new Set())

  async function handleExtract() {
    const pdf = pdfRef.current
    if (!pdf) return
    const pages = [...selected].sort((a, b) => a - b)
    if (pages.length === 0) {
      setError('Select at least one page.')
      return
    }
    setExtracting(true)
    setError(null)
    try {
      const text = await extractPages(pdf, pages)
      if (!text.trim()) {
        setError(
          'No selectable text found on those pages (the PDF may be scanned images).',
        )
        return
      }
      onExtracted(text)
      handleOpenChange(false)
    } catch {
      setError('Failed to extract text from the selected pages.')
    } finally {
      setExtracting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileType2 className="h-5 w-5 text-amber" /> Import from PDF
            </DialogTitle>
            <DialogDescription className="truncate">
              {fileName || 'Tap pages to choose what becomes your script.'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading PDF…
            </div>
          ) : numPages > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-amber">
                    {selected.size}
                  </span>{' '}
                  of {numPages} page{numPages > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="grid max-h-[52vh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
                {allPages.map((p) => {
                  const isSelected = selected.has(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePage(p)}
                      aria-pressed={isSelected}
                      className={cn(
                        'group relative overflow-hidden rounded-md border-2 bg-white/95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected
                          ? 'border-amber ring-2 ring-amber/40'
                          : 'border-border opacity-70 hover:opacity-100',
                      )}
                    >
                      <div className="flex aspect-[3/4] items-center justify-center">
                        {thumbs[p] ? (
                          <img
                            src={thumbs[p]}
                            alt={`Page ${p}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 text-[10px] font-semibold text-white">
                        {p}
                      </span>
                      {isSelected && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber text-[#0f1117]">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleExtract}
                  disabled={extracting || selected.size === 0}
                >
                  {extracting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Use {selected.size} page{selected.size === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error ?? 'Could not read this PDF.'}
            </p>
          )}
      </DialogContent>
    </Dialog>
  )
}
