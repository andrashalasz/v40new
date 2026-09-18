import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import { useAuth } from '../../src/auth/AuthContext'
import { useI18n } from '../../src/i18n'
import { useFormat } from '../../src/i18n/format'
import type { StringKey } from '../../src/i18n/strings'
import { clinicDayOf, colors, radius, spacing } from '../../src/theme'
import { Button, Card, ErrorBox, Field, H2, Loading, Muted, Row } from '../../src/ui'

/**
 * Foglalási folyamat: szakember -> nap -> időpont -> adatok -> megerősítés.
 *
 * Ugyanazt a két végpontot használja, mint a weboldal: az /api/availability
 * számolja a szabad sávokat (a tesztelt motorból), az /api/appointments/hold
 * pedig tranzakciós zárolással foglal. Így egy foglalási szabály megváltozása
 * automatikusan érvényes az appban is – nincs két, egymástól elcsúszó logika.
 */

type Service = {
  id: number
  slug: string
  title: string
  desc: string
  price: number
  time: number
  vatRate: number
}

type Slot = { start: string; end: string; roomId: number }
type Practitioner = { practitionerId: number; practitionerName: string; slots: Slot[] }
type Availability = { serviceId: number; durationMin: number; practitioners: Practitioner[] }

type Settlement = 'ON_SITE' | 'PASS' | 'ONLINE_CARD'

const SETTLEMENTS: { value: Settlement; label: StringKey; hint: StringKey }[] = [
  { value: 'ON_SITE', label: 'settlement.onSite', hint: 'settlement.onSiteHint' },
  { value: 'PASS', label: 'settlement.pass', hint: 'settlement.passHint' },
  { value: 'ONLINE_CARD', label: 'settlement.card', hint: 'settlement.cardHint' },
]

/** A következő 14 nap – ennyire előre érdemes kínálni időpontot. */
const DAYS_AHEAD = 14

export default function BookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { user } = useAuth()
  const { locale, t } = useI18n()
  const fmt = useFormat()

  const [practitionerId, setPractitionerId] = useState<number | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [start, setStart] = useState<string | null>(null)
  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [form, setForm] = useState({ lastName: '', firstName: '', email: '', phone: '', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ publicRef: string; startsAt: string } | null>(null)

  const service = useQuery({
    queryKey: ['service', slug, locale],
    queryFn: () =>
      api<{ product: Service }>(`/api/products?slug=${encodeURIComponent(String(slug))}`, {
        anonymous: true,
      }).then((r) => r.product),
    enabled: !!slug,
  })

  const range = useMemo(() => {
    const from = new Date()
    const to = new Date(from.getTime() + DAYS_AHEAD * 86400_000)
    return { from: from.toISOString(), to: to.toISOString() }
  }, [])

  const availability = useQuery({
    queryKey: ['availability', service.data?.id, range.from],
    queryFn: () =>
      api<Availability>(
        `/api/availability?serviceId=${service.data!.id}&from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
        { anonymous: true },
      ),
    enabled: !!service.data?.id,
    // A szabad időpont gyorsan avul: amíg a felhasználó gondolkodik, más
    // lefoglalhatja. Ezért itt nincs hosszú gyorsítótár.
    staleTime: 0,
  })

  if (service.isPending) return <Loading label={t('booking.loadingService')} />
  if (service.isError) {
    return (
      <View style={st.page}>
        <ErrorBox message={(service.error as ApiError).message} />
      </View>
    )
  }

  const svc = service.data
  const practitioners = availability.data?.practitioners ?? []
  const chosen = practitioners.find((p) => p.practitionerId === practitionerId) ?? null

  // Napok, amelyeken a kiválasztott szakembernek van szabad sávja. A napot a
  // RENDELŐ időzónájában képezzük – UTC szerint egy esti időpont a következő
  // nap alá csúszna.
  const daysWithSlots = new Map<string, Slot[]>()
  for (const slot of chosen?.slots ?? []) {
    const key = clinicDayOf(slot.start)
    const list = daysWithSlots.get(key) ?? []
    list.push(slot)
    daysWithSlots.set(key, list)
  }
  const daySlots = day ? (daysWithSlots.get(day) ?? []) : []

  async function submit() {
    if (!settlement || !start) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api<{ publicRef: string; startsAt: string }>('/api/appointments/hold', {
        // Bejelentkezve a szerver a munkamenetből tudja, ki foglal; vendégként
        // a megadott adatokból hoz létre fiókot.
        anonymous: !user,
        body: {
          serviceId: svc.id,
          practitionerId,
          startsAt: start,
          settlement,
          note: form.note || undefined,
          customer: user
            ? undefined
            : {
                lastName: form.lastName,
                firstName: form.firstName,
                email: form.email,
                phone: form.phone,
              },
        },
      })
      setResult(res)
    } catch (e) {
      // Magyarul a szerver üzenete pontosabb (pl. "ez az idősáv elkelt");
      // idegen nyelven viszont csak magyarul létezik, ezért a sajátunkat adjuk.
      const fromServer = e instanceof ApiError ? e.message : ''
      setError(locale === 'hu' && fromServer ? fromServer : t('booking.failed'))
      // Ha az idősáv közben elkelt, ne kínáljuk fel újra: frissítjük a naptárat
      // és visszalépünk az időpontválasztáshoz.
      setStart(null)
      void availability.refetch()
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <ScrollView contentContainerStyle={st.page}>
        <Card>
          <H2>{t('booking.success')}</H2>
          <Muted>{t('booking.successHint')}</Muted>
          <View style={{ marginTop: spacing.md }}>
            <Row label={t('common.identifier')} value={result.publicRef} />
            <Row label={t('booking.treatment')} value={svc.title} />
            <Row label={t('booking.time')} value={fmt.dateTime(result.startsAt)} />
          </View>
          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <Button label={t('booking.myBookings')} onPress={() => router.replace('/foglalasaim')} />
            <Button
              label={t('booking.moreTreatments')}
              variant="secondary"
              onPress={() => router.replace('/')}
            />
          </View>
        </Card>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={st.page} keyboardShouldPersistTaps="handled">
      <Card>
        <H2>{svc.title}</H2>
        <Muted>
          {svc.time} {t('common.minutes')} · {fmt.price(svc.price)}
        </Muted>
      </Card>

      {availability.isPending && <Loading label={t('booking.loadingSlots')} />}

      {availability.isError && (
        <ErrorBox
          message={(availability.error as ApiError).message}
          retryLabel={t('common.retry')}
          onRetry={() => void availability.refetch()}
        />
      )}

      {availability.isSuccess && practitioners.length === 0 && (
        <Card>
          <Muted>{t('booking.noSlots')}</Muted>
        </Card>
      )}

      {practitioners.length > 0 && (
        <Card>
          <H2>{t('booking.practitioner')}</H2>
          <View style={st.optionRow}>
            {practitioners.map((p) => (
              <Pressable
                key={p.practitionerId}
                accessibilityRole="button"
                accessibilityState={{ selected: practitionerId === p.practitionerId }}
                onPress={() => {
                  setPractitionerId(p.practitionerId)
                  setDay(null)
                  setStart(null)
                }}
                style={[st.option, practitionerId === p.practitionerId && st.optionOn]}
              >
                <Text
                  style={[st.optionText, practitionerId === p.practitionerId && st.optionTextOn]}
                >
                  {p.practitionerName}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      {!!chosen && (
        <Card>
          <H2>{t('booking.day')}</H2>
          {daysWithSlots.size === 0 ? (
            <Muted>{t('booking.noSlotsForPractitioner')}</Muted>
          ) : (
            <View style={st.optionRow}>
              {[...daysWithSlots.keys()].sort().map((d) => {
                // Dél: a nap közepe minden időzónában ugyanarra a napra esik.
                const noon = `${d}T12:00:00Z`
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    accessibilityState={{ selected: day === d }}
                    onPress={() => {
                      setDay(d)
                      setStart(null)
                    }}
                    style={[st.day, day === d && st.optionOn]}
                  >
                    <Text style={[st.dayWeekday, day === d && st.optionTextOn]}>
                      {fmt.weekday(noon)}
                    </Text>
                    <Text style={[st.dayNumber, day === d && st.optionTextOn]}>
                      {Number(d.slice(8, 10))}
                    </Text>
                    <Text style={[st.dayMonth, day === d && st.optionTextOn]}>
                      {fmt.month(noon)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}
        </Card>
      )}

      {!!day && (
        <Card>
          <H2>{t('booking.time')}</H2>
          <View style={st.optionRow}>
            {daySlots.map((slot) => (
              <Pressable
                key={slot.start}
                accessibilityRole="button"
                accessibilityLabel={fmt.time(slot.start)}
                accessibilityState={{ selected: start === slot.start }}
                onPress={() => setStart(slot.start)}
                style={[st.slot, start === slot.start && st.optionOn]}
              >
                <Text style={[st.optionText, start === slot.start && st.optionTextOn]}>
                  {fmt.time(slot.start)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      {!!start && !user && (
        <Card>
          <H2>{t('booking.yourDetails')}</H2>
          <Muted>{t('booking.detailsHint')}</Muted>
          <View style={{ marginTop: spacing.md }}>
            <Field
              label={t('booking.lastName')}
              value={form.lastName}
              onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
              autoComplete="family-name"
            />
            <Field
              label={t('booking.firstName')}
              value={form.firstName}
              onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
              autoComplete="given-name"
            />
            <Field
              label={t('booking.email')}
              value={form.email}
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Field
              label={t('booking.phone')}
              value={form.phone}
              onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>
        </Card>
      )}

      {!!start && (
        <Card>
          <H2>{t('booking.payment')}</H2>
          {SETTLEMENTS.map((s) => (
            <Pressable
              key={s.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: settlement === s.value }}
              onPress={() => setSettlement(s.value)}
              style={[st.radio, settlement === s.value && st.radioOn]}
            >
              <Text style={st.radioLabel}>{t(s.label)}</Text>
              <Muted>{t(s.hint)}</Muted>
            </Pressable>
          ))}
        </Card>
      )}

      {!!start && (
        <Card>
          <H2>{t('booking.summary')}</H2>
          <Row label={t('booking.treatment')} value={svc.title} />
          <Row label={t('booking.practitioner')} value={chosen?.practitionerName ?? '—'} />
          <Row label={t('booking.time')} value={fmt.dateTime(start)} />
          <Row label={t('booking.duration')} value={`${svc.time} ${t('common.minutes')}`} />
          <Row
            label={t('booking.vat')}
            value={svc.vatRate ? t('treatments.vatIncluded') : t('treatments.vatExempt')}
          />
          <Row label={t('booking.total')} value={fmt.price(svc.price)} />

          {!!error && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={st.error}>{error}</Text>
            </View>
          )}

          <View style={{ marginTop: spacing.lg }}>
            <Button
              label={t('booking.confirm')}
              onPress={() => void submit()}
              loading={submitting}
              disabled={!settlement || (!user && !form.email)}
            />
          </View>
        </Card>
      )}
    </ScrollView>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  option: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  optionOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionText: { color: colors.text, fontSize: 15 },
  optionTextOn: { color: colors.onInk, fontWeight: '600' },

  day: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 64,
  },
  dayWeekday: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase' },
  dayNumber: { fontSize: 20, fontWeight: '700', color: colors.text },
  dayMonth: { fontSize: 11, color: colors.textMuted },

  slot: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    minWidth: 78,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radio: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  radioOn: { borderColor: colors.ink, backgroundColor: colors.tint },
  radioLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },

  error: { color: colors.danger, fontSize: 15, lineHeight: 21 },
})
