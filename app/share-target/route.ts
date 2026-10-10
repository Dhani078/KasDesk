import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Fallback Web Share Target receiver (EPIC 8.1).
 *
 * Used when the Service Worker is not yet controlling the client.
 * Receives the multipart/form-data file, passes it via sessionStorage,
 * and redirects the browser to /?action=scan&shared=1.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('receipt') as File | null

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      const mime = file.type || 'image/jpeg'
      const dataUri = `data:${mime};base64,${base64}`
      const fileName = file.name || 'shared-receipt.jpg'

      const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>KasDesk - Memproses Struk</title>
</head>
<body style="background:#0D0D0F;color:#fff;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;">
  <p>Membuka pemindai struk...</p>
  <script>
    try {
      sessionStorage.setItem('kasdesk:shared-receipt-data', ${JSON.stringify(dataUri)});
      sessionStorage.setItem('kasdesk:shared-receipt-name', ${JSON.stringify(fileName)});
    } catch (e) {
      console.error(e);
    }
    window.location.replace('/?action=scan&shared=1');
  </script>
</body>
</html>`

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      })
    }
  } catch (err) {
    console.error('[ShareTarget Route Error]', err)
  }

  return NextResponse.redirect(new URL('/?action=scan', req.url), 303)
}
