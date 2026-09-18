import { randomBytes } from 'node:crypto'

/**
 * Számlázási absztrakció.
 *
 * Magyarországon a számlát nem közvetlenül a NAV Online Számla nyers
 * interfészére küldjük, hanem egy számlázó szolgáltatón keresztül (Számlázz.hu
 * "Számla Agent"), amely a számlát kiállítja ÉS automatikusan beküldi a NAV-nak.
 * A `navStatus` mező tárolja a szolgáltatótól kapott NAV-visszajelzést.
 *
 * Két üzemmód:
 *  - MockInvoiceProvider: kulcs nélkül is kiállít "számlát" (MANUAL, navStatus =
 *    MOCK) – fejlesztéshez/teszthez.
 *  - SzamlazzhuInvoiceProvider: valódi Számlázz.hu, ha a SZAMLAZZHU_AGENT_KEY be
 *    van állítva. A NAV-beküldést a Számlázz.hu végzi.
 */

export type InvoiceProviderKind = 'SZAMLAZZHU' | 'BILLINGO' | 'MANUAL'

export interface InvoiceBuyer {
  name: string
  email: string | null
  taxNumber: string | null
  country: string
  zip: string | null
  city: string | null
  address: string | null
}

export interface InvoiceLine {
  title: string
  quantity: number
  unitPriceGross: number
  vatRate: number // 0 = áfamentes (egészségügyi szolgáltatás)
  vatExemptReason: string | null
}

export interface InvoiceInput {
  orderNumber: string
  currency: string
  buyer: InvoiceBuyer
  lines: InvoiceLine[]
  paidAt: Date
}

export interface IssuedInvoice {
  provider: InvoiceProviderKind
  providerInvoiceId: string | null
  invoiceNumber: string
  pdfUrl: string | null
  navStatus: string | null
}

export interface StornoInput {
  originalInvoiceNumber: string
  orderNumber: string
  currency: string
  buyer: InvoiceBuyer
  paidAt: Date
}

export interface InvoiceProvider {
  readonly kind: InvoiceProviderKind
  readonly mock: boolean
  issue(input: InvoiceInput): Promise<IssuedInvoice>
  /** Sztornó (érvénytelenítő) számla az eredetihez. */
  storno(input: StornoInput): Promise<IssuedInvoice>
}

// ------------------------------ Mock provider -------------------------------

export class MockInvoiceProvider implements InvoiceProvider {
  readonly kind = 'MANUAL' as const
  readonly mock = true

  async issue(input: InvoiceInput): Promise<IssuedInvoice> {
    const seq = randomBytes(3).toString('hex').toUpperCase()
    return {
      provider: 'MANUAL',
      providerInvoiceId: `MOCK-${seq}`,
      invoiceNumber: `V40-MOCK-${new Date(input.paidAt).getFullYear()}-${seq}`,
      pdfUrl: null, // mockban nincs valódi PDF
      navStatus: 'MOCK', // valós beküldés nem történt
    }
  }

  async storno(input: StornoInput): Promise<IssuedInvoice> {
    const seq = randomBytes(3).toString('hex').toUpperCase()
    return {
      provider: 'MANUAL',
      providerInvoiceId: `MOCK-ST-${seq}`,
      invoiceNumber: `V40-MOCK-ST-${new Date(input.paidAt).getFullYear()}-${seq}`,
      pdfUrl: null,
      navStatus: 'MOCK',
    }
  }
}

// --------------------------- Számlázz.hu provider ---------------------------

/**
 * Számlázz.hu "Számla Agent" adapter.
 *
 * A Számla Agent egy XML-t vár multipart/form-data `action-xmlagentxmlfile`
 * mezőben a https://www.szamlazz.hu/szamla/ végpontra. A válasz fejlécében jön
 * az `szlahu_szamlaszam` (számlaszám) és hiba esetén az `szlahu_error*`. A NAV
 * Online Számla beküldést a Számlázz.hu automatikusan elvégzi, ha a fiók be van
 * kötve. Enélkül a hívás nem tesztelhető, ezért a kulcs hiányában a Mock fut.
 */
export class SzamlazzhuInvoiceProvider implements InvoiceProvider {
  readonly kind = 'SZAMLAZZHU' as const
  readonly mock = false
  private agentKey: string

  constructor(agentKey: string) {
    this.agentKey = agentKey
  }

  async issue(input: InvoiceInput): Promise<IssuedInvoice> {
    const xml = this.buildXml(input)

    const form = new FormData()
    form.append('action-xmlagentxmlfile', new Blob([xml], { type: 'text/xml' }), 'szamla.xml')

    const res = await fetch('https://www.szamlazz.hu/szamla/', { method: 'POST', body: form })

    const error = res.headers.get('szlahu_error')
    if (error) {
      throw new Error(`Számlázz.hu hiba: ${decodeURIComponent(error)}`)
    }
    const invoiceNumber = res.headers.get('szlahu_szamlaszam')
    if (!invoiceNumber) {
      throw new Error('Számlázz.hu: hiányzó számlaszám a válaszban.')
    }

    return {
      provider: 'SZAMLAZZHU',
      providerInvoiceId: invoiceNumber,
      invoiceNumber,
      // A PDF letölthető a számlaszámmal; a beküldő XML-ben kérhető letöltés is.
      pdfUrl: null,
      // A tényleges NAV-státusz a Számlázz.hu fiókban / lekérdező hívással
      // követhető; kiállításkor a szolgáltató sorba állítja a beküldést.
      navStatus: 'SUBMITTED',
    }
  }

  async storno(input: StornoInput): Promise<IssuedInvoice> {
    const b = input.buyer
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlast xmlns="http://www.szamlazz.hu/xmlszamlast">
  <beallitasok>
    <szamlaagentkulcs>${this.esc(this.agentKey)}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLetoltes>false</szamlaLetoltes>
  </beallitasok>
  <fejlec>
    <szamlaszam>${this.esc(input.originalInvoiceNumber)}</szamlaszam>
  </fejlec>
  <elado></elado>
  <vevo>
    <email>${this.esc(b.email ?? '')}</email>
  </vevo>
</xmlszamlast>`

    const form = new FormData()
    form.append('action-szamla_agent_st', new Blob([xml], { type: 'text/xml' }), 'szamlast.xml')
    const res = await fetch('https://www.szamlazz.hu/szamla/', { method: 'POST', body: form })

    const error = res.headers.get('szlahu_error')
    if (error) throw new Error(`Számlázz.hu sztornó hiba: ${decodeURIComponent(error)}`)
    const invoiceNumber = res.headers.get('szlahu_szamlaszam') ?? `ST-${input.originalInvoiceNumber}`

    return {
      provider: 'SZAMLAZZHU',
      providerInvoiceId: invoiceNumber,
      invoiceNumber,
      pdfUrl: null,
      navStatus: 'SUBMITTED',
    }
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  private buildXml(input: InvoiceInput): string {
    const b = input.buyer
    const paid = new Date(input.paidAt).toISOString().slice(0, 10)
    const lines = input.lines
      .map((l) => {
        const netUnit = l.vatRate > 0 ? Math.round(l.unitPriceGross / (1 + l.vatRate / 100)) : l.unitPriceGross
        const vatLabel = l.vatRate > 0 ? String(l.vatRate) : 'TEHK' // TEHK: tárgyi adómentes egészségügy
        return `    <tetel>
      <megnevezes>${this.esc(l.title)}</megnevezes>
      <mennyiseg>${l.quantity}</mennyiseg>
      <mennyisegiEgyseg>db</mennyisegiEgyseg>
      <nettoEgysegar>${netUnit}</nettoEgysegar>
      <afakulcs>${vatLabel}</afakulcs>
      <nettoErtek>${netUnit * l.quantity}</nettoErtek>
      <afaErtek>${(l.unitPriceGross - netUnit) * l.quantity}</afaErtek>
      <bruttoErtek>${l.unitPriceGross * l.quantity}</bruttoErtek>${l.vatExemptReason ? `\n      <megjegyzes>${this.esc(l.vatExemptReason)}</megjegyzes>` : ''}
    </tetel>`
      })
      .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla">
  <beallitasok>
    <szamlaagentkulcs>${this.esc(this.agentKey)}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLetoltes>false</szamlaLetoltes>
  </beallitasok>
  <fejlec>
    <keltDatum>${paid}</keltDatum>
    <teljesitesDatum>${paid}</teljesitesDatum>
    <fizetesiHataridoDatum>${paid}</fizetesiHataridoDatum>
    <fizmod>bankkártya</fizmod>
    <penznem>${this.esc(input.currency)}</penznem>
    <szamlaNyelve>hu</szamlaNyelve>
    <rendelesSzam>${this.esc(input.orderNumber)}</rendelesSzam>
  </fejlec>
  <elado></elado>
  <vevo>
    <nev>${this.esc(b.name)}</nev>
    <irsz>${this.esc(b.zip ?? '')}</irsz>
    <telepules>${this.esc(b.city ?? '')}</telepules>
    <cim>${this.esc(b.address ?? '')}</cim>
    <email>${this.esc(b.email ?? '')}</email>${b.taxNumber ? `\n    <adoszam>${this.esc(b.taxNumber)}</adoszam>` : ''}
  </vevo>
  <tetelek>
${lines}
  </tetelek>
</xmlszamla>`
  }
}

// ------------------------------- selector -----------------------------------

let cached: InvoiceProvider | null = null

export function getInvoiceProvider(): InvoiceProvider {
  if (cached) return cached
  const key = process.env.SZAMLAZZHU_AGENT_KEY
  if (key && (process.env.INVOICE_PROVIDER ?? 'SZAMLAZZHU') === 'SZAMLAZZHU') {
    cached = new SzamlazzhuInvoiceProvider(key)
  } else {
    cached = new MockInvoiceProvider()
  }
  return cached
}
