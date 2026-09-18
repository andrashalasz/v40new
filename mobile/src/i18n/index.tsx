import * as Localization from 'expo-localization'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { setApiLocale, setApiMessages } from '../api/client'
import { de } from './de'
import { en } from './en'
import { loadLocalePreference, saveLocalePreference, type LocalePreference } from './preference'
import { hu, type StringKey, type Strings } from './strings'

/**
 * NYELVKEZELÉS
 *
 * Alapértelmezésben a TELEFON nyelve dönt. Ha a készülék nyelve nem
 * támogatott, ANGOL lesz – nem magyar: egy külföldi vendég az angolt legalább
 * eséllyel érti. (A szerver oldalán ugyanez a lépcső: kért nyelv -> angol ->
 * magyar, lásd server/utils/i18n.ts.)
 *
 * A felhasználó ezt FELÜLÍRHATJA, és a választása megmarad. Első indításkor
 * megkérdezzük; utána már nem, de a fiókjában bármikor átállíthatja.
 */

export const SUPPORTED = ['hu', 'en', 'de'] as const
export type Locale = (typeof SUPPORTED)[number]

export const FALLBACK: Locale = 'en'

const TABLES: Record<Locale, Strings> = { hu, en, de }

/** Megjelenítéshez: zászló és a nyelv SAJÁT nyelvű neve. */
export const LOCALE_LABELS: Record<Locale, { flag: string; name: string }> = {
  hu: { flag: '🇭🇺', name: 'Magyar' },
  en: { flag: '🇬🇧', name: 'English' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
}

/** A készülék nyelvei alapján az első támogatott nyelv, különben angol. */
export function resolveLocale(
  preferred: readonly string[] = Localization.getLocales().map((l) => l.languageCode ?? ''),
): Locale {
  for (const tag of preferred) {
    // "de-AT" -> "de"; a nyelv számít, a régió nem.
    const code = tag.toLowerCase().split('-')[0]
    const hit = SUPPORTED.find((s) => s === code)
    if (hit) return hit
  }
  return FALLBACK
}

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string

type I18nValue = {
  locale: Locale
  t: Translate
  /** A mentett beállítás; null, ha a felhasználó még nem választott. */
  preference: LocalePreference | null
  /** Nyelv beállítása (vagy 'auto' a telefon nyelvének követéséhez). */
  setPreference: (pref: LocalePreference) => Promise<void>
  /** A telefon nyelve – a választó képernyő ezt mutatja az "automatikus" mellett. */
  deviceLocale: Locale
}

const Ctx = createContext<I18nValue | null>(null)

/** Az API-kliens nem React: a nyelvet és a hálózati üzeneteket át kell adni neki. */
function pushToApiClient(locale: Locale) {
  setApiLocale(locale)
  setApiMessages({
    network: TABLES[locale]['error.network'],
    generic: TABLES[locale]['error.generic'],
    sessionExpired: TABLES[locale]['error.sessionExpired'],
  })
}

export function I18nProvider({
  children,
  locale: forced,
}: {
  children: ReactNode
  /** Csak tesztekhez / előnézethez; éles használatban a beállítás dönt. */
  locale?: Locale
}) {
  const deviceLocale = useMemo(() => resolveLocale(), [])
  const [preference, setPref] = useState<LocalePreference | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadLocalePreference()
      .then(setPref)
      .finally(() => setLoaded(true))
  }, [])

  const locale: Locale = useMemo(() => {
    if (forced) return forced
    if (preference && preference !== 'auto') return preference
    return deviceLocale
  }, [forced, preference, deviceLocale])

  // SZÁNDÉKOSAN renderelés közben – nem useEffect-ben. A hatások a gyerekektől
  // felfelé futnak, tehát egy effekt csak a képernyők első lekérdezései UTÁN
  // állítaná be a nyelvet: a nyitóképernyő tartalma egy pillanatra rossz
  // nyelven érkezne. A beállítók egyszerű értékadások, ismételt hívásuk
  // ártalmatlan.
  pushToApiClient(locale)

  const setPreference = useCallback(async (next: LocalePreference) => {
    await saveLocalePreference(next)
    setPref(next)
  }, [])

  const t = useCallback<Translate>(
    (key, vars) => {
      // A magyar tábla a teljes: ha egy fordítás hiányozna, inkább legyen
      // olvasható szöveg, mint nyers kulcs a képernyőn.
      const text = TABLES[locale][key] ?? en[key] ?? hu[key] ?? key

      if (!vars) return text
      return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
        name in vars ? String(vars[name]) : whole,
      )
    },
    [locale],
  )

  const value = useMemo(
    () => ({ locale, t, preference, setPreference, deviceLocale }),
    [locale, t, preference, setPreference, deviceLocale],
  )

  // Amíg a mentett beállítást olvassuk, nem renderelünk: különben egy pillanatra
  // a telefon nyelvén villanna fel a felület, majd átváltana a választottra.
  if (!loaded) return null

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('A useI18n csak az I18nProvider-en belül használható.')
  return ctx
}

/** Rövidítés ott, ahol csak a fordító kell. */
export function useT(): Translate {
  return useI18n().t
}
