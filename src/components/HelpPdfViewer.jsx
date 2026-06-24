import { useEffect, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument } from '../vendor/pdfjs/pdf.min.mjs'
import PdfWorker from '../vendor/pdfjs/pdf.worker.min.mjs?worker'
import { publicUrl } from '../utils/publicUrl'

GlobalWorkerOptions.workerPort = new PdfWorker()

const pdfAssetBase = publicUrl('pdfjs/')

async function loadPdfDocument(src) {
  const response = await fetch(new URL(src, window.location.href))
  if (!response.ok) {
    throw new Error(`Failed to fetch help PDF (${response.status})`)
  }

  const data = await response.arrayBuffer()

  return getDocument({
    data,
    cMapUrl: `${pdfAssetBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${pdfAssetBase}standard_fonts/`,
    wasmUrl: `${pdfAssetBase}wasm/`,
  }).promise
}

function HelpPdfViewer({ src }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return undefined

    container.replaceChildren()
    setError(false)

    ;(async () => {
      try {
        const pdf = await loadPdfDocument(src)
        if (cancelled) return

        const containerWidth = container.clientWidth || 860

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          const page = await pdf.getPage(pageNum)
          if (cancelled) return

          const baseViewport = page.getViewport({ scale: 1 })
          const scale = Math.min(1.5, containerWidth / baseViewport.width)
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.className = 'help-pdf-page'
          canvas.width = viewport.width
          canvas.height = viewport.height

          const pageWrap = document.createElement('div')
          pageWrap.className = 'help-pdf-page-wrap'
          pageWrap.appendChild(canvas)
          container.appendChild(pageWrap)

          await page.render({ canvas, viewport }).promise
        }
      } catch {
        if (!cancelled) setError(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [src])

  if (error) {
    return <p className="help-pdf-error">Unable to load help document.</p>
  }

  return <div ref={containerRef} className="help-pdf-pages" />
}

export default HelpPdfViewer
