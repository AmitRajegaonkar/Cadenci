import { Download, Trash2, Film, Clock } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatBytes, formatClock } from '@/lib/tokens'
import type { Recording } from '@/types'

interface GalleryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recordings: Recording[]
  onDelete: (id: string) => void
}

export function Gallery({
  open,
  onOpenChange,
  recordings,
  onDelete,
}: GalleryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-amber" /> Session Gallery
          </DialogTitle>
          <DialogDescription>
            Recordings live in memory only — they clear on page refresh.
          </DialogDescription>
        </DialogHeader>

        {recordings.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No recordings yet. Turn on the camera and hit record.
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                className="overflow-hidden rounded-lg border border-border bg-card/60"
              >
                <video
                  src={rec.url}
                  controls
                  playsInline
                  className="aspect-video w-full bg-black"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber" />
                      {formatClock(rec.duration)}
                    </span>
                    <span>{formatBytes(rec.size)}</span>
                    <span>{new Date(rec.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={rec.url}
                        download={`session-${new Date(
                          rec.timestamp,
                        )
                          .toISOString()
                          .replace(/[:.]/g, '-')}.webm`}
                      >
                        <Download className="h-4 w-4" /> Download
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(rec.id)}
                      aria-label="Delete recording"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
