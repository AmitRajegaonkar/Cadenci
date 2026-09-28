import type { PDFDocumentProxy, TextItem } from 'pdfjs-dist/types/src/display/api'
// Vite resolves this to a hashed URL and serves the worker as a static asset.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export type { PDFDocumentProxy }

// Lazy-load the (large) pdf.js library only when the user actually imports a
// PDF, so it ships as a separate chunk instead of bloating the initial bundle.
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = workerUrl
      return lib
    })
  }
  return pdfjsPromise
}

/** Load a PDF file into a pdf.js document (used to read the page count). */
export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs()
  const data = await file.arrayBuffer()
  return pdfjs.getDocument({ data }).promise
}

/**
 * Extract plain text from the given page numbers (1-based), in the order
 * provided. Items flagged with `hasEOL` become line breaks so the script keeps
 * a reasonable line structure; pages are separated by a blank line.
 */
export async function extractPages(
  pdf: PDFDocumentProxy,
  pageNumbers: number[],
): Promise<string> {
  const pages: string[] = []
  for (const p of pageNumbers) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      const ti = item as TextItem
      text += ti.str
      text += ti.hasEOL ? '\n' : ' '
    }
    pages.push(text.replace(/[ \t]+\n/g, '\n').trim())
  }
  return pages.join('\n\n')
}

/** Render a single page to a small PNG data URL for use as a thumbnail. */
export async function renderThumbnail(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  scale = 0.45,
): Promise<string> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/png')
}
