import * as Localization from 'expo-localization'
import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { setApiLocale, setApiMessages } from '../api/client'
import { de } from './de'
import { en } from './en'
import { hu, type StringKey, type Strings } from './strings'

/**
 * Nyelvválasztás: a TELEFON nyelve dönt.
 *
 * Ha a készülék nyelve nem támogatott, ANGOL lesz – nem magyar. Ez szándékos:
 * egy japán telefonnal érkező vendég az angolt legalább eséllyel érti, a
 * magyart nem. (A szerver oldalán ugyanez a lépcső: kért nyelv -> angol ->
 * magyar, lásd server/utils/i18n.ts.)
 *
 * A készülék nyelvlistáját sorrendben nézzük végig, mert a felhasználó több
 * nyelvet is beállíthat preferencia szerint. Példa: egy "de-AT" (osztrák
 * német) telefon németet kap – a régiót figyelmen kívül hagyjuk.
 */

export const SUPPORTED = ['hu', 'en', 'de'] as const
export type Locale = (typeof SUPPORTED)[number]

export const FALLBACK: Locale = 'en'

const TABLES: Record<Locale, Strings> = { hu, en, de }

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
}

const Ctx = createContext<I18nValue | null>(null)

export function I18nProvider({
  children,
  locale: forced,
}: {
  children: ReactNode
  /** Csak tesztekhez / előnézethez; éles használatban a telefon nyelve dönt. */
  locale?: Locale
}) {
  const locale = useMemo(() => {
    const resolved = forced ?? resolveLocale()

    // SZÁNDÉKOSAN itt, renderelés közben – nem `useEffect`-ben. A hatások a
    // gyerekektől felfelé futnak, tehát egy effekt CSAK a képernyők első
    // lekérdezései UTÁN állítaná be a nyelvet: a nyitóképernyő tartalma egy
    // pillanatra rossz nyelven érkezne. A beállítók egyszerű értékadások,
    // ismételt hívásuk ártalmatlan.
    setApiLocale(resolved)
    setApiMessages({
      network: TABLES[resolved]['error.network'],
      generic: TABLES[resolved]['error.generic'],
      sessionExpired: TABLES[resolved]['error.sessionExpired'],
    })

    return resolved
  }, [forced])

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

  return <Ctx.Provider value={{ locale, t }}>{children}</Ctx.Provider>
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
