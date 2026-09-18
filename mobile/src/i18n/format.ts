import { useMemo } from 'react'
import { useI18n } from './index'
import {
  formatDate,
  formatDateTime,
  formatMonth,
  formatPrice,
  formatTime,
  formatWeekday,
} from '../theme'

/**
 * A formázók az aktuális nyelvre kötve.
 *
 * Így a képernyők nem hordozzák körbe a nyelvkódot – és nem fordulhat elő,
 * hogy az egyik helyen kiírt dátum magyarul, a másik németül jelenik meg.
 */
export function useFormat() {
  const { locale } = useI18n()

  return useMemo(
    () => ({
      price: (n: number) => formatPrice(n, locale),
      dateTime: (iso: string) => formatDateTime(iso, locale),
      date: (iso: string) => formatDate(iso, locale),
      time: (iso: string) => formatTime(iso, locale),
      weekday: (iso: string) => formatWeekday(iso, locale),
      month: (iso: string) => formatMonth(iso, locale),
    }),
    [locale],
  )
}
