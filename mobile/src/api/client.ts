import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { clearTokens, loadTokens, saveTokens, type Tokens } from './tokens'

/**
 * A backend felé menő összes kérés egyetlen helyen.
 *
 * Amit megold, és ezért nem szabad helyette nyers `fetch`-et hívni:
 *
 *  1. Ráteszi a Bearer tokent.
 *  2. Ha a token lejárt (401), CSENDBEN frissít és megismétli a kérést –
 *     a felhasználó nem lát belőle semmit, nem kell 15 percenként belépnie.
 *  3. A párhuzamos frissítéseket ÖSSZEVONJA. Ha öt kérés fut ki egyszerre és
 *     mind 401-et kap, akkor is csak EGY frissítés indul. Enélkül öt rotáció
 *     indulna egymás ellen, és a szerver – helyesen – lopásnak minősítené,
 *     azaz kiléptetné a felhasználót az összes eszközéről.
 *  4. Ha a frissítés is elbukik, kijelentkeztet.
 */

const BASE_URL = String(
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
    'http://localhost:3001',
).replace(/\/$/, '')

export const deviceInfo = () => ({
  platform: Platform.OS === 'ios' ? ('ios' as const) : ('android' as const),
  deviceName: Device.deviceName ?? undefined,
  appVersion: Constants.expoConfig?.version ?? undefined,
})

/** Kijelentkezéskor hívjuk, hogy a felület is reagálhasson. */
let onSignedOut: (() => void) | null = null
export function setSignOutHandler(fn: (() => void) | null) {
  onSignedOut = fn
}

/**
 * Az aktuális nyelv, amit minden LEKÉRDEZÉSHEZ hozzáfűzünk.
 *
 * Miért itt és nem hívásonként: a backend szinte minden olvasó végpontja ért
 * `locale` paramétert (kezelések, kategóriák, bérletek, szövegek). Ha ezt
 * minden hívásnál kézzel kellene odaírni, egy-két helyen előbb-utóbb
 * kimaradna, és ott magyarul jelenne meg a tartalom egy német felhasználónak.
 * Az a fajta hiba ráadásul csak idegen nyelvre váltva látszik.
 *
 * Az írásokhoz (POST) NEM tesszük hozzá: ott a törzs számít, és egy váratlan
 * query paraméter csak zavar.
 */
let currentLocale = 'en'
export function setApiLocale(locale: string) {
  currentLocale = locale
}

/**
 * A kliens saját hibaüzenetei, a felhasználó nyelvén.
 *
 * A hálózati hibáknak nincs szerverválasza, amiből fordítást lehetne venni,
 * ezért a szövegeket a felület adja át induláskor (I18nProvider). Így ez a
 * modul React nélkül is működik, de nem kényszerít egy fix nyelvet.
 */
let messages = {
  network: 'No connection to the server.',
  generic: 'Something went wrong. Please try again.',
  sessionExpired: 'Your session has expired, please sign in again.',
}
export function setApiMessages(next: typeof messages) {
  messages = next
}

function withLocale(path: string): string {
  if (path.includes('locale=')) return path
  return `${path}${path.includes('?') ? '&' : '?'}locale=${encodeURIComponent(currentLocale)}`
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
  }
}

/** A szerver hibáinak egységes kicsomagolása. */
async function toError(res: Response): Promise<ApiError> {
  let message = messages.generic
  let fields: Record<string, string> | undefined
  try {
    const body = (await res.json()) as {
      statusMessage?: string
      message?: string
      data?: { fields?: Record<string, string> }
    }
    message = body.statusMessage || body.message || message
    fields = body.data?.fields
  } catch {
    // Nem JSON válasz (pl. proxy hibaoldal) – marad az általános üzenet.
  }
  return new ApiError(res.status, message, fields)
}

// --- Token-frissítés összevonása -------------------------------------------

let refreshing: Promise<Tokens | null> | null = null

async function refreshTokens(): Promise<Tokens | null> {
  // Ha már fut egy frissítés, mindenki ARRA vár – nem indít újat.
  if (refreshing) return refreshing

  refreshing = (async () => {
    const current = await loadTokens()
    if (!current) return null

    try {
      const res = await fetch(`${BASE_URL}/api/mobile/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken, device: deviceInfo() }),
      })
      if (!res.ok) return null

      const next = (await res.json()) as Tokens
      await saveTokens(next)
      return next
    } catch {
      // Hálózati hiba: NEM léptetünk ki. A felhasználó lehet, hogy csak
      // alagútban van – a hívó kap hibát, a token marad.
      throw new ApiError(0, messages.network)
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Hitelesítés nélküli hívás (belépés, regisztráció, publikus lista). */
  anonymous?: boolean
  signal?: AbortSignal
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined ? 'POST' : 'GET')
  const url = `${BASE_URL}${method === 'GET' ? withLocale(path) : path}`

  const send = async (token?: string): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    try {
      return await fetch(url, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: opts.signal,
      })
    } catch {
      throw new ApiError(0, messages.network)
    }
  }

  if (opts.anonymous) {
    const res = await send()
    if (!res.ok) throw await toError(res)
    return res.status === 204 ? (null as T) : ((await res.json()) as T)
  }

  const tokens = await loadTokens()
  let res = await send(tokens?.accessToken)

  // Lejárt token: egyszeri csendes frissítés, majd újrapróbálás.
  if (res.status === 401 && tokens) {
    const next = await refreshTokens()
    if (!next) {
      await clearTokens()
      onSignedOut?.()
      throw new ApiError(401, messages.sessionExpired)
    }
    res = await send(next.accessToken)

    // Ha a friss tokennel is 401, akkor a fiók maga vált érvénytelenné
    // (deaktiválás, törlés) – itt már nincs mit próbálni.
    if (res.status === 401) {
      await clearTokens()
      onSignedOut?.()
      throw new ApiError(401, messages.sessionExpired)
    }
  }

  if (!res.ok) throw await toError(res)
  return res.status === 204 ? (null as T) : ((await res.json()) as T)
}
