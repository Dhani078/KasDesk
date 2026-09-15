/**
 * Image processing utilities for client-side OCR optimization.
 */

/**
 * Resize image to at most `max` px on the long edge, compressed as JPEG.
 * Reduces upload payload and processing time for OCR API.
 */
export async function downscale(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  if (scale === 1) return file

  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.85,
    )
  })
}
