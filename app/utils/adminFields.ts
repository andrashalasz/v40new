/**
 * Admin mezőleírók.
 *
 * Ugyanaz a szerkezet, amit a szerveroldali `server/utils/resources.ts` Zod
 * sémái érvényesítenek. Egy generikus űrlap dolgozik belőlük, ezért öt entitás
 * kezeléséhez nem kell öt szerkesztőt fenntartani – és egy új mező felvétele
 * itt is, ott is egy sor.
 *
 * A kliens oldali ellenőrzés kényelmi funkció: az érdemi validálás mindig a
 * szerveren történik, mert a kliens megkerülhető.
 */

export type FieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'bool'
  | 'multi'
  | 'paragraphs'

export interface Field {
  key: string
  type: FieldType
  label: string
  required?: boolean
  hint?: string
  min?: number
  rows?: number
  /** Rácsbeli szélesség: 2 = fél sor, 3 = harmad sor */
  span?: 2 | 3
  options?: { value: string | number | null; label: string }[]
  /** Az opciók egy másik erőforrásból jönnek */
  optionsFrom?: ResourceName
  optionsLabel?: string
}

export type ResourceName =
  | 'services'
  | 'categories'
  | 'practitioners'
  | 'rooms'
  | 'passes'

export interface ResourceDef {
  name: ResourceName
  /** Az admin menüben és a címekben megjelenő nevek */
  plural: string
  singular: string
  lead: string
  /** Melyik mező a rekord megjelenítendő neve */
  titleKey: 'title' | 'name'
  columns: { label: string; get: (row: Row) => string }[]
  fields: Field[]
  blank: () => Row
}

export type Row = Record<string, unknown>

const VAT = [
  { value: 0, label: 'Áfamentes – egészségügyi szolgáltatás (TAM)' },
  { value: 27, label: '27% – esztétikai szolgáltatás' },
]

export const Ft = (n: unknown) =>
  new Intl.NumberFormat('hu-HU').format(Number(n) || 0) + ' Ft'

const pill = (on: unknown, yes = 'igen', no = 'nem') => (on ? yes : no)
const rel = (row: Row, key: string, idKey: string) =>
  (((row[key] as Row[]) ?? []).length || 0) + ' db'

export const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')

export const RESOURCES: Record<ResourceName, ResourceDef> = {
  services: {
    name: 'services',
    plural: 'Kezelések',
    singular: 'kezelés',
    lead: 'Ár, áfa, hossz, pufferek és foglalhatóság. A puffer az az idő, amit a rendszer a foglalás körül lefoglal, de nem számláz.',
    titleKey: 'title',
    columns: [
      { label: 'Kezelés', get: (r) => String(r.title) },
      { label: 'Típus', get: (r) => ((r.category as Row | null)?.name as string) ?? '—' },
      { label: 'Ár', get: (r) => Ft(r.priceGross) },
      { label: 'Áfa', get: (r) => (r.vatRate ? '27%' : 'áfamentes') },
      { label: 'Hossz', get: (r) => `${r.durationMin} p` },
      {
        label: 'Helyfoglalás',
        get: (r) =>
          `${Number(r.bufferBeforeMin) + Number(r.durationMin) + Number(r.bufferAfterMin)} p`,
      },
      { label: 'Szoba', get: (r) => rel(r, 'rooms', 'roomId') },
      { label: 'Online', get: (r) => pill(r.isBookableOnline) },
    ],
    fields: [
      { key: 'title', type: 'text', label: 'Megnevezés', required: true, span: 2 },
      {
        key: 'slug',
        type: 'text',
        label: 'URL-részlet (slug)',
        span: 2,
        hint: 'Ha üresen hagyod, a megnevezésből képződik. Módosításnál a régi címre 301-es átirányítás kell, különben elveszik a SEO.',
      },
      {
        key: 'categoryId',
        type: 'select',
        label: 'Kezelés típus',
        span: 2,
        optionsFrom: 'categories',
        optionsLabel: 'name',
      },
      {
        key: 'gender',
        type: 'select',
        label: 'Kinek ajánlott',
        span: 2,
        options: ['Mindenki', 'Női', 'Férfi'].map((v) => ({ value: v, label: v })),
      },
      { key: 'priceGross', type: 'number', label: 'Bruttó ár (Ft)', required: true, min: 0, span: 2 },
      {
        key: 'vatRate',
        type: 'select',
        label: 'Áfa',
        span: 2,
        options: VAT,
        hint: 'A magán egészségügyi szolgáltatás áfamentes (Áfa tv. 85. §), az esztétikai jellegű nem.',
      },
      { key: 'durationMin', type: 'number', label: 'Hossz (perc)', required: true, min: 5, span: 3 },
      { key: 'bufferBeforeMin', type: 'number', label: 'Puffer előtte (perc)', min: 0, span: 3 },
      { key: 'bufferAfterMin', type: 'number', label: 'Puffer utána (perc)', min: 0, span: 3 },
      {
        key: 'minLeadTimeHours',
        type: 'number',
        label: 'Legkorábban (óra)',
        min: 0,
        span: 2,
        hint: 'Ennyivel előbb kell foglalni.',
      },
      { key: 'maxLeadTimeDays', type: 'number', label: 'Naptár nyitva (nap)', min: 1, span: 2 },
      {
        key: 'roomIds',
        type: 'multi',
        label: 'Mely szobákban végezhető',
        optionsFrom: 'rooms',
        optionsLabel: 'name',
        hint: 'Ez adja a párhuzamos kapacitást. Szoba nélkül a rendszer csak a szakember idejét figyeli – infúziós kezelésnél ez általában hiba.',
      },
      {
        key: 'practitionerIds',
        type: 'multi',
        label: 'Mely szakemberek végzik',
        optionsFrom: 'practitioners',
        optionsLabel: 'name',
        hint: 'Szakember nélkül nem lesz foglalható idősáv.',
      },
      { key: 'lead', type: 'textarea', label: 'Rövid összefoglaló', rows: 2 },
      { key: 'desc', type: 'textarea', label: 'Leírás', rows: 5, required: true },
      { key: 'picUrl', type: 'text', label: 'Kép URL' },
      { key: 'metaTitle', type: 'text', label: 'SEO – címsor', span: 2 },
      { key: 'metaDescription', type: 'textarea', label: 'SEO – leírás', rows: 2, span: 2 },
      { key: 'sortOrder', type: 'number', label: 'Sorrend', span: 2 },
      { key: 'isActive', type: 'bool', label: 'Aktív' },
      { key: 'isBookableOnline', type: 'bool', label: 'Online foglalható' },
    ],
    blank: () => ({
      title: '',
      slug: '',
      categoryId: null,
      gender: 'Mindenki',
      priceGross: 0,
      vatRate: 0,
      durationMin: 60,
      bufferBeforeMin: 0,
      bufferAfterMin: 10,
      minLeadTimeHours: 24,
      maxLeadTimeDays: 90,
      lead: null,
      desc: '',
      picUrl: null,
      metaTitle: null,
      metaDescription: null,
      sortOrder: 0,
      isActive: true,
      isBookableOnline: true,
      roomIds: [],
      practitionerIds: [],
    }),
  },

  categories: {
    name: 'categories',
    plural: 'Kezelés típusok',
    singular: 'típus',
    lead: 'Ezek jelennek meg a nyitóoldalon. A részletes leírás a felugró ablak tartalma – bekezdésenként szerkeszthető.',
    titleKey: 'name',
    columns: [
      { label: 'Típus', get: (r) => String(r.name) },
      { label: 'Bekezdés a popupban', get: (r) => `${((r.longDesc as string[]) ?? []).length} db` },
      { label: 'Aktív', get: (r) => pill(r.isActive) },
    ],
    fields: [
      { key: 'name', type: 'text', label: 'Megnevezés', required: true, span: 2 },
      { key: 'slug', type: 'text', label: 'URL-részlet (slug)', span: 2 },
      { key: 'shortDesc', type: 'textarea', label: 'Rövid leírás (a kártyán)', rows: 3, required: true },
      {
        key: 'longDesc',
        type: 'paragraphs',
        label: 'Részletes leírás (felugró ablak)',
        hint: 'Minden bekezdés külön mezőben. Ez jelenik meg, ha a látogató a kártyára kattint. Az üres bekezdéseket a szerver kiszűri.',
      },
      { key: 'iconUrl', type: 'text', label: 'Ikon URL' },
      { key: 'sortOrder', type: 'number', label: 'Sorrend', span: 2 },
      { key: 'isActive', type: 'bool', label: 'Aktív' },
    ],
    blank: () => ({
      name: '',
      slug: '',
      shortDesc: '',
      longDesc: [''],
      iconUrl: null,
      sortOrder: 0,
      isActive: true,
    }),
  },

  practitioners: {
    name: 'practitioners',
    plural: 'Szakemberek',
    singular: 'szakember',
    lead: 'Ki dolgozik a rendelőben és melyik kezelést végzi. A beosztást a Beosztás menüpont alatt állítod.',
    titleKey: 'name',
    columns: [
      { label: 'Név', get: (r) => String(r.name) },
      { label: 'Szakterület', get: (r) => (r.category as string) ?? '—' },
      { label: 'Kezelések', get: (r) => rel(r, 'services', 'serviceId') },
      { label: 'Aktív', get: (r) => pill(r.isActive) },
    ],
    fields: [
      { key: 'name', type: 'text', label: 'Név', required: true, span: 2 },
      { key: 'titles', type: 'text', label: 'Titulus', span: 2, hint: 'pl. Dr., PhD' },
      { key: 'slug', type: 'text', label: 'URL-részlet (slug)', span: 2 },
      { key: 'category', type: 'text', label: 'Szakterület', span: 2 },
      { key: 'desc', type: 'textarea', label: 'Bemutatkozás', rows: 5, required: true },
      {
        key: 'serviceIds',
        type: 'multi',
        label: 'Mely kezeléseket végzi',
        optionsFrom: 'services',
        optionsLabel: 'title',
      },
      { key: 'picUrl', type: 'text', label: 'Fotó URL' },
      { key: 'metaTitle', type: 'text', label: 'SEO – címsor', span: 2 },
      { key: 'metaDescription', type: 'textarea', label: 'SEO – leírás', rows: 2, span: 2 },
      { key: 'isActive', type: 'bool', label: 'Aktív' },
    ],
    blank: () => ({
      name: '',
      titles: null,
      slug: '',
      category: null,
      desc: '',
      picUrl: null,
      metaTitle: null,
      metaDescription: null,
      isActive: true,
      serviceIds: [],
    }),
  },

  rooms: {
    name: 'rooms',
    plural: 'Szobák',
    singular: 'szoba',
    lead: 'A szoba adja a párhuzamos kapacitást: ha minden alkalmas szoba foglalt, nincs több szabad idősáv – akkor sem, ha a szakember szabad.',
    titleKey: 'name',
    columns: [
      { label: 'Szoba', get: (r) => String(r.name) },
      { label: 'Kezelések', get: (r) => rel(r, 'services', 'serviceId') },
      { label: 'Aktív', get: (r) => pill(r.isActive) },
    ],
    fields: [
      { key: 'name', type: 'text', label: 'Megnevezés', required: true },
      { key: 'sortOrder', type: 'number', label: 'Sorrend', span: 2 },
      { key: 'isActive', type: 'bool', label: 'Aktív' },
    ],
    blank: () => ({ name: '', sortOrder: 0, isActive: true }),
  },

  passes: {
    name: 'passes',
    plural: 'Bérletek',
    singular: 'bérlet',
    lead: 'Előre fizetett alkalomcsomagok. Foglaláskor a rendszer levon egy alkalmat, lemondáskor visszaírja.',
    titleKey: 'title',
    columns: [
      { label: 'Bérlet', get: (r) => String(r.title) },
      { label: 'Alkalom', get: (r) => (r.sessionCount ? `${r.sessionCount} db` : 'korlátlan') },
      { label: 'Ár', get: (r) => Ft(r.priceGross) },
      { label: 'Érvényesség', get: (r) => `${r.validityDays} nap` },
      { label: 'Kezelések', get: (r) => rel(r, 'services', 'serviceId') },
      { label: 'Aktív', get: (r) => pill(r.isActive) },
    ],
    fields: [
      { key: 'title', type: 'text', label: 'Megnevezés', required: true, span: 2 },
      { key: 'slug', type: 'text', label: 'URL-részlet (slug)', span: 2 },
      { key: 'priceGross', type: 'number', label: 'Bruttó ár (Ft)', required: true, min: 0, span: 3 },
      {
        key: 'sessionCount',
        type: 'number',
        label: 'Alkalmak száma',
        min: 1,
        span: 3,
        hint: 'Üresen hagyva korlátlan az érvényességi időn belül.',
      },
      { key: 'validityDays', type: 'number', label: 'Érvényesség (nap)', required: true, min: 1, span: 3 },
      { key: 'vatRate', type: 'select', label: 'Áfa', options: VAT },
      {
        key: 'serviceIds',
        type: 'multi',
        label: 'Mely kezelésekre használható',
        optionsFrom: 'services',
        optionsLabel: 'title',
        required: true,
      },
      { key: 'desc', type: 'textarea', label: 'Leírás', rows: 4, required: true },
      { key: 'picUrl', type: 'text', label: 'Kép URL' },
      { key: 'sortOrder', type: 'number', label: 'Sorrend', span: 2 },
      { key: 'transferable', type: 'bool', label: 'Átruházható' },
      { key: 'isActive', type: 'bool', label: 'Aktív' },
    ],
    blank: () => ({
      title: '',
      slug: '',
      desc: '',
      priceGross: 0,
      vatRate: 0,
      sessionCount: 5,
      validityDays: 180,
      transferable: false,
      picUrl: null,
      sortOrder: 0,
      isActive: true,
      serviceIds: [],
    }),
  },
}

/**
 * Nem blokkoló figyelmeztetések. A mentést nem tiltják, csak jelzik, ha a
 * beállítás együttesen értelmetlen – egyenként ugyanis mindegyik érvényes.
 */
export function softWarnings(name: ResourceName, d: Row): string[] {
  const w: string[] = []
  const n = (k: string) => Number(d[k] ?? 0)
  const arr = (k: string) => (d[k] as unknown[]) ?? []

  if (name === 'services') {
    if (!arr('roomIds').length)
      w.push('Nincs szoba hozzárendelve, tehát a párhuzamos kapacitás nincs korlátozva.')
    if (!arr('practitionerIds').length)
      w.push('Egyetlen szakember sincs hozzárendelve, így nem lesz foglalható idősáv.')
    if (n('priceGross') === 0) w.push('Az ár 0 Ft.')
    if (n('durationMin') > 240)
      w.push(`${n('durationMin')} perc szokatlanul hosszú – elfér a nyitvatartásban?`)
    // A címből tippelni, hogy esztétikai-e a kezelés, törékeny volt (a "Teszt"
    // szó is beletalált egy /eszt/ mintába), ezért mindig jelezzük.
    if (n('vatRate') === 27)
      w.push(
        '27%-os áfa van beállítva, tehát a rendszer nem egészségügyi szolgáltatásként számlázza. Ha ez egészségügyi kezelés, áfamentes (TAM) kell.',
      )
  }

  if (name === 'practitioners' && !arr('serviceIds').length)
    w.push('Nincs kezelés hozzárendelve, így nem lesz foglalható idősáv.')

  if (name === 'passes') {
    if (!arr('serviceIds').length)
      w.push('Nincs kezelés hozzárendelve, így a bérlet nem használható fel.')
    if (n('validityDays') < 30)
      w.push('Rövid érvényesség. Előre fizetett csomagnál ez fogyasztóvédelmi vitát okozhat.')
  }

  return w
}
