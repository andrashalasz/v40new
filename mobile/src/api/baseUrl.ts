import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'

/**
 * A backend címe – futásidőben felülírható.
 *
 * MIÉRT nem elég az app.json-beli érték: a TestFlight-os buildbe az beleég.
 * Amíg helyi (Docker) kiszolgálóval tesztelünk, a gép LAN-címe DHCP-vel
 * változhat – és minden változásnál új buildet kellene készíteni, ami 20-30
 * perc. Ezért a cím a készüléken felülírható, és a felülírás megmarad.
 *
 * A beépített érték marad az alapértelmezés: ha nincs felülírás, minden úgy
 * működik, mintha ez a fájl nem is létezne.
 */

const KEY = 'v40.apiBaseUrl'

const normalize = (url: string) => url.trim().replace(/\/+$/, '')

/** Az app.json-ben beégetett cím. */
export const DEFAULT_BASE_URL = normalize(
  String(
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
      'http://localhost:3001',
  ),
)

// Az aktuális cím memóriában, hogy minden kérés előtt ne kelljen a
// biztonságos tárolóhoz nyúlni – az lassú művelet.
let current = DEFAULT_BASE_URL

/** Induláskor egyszer: a mentett felülírás betöltése. */
export async function loadBaseUrl(): Promise<string> {
  try {
    const saved = await SecureStore.getItemAsync(KEY)
    if (saved) current = normalize(saved)
  } catch {
    // Olvashatatlan tároló: marad a beépített cím.
  }
  return current
}

export const getBaseUrl = () => current

/** Üres érték visszaállítja a beépített címet. */
export async function setBaseUrl(url: string): Promise<string> {
  const next = normalize(url)
  if (!next) {
    current = DEFAULT_BASE_URL
    await SecureStore.deleteItemAsync(KEY).catch(() => {})
    return current
  }

  current = next
  await SecureStore.setItemAsync(KEY, next).catch(() => {})
  return current
}

/** Elfogadható-e a megadott cím. A hibás cím néma hálózati hibaként jelentkezne. */
export function isValidBaseUrl(url: string): boolean {
  const v = url.trim()
  if (!v) return true // az üres = alapértelmezés
  return /^https?:\/\/[^\s/]+$/i.test(normalize(v))
}
