/**
 * A backend válaszainak alakja.
 *
 * Kézzel írt típusok, mert az app és a szerver külön csomag. Ha egy végpont
 * válasza változik, ITT kell követni – a `npm run typecheck` ilyenkor a
 * használati helyeken jelez.
 */

export type Appointment = {
  publicRef: string
  startsAt: string
  endsAt: string
  status: 'HOLD' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'
  settlement: 'ONLINE_CARD' | 'PASS' | 'ON_SITE'
  priceGross: number
  holdUntil: string | null
  service: { title: string; slug: string; durationMin: number }
  practitioner: { name: string } | null
  room: { name: string } | null
}

export type CustomerPass = {
  code: string
  sessionsTotal: number
  sessionsRemaining: number
  validFrom: string
  validUntil: string
  status: 'ACTIVE' | 'EXHAUSTED'
  passTemplate: { title: string }
  services: { title: string; slug: string }[]
}

export type Invoice = {
  id: number
  invoiceNumber: string | null
  totalGross: number
  isStorno: boolean
  issuedAt: string | null
  createdAt: string
}

export type MedicalOpinion = {
  id: number
  documentCode: string
  title: string
  createdAt: string
}

export type PatientDocument = {
  id: number
  fileName: string
  mimeType: string
  createdAt: string
}

export type MeResponse = {
  profile: {
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
  } | null
  upcoming: Appointment[]
  past: Appointment[]
  passes: CustomerPass[]
  invoices: Invoice[]
  opinions: MedicalOpinion[]
  documents: PatientDocument[]
}

export type PassTemplate = {
  id: number
  slug: string
  title: string
  desc: string | null
  priceGross: number
  vatRate: number
  sessionCount: number
  validityDays: number
  transferable: boolean
  picUrl: string | null
}

/** Foglalás állapotának magyar megnevezése. */
export const APPOINTMENT_STATUS: Record<Appointment['status'], string> = {
  HOLD: 'Foglalás folyamatban',
  PENDING_PAYMENT: 'Fizetésre vár',
  CONFIRMED: 'Megerősítve',
  COMPLETED: 'Megtörtént',
  NO_SHOW: 'Nem jelent meg',
  CANCELLED: 'Lemondva',
}
