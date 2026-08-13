// =============================================================================
//  Foglalási motor - szabad idősáv számítás
// =============================================================================
//  Tiszta függvény: nincs adatbázis-, hálózat- vagy keretrendszer-függése,
//  ezért teljes egészében unit-tesztelhető. A DB-lekérdezés és a tranzakciós
//  zárolás egy réteggel feljebb van.
//
//  IDŐZÓNA: minden Date UTC instant. A beosztás viszont HELYI faliórában van
//  megadva (éjfél óta eltelt perc), mert a rendelő "hétfő 9-től 17-ig" nyit,
//  nem "07:00 UTC-től". A kettő közti átváltás nyári időszámításkor nem
//  konstans, ezért nem lehet fix offsettel számolni.
// =============================================================================

export const CLINIC_TZ = 'Europe/Budapest'

export interface Interval {
  start: Date
  end: Date
}

export interface WorkingHoursRule {
  weekday: number // ISO: 1 = hétfő ... 7 = vasárnap
  startMinute: number // helyi idő, éjfél óta eltelt perc (540 = 09:00)
  endMinute: number
  validFrom?: Date | null
  validTo?: Date | null
}

export interface ServiceRules {
  durationMin: number
  bufferBeforeMin: number
  bufferAfterMin: number
  minLeadTimeHours: number
  maxLeadTimeDays: number
}

export type AppointmentStatusLike =
  | 'HOLD'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'

export interface ExistingAppointment {
  startsAt: Date
  endsAt: Date
  bufferBeforeMin: number
  bufferAfterMin: number
  status: AppointmentStatusLike
  holdUntil?: Date | null
}

/** Egy foglalható idősáv, a hozzá kiosztható szobával. */
export interface Slot {
  start: Date
  end: Date
  /** null, ha a kezeléshez nincs szoba rendelve (nincs kapacitás-korlát) */
  roomId: number | null
}

export interface RoomAvailability {
  /** A kezeléshez alkalmas szobák, elsőbbségi sorrendben. */
  eligibleRoomIds: number[]
  /** Szobánként a már lefoglalt sávok (pufferrel kiterjesztve). */
  busyByRoom: Record<number, Interval[]>
}

export interface AvailabilityInput {
  from: Date
  to: Date
  now: Date
  service: ServiceRules
  workingHours: WorkingHoursRule[]
  timeOff?: Interval[]
  closures?: Interval[]
  busy?: Interval[]
  /** Idősáv-raszter percben. 15 = negyedórás rács. */
  slotGranularityMin?: number
  /**
   * Igaz esetén a pufferoknak is bele kell férniük a rendelési időbe.
   * Alapértelmezésben hamis: a takarítási puffer túlnyúlhat a záráson.
   */
  requireBuffersInsideHours?: boolean
  /**
   * Szoba-kapacitás. Ha megadott és van benne alkalmas szoba, akkor egy idősáv
   * csak akkor foglalható, ha LEGALÁBB EGY alkalmas szoba szabad rá.
   *
   * Enélkül a rendszer csak a szakember idejét figyelné, és két ügyfél
   * ugyanarra a kezelőágyra kerülhetne.
   */
  rooms?: RoomAvailability
}

// ----------------------------------------------------------------------------
//  Időzóna-segédfüggvények (külső könyvtár nélkül, Intl alapon)
// ----------------------------------------------------------------------------

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

interface LocalParts {
  year: number
  month: number // 1-12
  day: number
  minute: number // éjfél óta eltelt perc
  weekday: number // ISO 1-7
}

/** Egy UTC instant helyi (Europe/Budapest) naptári bontása. */
export function localPartsOf(instant: Date): LocalParts {
  const p = partsFormatter.formatToParts(instant)
  const get = (t: string) => Number(p.find((x) => x.type === t)!.value)
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour')
  const minute = get('minute')

  // ISO hétköznap: a helyi dátumból, UTC-ként értelmezve (nap-pontos, elég)
  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() // 0=vas
  return {
    year,
    month,
    day,
    minute: hour * 60 + minute,
    weekday: jsWeekday === 0 ? 7 : jsWeekday,
  }
}

/** A zóna eltérése UTC-től percben, az adott instant pillanatában. */
function offsetMinutesAt(instant: Date): number {
  const p = partsFormatter.formatToParts(instant)
  const get = (t: string) => Number(p.find((x) => x.type === t)!.value)
  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return (asIfUtc - instant.getTime()) / 60000
}

/**
 * Helyi falióra-idő -> UTC instant.
 *
 * Az offset magától az instant-tól függ, ezért kétlépéses közelítés kell.
 * Tavaszi óraátállításkor (nem létező helyi idő) az eredmény az ugrás vége,
 * ami idősáv-határként a helyes viselkedés.
 */
export function localWallToUtc(
  year: number,
  month: number,
  day: number,
  minute: number,
): Date {
  const naive = Date.UTC(year, month - 1, day) + minute * 60000
  const firstGuess = new Date(naive - offsetMinutesAt(new Date(naive)) * 60000)
  const refined = offsetMinutesAt(firstGuess)
  return new Date(naive - refined * 60000)
}

// ----------------------------------------------------------------------------
//  Intervallum-műveletek
// ----------------------------------------------------------------------------

/**
 * Két intervallum átlapolódik-e. Az érintkezés NEM átlapolódás: ha egy puffer
 * pontosan akkor ér véget, amikor a következő foglalás kezdődik, az rendben van.
 * Exportált, hogy a foglalás-létrehozás ugyanezt használja, ne egy másolatot.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime()
}

/** base mínusz a cuts intervallumok -> a megmaradó (rendezett) szakaszok. */
export function subtractIntervals(base: Interval, cuts: Interval[]): Interval[] {
  let windows: Interval[] = [base]

  for (const cut of cuts) {
    const next: Interval[] = []
    for (const w of windows) {
      if (!overlaps(w, cut)) {
        next.push(w)
        continue
      }
      if (cut.start.getTime() > w.start.getTime()) {
        next.push({ start: w.start, end: cut.start })
      }
      if (cut.end.getTime() < w.end.getTime()) {
        next.push({ start: cut.end, end: w.end })
      }
    }
    windows = next
  }

  return windows.filter((w) => w.end.getTime() > w.start.getTime())
}

/**
 * Meglévő foglalásokból foglalt sávok, a pufferekkel kiterjesztve.
 *
 * Csak a valóban blokkoló státuszok számítanak: a LEMONDOTT foglalás és a
 * LEJÁRT zárolás nem foglalja az idősávot. (Ez az a pont, ahol a naiv
 * megoldások szellemfoglalásokkal töltik meg a naptárat.)
 */
export function toBusyBlocks(
  appointments: ExistingAppointment[],
  now: Date,
): Interval[] {
  const blocks: Interval[] = []

  for (const a of appointments) {
    const blocking =
      a.status === 'CONFIRMED' ||
      a.status === 'COMPLETED' ||
      a.status === 'PENDING_PAYMENT' ||
      a.status === 'NO_SHOW' ||
      (a.status === 'HOLD' &&
        a.holdUntil != null &&
        a.holdUntil.getTime() > now.getTime())

    if (!blocking) continue

    blocks.push({
      start: new Date(a.startsAt.getTime() - a.bufferBeforeMin * 60000),
      end: new Date(a.endsAt.getTime() + a.bufferAfterMin * 60000),
    })
  }

  return blocks
}

// ----------------------------------------------------------------------------
//  Nyitott rendelési sávok egy adott napra
// ----------------------------------------------------------------------------

function openWindowsForDay(
  parts: Pick<LocalParts, 'year' | 'month' | 'day' | 'weekday'>,
  rules: WorkingHoursRule[],
): Interval[] {
  const dayStart = localWallToUtc(parts.year, parts.month, parts.day, 0)

  return rules
    .filter((r) => r.weekday === parts.weekday)
    .filter((r) => !r.validFrom || r.validFrom.getTime() <= dayStart.getTime())
    .filter((r) => !r.validTo || r.validTo.getTime() >= dayStart.getTime())
    .filter((r) => r.endMinute > r.startMinute)
    .map((r) => ({
      start: localWallToUtc(parts.year, parts.month, parts.day, r.startMinute),
      end: localWallToUtc(parts.year, parts.month, parts.day, r.endMinute),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

// ----------------------------------------------------------------------------
//  Fő belépési pont

// ----------------------------------------------------------------------------
//  Jelöltgenerálás
// ----------------------------------------------------------------------------

interface Candidate {
  start: Date
  end: Date
  /** A szolgáltatás sávja a pufferekkel kiterjesztve – ez foglalja a helyet. */
  occupied: Interval
}

/**
 * Végigmegy a nyitott rendelési sávokon és kiadja azokat a kezdő időpontokat,
 * amelyek a SZAKEMBER szempontjából szabadok. A szoba-kapacitást nem vizsgálja
 * – azt a hívó dönti el, mert két publikus belépési pont osztozik ezen.
 */
function* candidates(input: AvailabilityInput): Generator<Candidate> {
  const {
    from,
    to,
    now,
    service,
    workingHours,
    timeOff = [],
    closures = [],
    busy = [],
    slotGranularityMin = 15,
    requireBuffersInsideHours = false,
  } = input

  if (service.durationMin <= 0) return
  if (to.getTime() <= from.getTime()) return

  // Előjegyzési korlátok
  const earliest = new Date(
    Math.max(from.getTime(), now.getTime() + service.minLeadTimeHours * 3600_000),
  )
  const latest = new Date(
    Math.min(to.getTime(), now.getTime() + service.maxLeadTimeDays * 86_400_000),
  )
  if (latest.getTime() <= earliest.getTime()) return

  const cuts = [...timeOff, ...closures, ...busy]
  const durationMs = service.durationMin * 60000
  const stepMs = slotGranularityMin * 60000

  // Egy nappal korábbról indulunk, hogy az éjfélen átnyúló nyitvatartás
  // se maradjon ki.
  let cursor = new Date(earliest.getTime() - 86_400_000)
  const endGuard = latest.getTime() + 86_400_000
  const seenDays = new Set<string>()
  const emitted = new Set<number>()

  while (cursor.getTime() <= endGuard) {
    const p = localPartsOf(cursor)
    const dayKey = `${p.year}-${p.month}-${p.day}`

    if (!seenDays.has(dayKey)) {
      seenDays.add(dayKey)

      for (const openWindow of openWindowsForDay(p, workingHours)) {
        for (const free of subtractIntervals(openWindow, cuts)) {
          // A rácsot a nyitott sáv kezdetéhez igazítjuk (09:00, 09:15, ...)
          for (
            let t = free.start.getTime();
            t + durationMs <= free.end.getTime();
            t += stepMs
          ) {
            if (t < earliest.getTime() || t > latest.getTime()) continue
            if (emitted.has(t)) continue

            const end = new Date(t + durationMs)
            const occupied: Interval = {
              start: new Date(t - service.bufferBeforeMin * 60000),
              end: new Date(end.getTime() + service.bufferAfterMin * 60000),
            }

            if (
              requireBuffersInsideHours &&
              (occupied.start.getTime() < openWindow.start.getTime() ||
                occupied.end.getTime() > openWindow.end.getTime())
            ) {
              continue
            }

            // A pufferrel kiterjesztett sáv ne ütközzön semmivel.
            // (A `free` szakasz csak a szolgáltatás hosszát garantálja.)
            if (cuts.some((c) => overlaps(occupied, c))) continue

            emitted.add(t)
            yield { start: new Date(t), end, occupied }
          }
        }
      }
    }

    cursor = new Date(cursor.getTime() + 86_400_000)
  }
}

// ----------------------------------------------------------------------------
//  Publikus belépési pontok
// ----------------------------------------------------------------------------

/**
 * A szakember szempontjából szabad kezdő időpontok (UTC), rendezve.
 * Szoba-kapacitást NEM vizsgál.
 */
export function computeFreeSlots(input: AvailabilityInput): Date[] {
  const out = [...candidates(input)].map((c) => c.start.getTime())
  return [...new Set(out)].sort((a, b) => a - b).map((t) => new Date(t))
}

/**
 * Foglalható idősávok a hozzájuk kiosztott szobával.
 *
 * Ha a kezeléshez van alkalmas szoba, akkor egy idősáv csak akkor kerül be, ha
 * legalább egy szoba szabad rá – és a válasz meg is mondja, melyik. A hold
 * létrehozásakor ugyanezt a szobát rögzítjük, tranzakcióban újraellenőrizve.
 *
 * A szoba kiválasztása determinisztikus (az eligibleRoomIds sorrendjében az
 * első szabad), hogy a foglalások ne szóródjanak szét feleslegesen.
 */
export function computeFreeSlotsWithRooms(input: AvailabilityInput): Slot[] {
  const eligible = input.rooms?.eligibleRoomIds ?? []
  const busyByRoom = input.rooms?.busyByRoom ?? {}
  const out: Slot[] = []

  for (const c of candidates(input)) {
    if (eligible.length === 0) {
      // Nincs szoba-korlát: csak a szakember ideje számít.
      out.push({ start: c.start, end: c.end, roomId: null })
      continue
    }

    const roomId = eligible.find(
      (id) => !(busyByRoom[id] ?? []).some((b) => overlaps(c.occupied, b)),
    )
    if (roomId !== undefined) out.push({ start: c.start, end: c.end, roomId })
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime())
}
