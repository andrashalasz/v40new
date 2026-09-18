import { randomBytes } from 'node:crypto'
import { renderSimplePdf, type PdfLine } from '~~/server/utils/pdf'

/**
 * A szakvélemény dokumentum-kódja: a páciens születési éve + a dokumentum
 * dátuma (YYYYMMDD) + rövid egyedi utótag. Pl. "1985-20260817-A1B2".
 * Az utótag biztosítja, hogy ugyanannak a páciensnek ugyanazon a napon több
 * dokumentuma is egyedi maradjon.
 */
export function generateDocumentCode(birthDate: Date, docDate: Date): string {
  const birthYear = new Intl.DateTimeFormat('en-CA', { year: 'numeric', timeZone: 'Europe/Budapest' }).format(birthDate)
  const ymd = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Budapest',
  }).format(docDate).replace(/-/g, '')
  const suffix = randomBytes(2).toString('hex').toUpperCase()
  return `${birthYear}-${ymd}-${suffix}`
}

export interface OpinionPdfData {
  documentCode: string
  patientName: string
  birthDate: Date | null
  authorName: string | null
  serviceTitle: string | null
  title: string
  body: string
  createdAt: Date
}

const huDate = (d: Date) =>
  new Intl.DateTimeFormat('hu-HU', { dateStyle: 'long', timeZone: 'Europe/Budapest' }).format(d)

export function renderOpinionPdf(d: OpinionPdfData): Buffer {
  const lines: PdfLine[] = [
    { text: 'V40 Vital', size: 22, bold: true },
    { text: 'Szakvélemény', size: 13, gap: 10 },
    { text: `Dokumentum-kód: ${d.documentCode}`, bold: true },
    { text: `Kelt: ${huDate(d.createdAt)}` },
    { text: `Páciens: ${d.patientName}${d.birthDate ? ` (szül. ${huDate(d.birthDate)})` : ''}` },
    ...(d.serviceTitle ? [{ text: `Kezelés: ${d.serviceTitle}` }] : []),
    ...(d.authorName ? [{ text: `Kiállító: ${d.authorName}` }] : []),
    { text: '', gap: 6 },
    { text: d.title, size: 15, bold: true, gap: 4 },
  ]
  // A törzs bekezdéseit külön sorokként törjük, hogy olvasható maradjon.
  for (const para of d.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    for (const wrapped of wrap(para, 92)) lines.push({ text: wrapped, size: 11 })
    lines.push({ text: '', gap: 2 })
  }
  lines.push({ text: '', gap: 8 })
  lines.push({ text: 'Ez a dokumentum tájékoztató jellegű szakvélemény, nem helyettesíti a személyes orvosi konzultációt.', size: 8 })

  return renderSimplePdf(lines)
}

/** Egyszerű sortörés adott karakterszélességre (a beépített PDF-font miatt). */
function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/)
  const out: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) { if (cur) out.push(cur); cur = w }
    else cur = (cur ? cur + ' ' : '') + w
  }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}
