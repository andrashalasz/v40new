/**
 * Minimális, függőség nélküli PDF-generátor egy egyszerű számla-bizonylathoz.
 *
 * A hivatalos, NAV-hoz beküldött e-számlát a Számlázz.hu állítja elő; ez egy
 * belső bizonylat, ami Mock módban is ad az ügyfélnek letölthető dokumentumot.
 *
 * A beépített Helvetica WinAnsi-kódolású. A magyar ékezetek nagy része (á é í ó
 * ö ú ü) ebben elérhető; a WinAnsi-ból hiányzó ő/ű a bázisbetűre (o/u) esik
 * vissza, hogy a szöveg biztosan renderelődjön.
 */

// Unicode -> WinAnsi (CP1252) bájt. Ami nincs a térképen és > 0x7E, azt ASCII-ra
// egyszerűsítjük.
const WINANSI: Record<string, number> = {
  á: 0xe1, é: 0xe9, í: 0xed, ó: 0xf3, ö: 0xf6, ú: 0xfa, ü: 0xfc,
  Á: 0xc1, É: 0xc9, Í: 0xcd, Ó: 0xd3, Ö: 0xd6, Ú: 0xda, Ü: 0xdc,
  ő: 0x6f, ű: 0x75, Ő: 0x4f, Ű: 0x55, // WinAnsi-ból hiányzik -> o/u
}

function encodeWinAnsi(text: string): Buffer {
  const bytes: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0x20
    if (code <= 0x7e) bytes.push(code)
    else if (WINANSI[ch] != null) bytes.push(WINANSI[ch]!)
    else bytes.push(0x3f) // '?'
  }
  return Buffer.from(bytes)
}

// PDF stringen belül az escapelendő karakterek.
function pdfEscape(buf: Buffer): Buffer {
  const out: number[] = []
  for (const b of buf) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c) // ( ) \
    out.push(b)
  }
  return Buffer.from(out)
}

export interface PdfLine {
  text: string
  size?: number
  bold?: boolean
  gap?: number // extra hely a sor után (pt)
}

export function renderSimplePdf(lines: PdfLine[]): Buffer {
  const left = 56
  let y = 800
  const parts: Buffer[] = []
  parts.push(Buffer.from('BT\n'))
  for (const ln of lines) {
    const size = ln.size ?? 11
    const font = ln.bold ? '/F2' : '/F1'
    parts.push(Buffer.from(`${font} ${size} Tf\n`))
    parts.push(Buffer.from(`1 0 0 1 ${left} ${y} Tm\n`))
    parts.push(Buffer.from('('))
    parts.push(pdfEscape(encodeWinAnsi(ln.text)))
    parts.push(Buffer.from(') Tj\n'))
    y -= size + 6 + (ln.gap ?? 0)
  }
  parts.push(Buffer.from('ET\n'))
  const content = Buffer.concat(parts)

  // Objektumok felépítése byte-pontos xref-fel.
  const objects: Buffer[] = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>'),
    Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`), content, Buffer.from('\nendstream')]),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
  ]

  const header = Buffer.from('%PDF-1.4\n')
  const chunks: Buffer[] = [header]
  const offsets: number[] = []
  let pos = header.length

  objects.forEach((body, i) => {
    offsets[i] = pos
    const obj = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), body, Buffer.from('\nendobj\n')])
    chunks.push(obj)
    pos += obj.length
  })

  const xrefPos = pos
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) xref += `${String(off).padStart(10, '0')} 00000 n \n`
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  chunks.push(Buffer.from(xref))

  return Buffer.concat(chunks)
}
