import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeFreeSlots,
  computeFreeSlotsWithRooms,
  localWallToUtc,
  localPartsOf,
  subtractIntervals,
  toBusyBlocks,
  type AvailabilityInput,
  type WorkingHoursRule,
} from './availability.ts'

// ---------------------------------------------------------------------------
//  Segédek
// ---------------------------------------------------------------------------

/** Helyi (Europe/Budapest) falióra-idő -> Date. "2026-08-03 09:00" */
const L = (s: string): Date => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/)
  if (!m) throw new Error(`rossz formátum: ${s}`)
  return localWallToUtc(+m[1], +m[2], +m[3], +m[4] * 60 + +m[5])
}

/** Egy Date helyi "HH:MM" formában, az ellenőrzések olvashatóságához. */
const hhmm = (d: Date): string => {
  const p = localPartsOf(d)
  const h = Math.floor(p.minute / 60)
  const mi = p.minute % 60
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

const MON_TO_FRI_9_17: WorkingHoursRule[] = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  startMinute: 9 * 60,
  endMinute: 17 * 60,
}))

const base = (over: Partial<AvailabilityInput> = {}): AvailabilityInput => ({
  // 2026-08-03 hétfő
  from: L('2026-08-03 00:00'),
  to: L('2026-08-04 00:00'),
  now: L('2026-07-01 08:00'),
  service: {
    durationMin: 60,
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
    minLeadTimeHours: 0,
    maxLeadTimeDays: 365,
  },
  workingHours: MON_TO_FRI_9_17,
  slotGranularityMin: 15,
  ...over,
})

// ---------------------------------------------------------------------------
//  Időzóna
// ---------------------------------------------------------------------------

test('nyáron a helyi 09:00 az UTC 07:00 (CEST, +2)', () => {
  assert.equal(L('2026-08-03 09:00').toISOString(), '2026-08-03T07:00:00.000Z')
})

test('télen a helyi 09:00 az UTC 08:00 (CET, +1)', () => {
  assert.equal(L('2026-01-05 09:00').toISOString(), '2026-01-05T08:00:00.000Z')
})

test('a nyitvatartás UTC-ben eltolódik óraátállításkor, helyiben nem', () => {
  // Ugyanaz a "9-17" szabály, két különböző évszakban:
  const winter = computeFreeSlots(
    base({
      from: L('2026-01-05 00:00'),
      to: L('2026-01-06 00:00'),
      now: L('2026-01-01 08:00'),
    }),
  )
  const summer = computeFreeSlots(base())

  assert.equal(hhmm(winter[0]), '09:00')
  assert.equal(hhmm(summer[0]), '09:00')
  // ...de az UTC instant különböző:
  assert.equal(winter[0].toISOString().slice(11, 16), '08:00')
  assert.equal(summer[0].toISOString().slice(11, 16), '07:00')
})

// ---------------------------------------------------------------------------
//  Alapműködés
// ---------------------------------------------------------------------------

test('9-17 nyitvatartás, 60 perces kezelés, 15 perces raszter', () => {
  const slots = computeFreeSlots(base())
  // 09:00 ... 16:00 negyedóránként = 29 idősáv
  assert.equal(slots.length, 29)
  assert.equal(hhmm(slots[0]), '09:00')
  assert.equal(hhmm(slots.at(-1)!), '16:00')
})

test('a kezelésnek el kell férnie zárásig - 90 percnél korábban elfogy', () => {
  const slots = computeFreeSlots(base({ service: { ...base().service, durationMin: 90 } }))
  assert.equal(hhmm(slots.at(-1)!), '15:30')
})

test('zárt napon nincs idősáv (vasárnap)', () => {
  const slots = computeFreeSlots(
    base({ from: L('2026-08-09 00:00'), to: L('2026-08-10 00:00') }),
  )
  assert.equal(slots.length, 0)
})

test('napon belül két rendelési blokk (délelőtt + délután), az ebédszünet kimarad', () => {
  const slots = computeFreeSlots(
    base({
      workingHours: [
        { weekday: 1, startMinute: 8 * 60, endMinute: 12 * 60 },
        { weekday: 1, startMinute: 14 * 60, endMinute: 18 * 60 },
      ],
    }),
  )
  const times = slots.map(hhmm)
  assert.ok(times.includes('11:00'))
  assert.ok(!times.includes('12:00'), 'ebédszünetben nem foglalható')
  assert.ok(!times.includes('13:00'), 'ebédszünetben nem foglalható')
  assert.ok(times.includes('14:00'))
})

// ---------------------------------------------------------------------------
//  Ütközések és pufferek
// ---------------------------------------------------------------------------

test('meglévő foglalás kiüti az átlapoló idősávokat', () => {
  const slots = computeFreeSlots(
    base({ busy: [{ start: L('2026-08-03 11:00'), end: L('2026-08-03 12:00') }] }),
  )
  const times = slots.map(hhmm)
  assert.ok(!times.includes('10:30'), '10:30+60p belenyúlna a 11:00-as foglalásba')
  assert.ok(times.includes('10:00'))
  assert.ok(times.includes('12:00'))
})

test('a puffer is blokkol: 15 perc utópufferrel nem lehet közvetlenül utána foglalni', () => {
  const withBuffer = computeFreeSlots(
    base({
      service: { ...base().service, bufferBeforeMin: 15, bufferAfterMin: 15 },
      busy: [{ start: L('2026-08-03 11:00'), end: L('2026-08-03 12:00') }],
    }),
  )
  const times = withBuffer.map(hhmm)
  assert.ok(!times.includes('12:00'), 'a 15 perces előpuffer belenyúlna')
  assert.ok(times.includes('12:15'))
  // Az érintkezés megengedett: a 09:45+60p+15p puffer pontosan 11:00-kor ér véget.
  assert.ok(times.includes('09:45'))
})

test('a meglévő foglalás SAJÁT pufferei is védenek (toBusyBlocks-on át)', () => {
  const now = L('2026-08-01 10:00')
  const busy = toBusyBlocks(
    [
      {
        startsAt: L('2026-08-03 11:00'),
        endsAt: L('2026-08-03 12:00'),
        bufferBeforeMin: 15,
        bufferAfterMin: 15,
        status: 'CONFIRMED',
      },
    ],
    now,
  )
  assert.equal(hhmm(busy[0].start), '10:45')
  assert.equal(hhmm(busy[0].end), '12:15')

  const times = computeFreeSlots(
    base({ service: { ...base().service, bufferBeforeMin: 15, bufferAfterMin: 15 }, busy }),
  ).map(hhmm)

  assert.ok(!times.includes('09:45'), 'most már a szomszéd puffere is ütközik')
  assert.ok(times.includes('09:30'))
  assert.ok(!times.includes('12:15'))
  assert.ok(times.includes('12:30'))
})

test('lemondott foglalás NEM blokkol, megerősített igen', () => {
  const now = L('2026-08-01 10:00')
  const blocks = toBusyBlocks(
    [
      {
        startsAt: L('2026-08-03 11:00'),
        endsAt: L('2026-08-03 12:00'),
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        status: 'CANCELLED',
      },
      {
        startsAt: L('2026-08-03 14:00'),
        endsAt: L('2026-08-03 15:00'),
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        status: 'CONFIRMED',
      },
    ],
    now,
  )
  assert.equal(blocks.length, 1)
  assert.equal(hhmm(blocks[0].start), '14:00')
})

test('lejárt HOLD felszabadul, élő HOLD blokkol', () => {
  const now = L('2026-08-01 10:00')
  const blocks = toBusyBlocks(
    [
      {
        startsAt: L('2026-08-03 11:00'),
        endsAt: L('2026-08-03 12:00'),
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        status: 'HOLD',
        holdUntil: L('2026-08-01 09:45'), // már lejárt
      },
      {
        startsAt: L('2026-08-03 14:00'),
        endsAt: L('2026-08-03 15:00'),
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
        status: 'HOLD',
        holdUntil: L('2026-08-01 10:15'), // még él
      },
    ],
    now,
  )
  assert.equal(blocks.length, 1)
  assert.equal(hhmm(blocks[0].start), '14:00')
})

test('szabadság és ünnepnapi zárás is kivág', () => {
  const slots = computeFreeSlots(
    base({
      timeOff: [{ start: L('2026-08-03 09:00'), end: L('2026-08-03 13:00') }],
    }),
  )
  assert.equal(hhmm(slots[0]), '13:00')

  const closed = computeFreeSlots(
    base({ closures: [{ start: L('2026-08-03 00:00'), end: L('2026-08-04 00:00') }] }),
  )
  assert.equal(closed.length, 0)
})

// ---------------------------------------------------------------------------
//  Előjegyzési korlátok
// ---------------------------------------------------------------------------

test('minLeadTimeHours: 24 órán belülre nem lehet foglalni', () => {
  const slots = computeFreeSlots(
    base({
      now: L('2026-08-03 08:00'), // aznap reggel
      from: L('2026-08-03 00:00'),
      to: L('2026-08-06 00:00'),
      service: { ...base().service, minLeadTimeHours: 24 },
    }),
  )
  assert.ok(slots.every((s) => s.getTime() >= L('2026-08-04 08:00').getTime()))
  assert.equal(localPartsOf(slots[0]).day, 4)
})

test('maxLeadTimeDays: a naptár nem nyílik ki a jövőbe korlátlanul', () => {
  const slots = computeFreeSlots(
    base({
      now: L('2026-08-03 08:00'),
      from: L('2026-08-03 00:00'),
      to: L('2026-12-31 00:00'),
      service: { ...base().service, maxLeadTimeDays: 7 },
    }),
  )
  assert.ok(slots.length > 0)
  assert.ok(slots.every((s) => s.getTime() <= L('2026-08-10 08:00').getTime()))
})

// ---------------------------------------------------------------------------
//  Óraátállítás - itt szoktak elhasalni a naiv implementációk
// ---------------------------------------------------------------------------

test('tavaszi óraátállítás napja (2026-03-29): a 02:00-03:00 helyi idő nem létezik', () => {
  // Éjszakai ügyelet 00:00-06:00 helyi idő. A nap 23 órás, tehát a
  // valós hossz 5 óra, nem 6.
  const slots = computeFreeSlots(
    base({
      from: L('2026-03-29 00:00'),
      to: L('2026-03-30 00:00'),
      now: L('2026-03-01 08:00'),
      workingHours: [{ weekday: 7, startMinute: 0, endMinute: 6 * 60 }],
      service: { ...base().service, durationMin: 60 },
      slotGranularityMin: 60,
    }),
  )
  const start = L('2026-03-29 00:00')
  const end = L('2026-03-29 06:00')
  assert.equal((end.getTime() - start.getTime()) / 3_600_000, 5, '23 órás nap')
  assert.equal(slots.length, 5, '5 órás sávba 5 db 60 perces kezdés fér órás raszterrel')
  // A nem létező 02:00 helyi idő nem jelenhet meg
  assert.ok(!slots.map(hhmm).includes('02:00'))
})

test('őszi óraátállítás napja (2026-10-25): a 02:00-03:00 helyi idő kétszer van', () => {
  const start = L('2026-10-25 00:00')
  const end = L('2026-10-25 06:00')
  assert.equal((end.getTime() - start.getTime()) / 3_600_000, 7, '25 órás nap')

  const slots = computeFreeSlots(
    base({
      from: L('2026-10-25 00:00'),
      to: L('2026-10-26 00:00'),
      workingHours: [{ weekday: 7, startMinute: 0, endMinute: 6 * 60 }],
      slotGranularityMin: 60,
    }),
  )
  assert.equal(slots.length, 7, '7 órás valós sávba 7 db 60 perces kezdés fér')
})

// ---------------------------------------------------------------------------
//  Beosztás érvényessége
// ---------------------------------------------------------------------------

test('validFrom/validTo: a beosztás-változás nem hat vissza a múltra', () => {
  const rules: WorkingHoursRule[] = [
    { weekday: 1, startMinute: 9 * 60, endMinute: 12 * 60, validTo: L('2026-08-02 00:00') },
    { weekday: 1, startMinute: 14 * 60, endMinute: 17 * 60, validFrom: L('2026-08-03 00:00') },
  ]
  const slots = computeFreeSlots(base({ workingHours: rules }))
  const times = slots.map(hhmm)
  assert.ok(!times.includes('09:00'), 'a régi beosztás már nem érvényes')
  assert.ok(times.includes('14:00'))
})

// ---------------------------------------------------------------------------
//  Intervallum-aritmetika
// ---------------------------------------------------------------------------

test('subtractIntervals: a középső kivágás két szakaszra bont', () => {
  const out = subtractIntervals(
    { start: L('2026-08-03 09:00'), end: L('2026-08-03 17:00') },
    [{ start: L('2026-08-03 12:00'), end: L('2026-08-03 13:00') }],
  )
  assert.equal(out.length, 2)
  assert.equal(hhmm(out[0].end), '12:00')
  assert.equal(hhmm(out[1].start), '13:00')
})

test('subtractIntervals: teljes átfedés esetén nem marad semmi', () => {
  const out = subtractIntervals(
    { start: L('2026-08-03 09:00'), end: L('2026-08-03 17:00') },
    [{ start: L('2026-08-03 08:00'), end: L('2026-08-03 18:00') }],
  )
  assert.equal(out.length, 0)
})

// ---------------------------------------------------------------------------
//  Szoba-kapacitás
//  A "szabad-e a szakember?" kérdés nem elég: két ügyfél nem férhet ugyanarra
//  a kezelőágyra, akkor sem, ha két orvos épp szabad.
// ---------------------------------------------------------------------------

test('szoba nélkül nincs kapacitás-korlát, a roomId null', () => {
  const slots = computeFreeSlotsWithRooms(base())
  assert.equal(slots.length, 29)
  assert.equal(slots[0].roomId, null)
})

test('két alkalmas szoba: az egyik foglaltsága nem zárja ki az idősávot', () => {
  const slots = computeFreeSlotsWithRooms(
    base({
      rooms: {
        eligibleRoomIds: [1, 2],
        busyByRoom: { 1: [{ start: L('2026-08-03 11:00'), end: L('2026-08-03 12:00') }] },
      },
    }),
  )
  const at11 = slots.find((s) => hhmm(s.start) === '11:00')
  assert.ok(at11, 'a 11:00 továbbra is foglalható')
  assert.equal(at11!.roomId, 2, 'a szabad szobát kapja')
})

test('minden alkalmas szoba foglalt: nincs idősáv, hiába szabad az orvos', () => {
  const busy = [{ start: L('2026-08-03 11:00'), end: L('2026-08-03 12:00') }]
  const slots = computeFreeSlotsWithRooms(
    base({ rooms: { eligibleRoomIds: [1, 2], busyByRoom: { 1: busy, 2: busy } } }),
  )
  const times = slots.map((s) => hhmm(s.start))
  assert.ok(!times.includes('11:00'))
  assert.ok(!times.includes('10:30'), '10:30 + 60 perc belenyúlna')
  assert.ok(times.includes('10:00'))
  assert.ok(times.includes('12:00'))
})

test('a szobakiosztás determinisztikus: az első szabad szoba az elsőbbségi sorrendből', () => {
  const a = computeFreeSlotsWithRooms(
    base({ rooms: { eligibleRoomIds: [3, 1, 2], busyByRoom: {} } }),
  )
  assert.ok(a.every((s) => s.roomId === 3), 'mindig a lista első szabad eleme')

  const b = computeFreeSlotsWithRooms(
    base({
      rooms: {
        eligibleRoomIds: [3, 1, 2],
        busyByRoom: { 3: [{ start: L('2026-08-03 00:00'), end: L('2026-08-04 00:00') }] },
      },
    }),
  )
  assert.ok(b.every((s) => s.roomId === 1), 'a 3-as egész napra foglalt -> az 1-es jön')
})

test('a szoba pufferét is figyeli, nem csak a nyers foglalást', () => {
  // A szomszéd foglalás pufferrel kiterjesztett sávja: 10:45-12:15
  const busy = toBusyBlocks(
    [
      {
        startsAt: L('2026-08-03 11:00'),
        endsAt: L('2026-08-03 12:00'),
        bufferBeforeMin: 15,
        bufferAfterMin: 15,
        status: 'CONFIRMED',
      },
    ],
    L('2026-08-01 10:00'),
  )
  const slots = computeFreeSlotsWithRooms(
    base({
      service: { ...base().service, bufferBeforeMin: 15, bufferAfterMin: 15 },
      rooms: { eligibleRoomIds: [1], busyByRoom: { 1: busy } },
    }),
  )
  const times = slots.map((s) => hhmm(s.start))
  assert.ok(!times.includes('09:45'), 'a szomszéd előpuffere miatt ütközik')
  assert.ok(times.includes('09:30'))
  assert.ok(!times.includes('12:15'))
  assert.ok(times.includes('12:30'))
})

test('a szakember és a szoba korlátja együtt érvényesül', () => {
  const slots = computeFreeSlotsWithRooms(
    base({
      // az orvos 11-12 között máshol van
      busy: [{ start: L('2026-08-03 11:00'), end: L('2026-08-03 12:00') }],
      // az egyetlen szoba 14-15 között foglalt
      rooms: {
        eligibleRoomIds: [1],
        busyByRoom: { 1: [{ start: L('2026-08-03 14:00'), end: L('2026-08-03 15:00') }] },
      },
    }),
  )
  const times = slots.map((s) => hhmm(s.start))
  assert.ok(!times.includes('11:00'), 'orvos foglalt')
  assert.ok(!times.includes('14:00'), 'szoba foglalt')
  assert.ok(times.includes('10:00'))
  assert.ok(times.includes('15:00'))
})

test('a két belépési pont ugyanazt a jelöltkészletet adja, ha nincs szoba-korlát', () => {
  const input = base({ busy: [{ start: L('2026-08-03 11:00'), end: L('2026-08-03 12:00') }] })
  const plain = computeFreeSlots(input).map((d) => d.getTime())
  const withRooms = computeFreeSlotsWithRooms(input).map((s) => s.start.getTime())
  assert.deepEqual(plain, withRooms)
})
