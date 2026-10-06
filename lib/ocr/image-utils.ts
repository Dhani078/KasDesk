/**
 * Image processing utilities for client-side OCR optimization.
 */

/**
 * Resize image to at most `max` px on the long edge, compressed as JPEG.
 * Reduces upload payload and processing time for OCR API.
 * Ensures consistent 'image/jpeg' MIME type across all client platforms (iOS/Android/Desktop).
 */
export async function downscale(file: File, max: number): Promise<Blob> {
  // Helper to draw and convert an image source to JPEG blob
  const drawToJpegBlob = (
    src: ImageBitmap | HTMLImageElement,
    width: number,
    height: number,
  ): Promise<Blob> => {
    const scale = Math.min(1, max / Math.max(width, height))
    const w = Math.round(width * scale)
    const h = Math.round(height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return Promise.resolve(file)
    ctx.drawImage(src, 0, 0, w, h)

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        0.85,
      )
    })
  }

  // Primary path: createImageBitmap (fast, modern)
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      const blob = await drawToJpegBlob(bmp, bmp.width, bmp.height)
      bmp.close()
      return blob
    } catch {
      // Fall through to HTMLImageElement fallback (e.g. mobile Safari quirks)
    }
  }

  // Fallback path: HTMLImageElement via object URL
  return new Promise<Blob>((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = async () => {
      URL.revokeObjectURL(url)
      try {
        const b = await drawToJpegBlob(img, img.naturalWidth, img.naturalHeight)
        resolve(b)
      } catch {
        resolve(file)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}
