import * as SecureStore from 'expo-secure-store'

/**
 * A KÉZZEL választott nyelv megőrzése.
 *
 * Három állapot van, és fontos megkülönböztetni őket:
 *
 *   null        – a felhasználó még nem választott. Ilyenkor a telefon nyelve
 *                 dönt, és első indításkor felkínáljuk a választást.
 *   'auto'      – kifejezetten azt kérte, hogy a telefon nyelvét kövessük.
 *                 Ez NEM ugyanaz, mint a null: itt már döntött, ezért nem
 *                 kérdezünk rá újra.
 *   'hu'|'en'|'de' – konkrét nyelv, a telefon beállításától függetlenül.
 *
 * A két első eset összemosása azt okozná, hogy a "kövesd a telefont" választás
 * után minden indításkor újra megjelenne a nyelvválasztó.
 */

const KEY = 'v40.locale'

export type LocalePreference = 'auto' | 'hu' | 'en' | 'de'

const VALID: LocalePreference[] = ['auto', 'hu', 'en', 'de']

/** A mentett választás, vagy null, ha még nem döntött. */
export async function loadLocalePreference(): Promise<LocalePreference | null> {
  try {
    const saved = await SecureStore.getItemAsync(KEY)
    return VALID.includes(saved as LocalePreference) ? (saved as LocalePreference) : null
  } catch {
    // Olvashatatlan tároló: kezeljük "még nem választott"-ként.
    return null
  }
}

export async function saveLocalePreference(pref: LocalePreference): Promise<void> {
  await SecureStore.setItemAsync(KEY, pref).catch(() => {})
}
