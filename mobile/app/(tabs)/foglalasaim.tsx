import { useQuery } from '@tanstack/react-query'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import type { Appointment, MeResponse } from '../../src/api/types'
import { useAuth } from '../../src/auth/AuthContext'
import { useI18n, useT } from '../../src/i18n'
import { useFormat } from '../../src/i18n/format'
import { colors, radius, spacing } from '../../src/theme'
import { Card, Empty, ErrorBox, H2, Loading, Muted, Row } from '../../src/ui'
import { SignInPrompt } from '../../src/ui/SignInPrompt'

export default function MyBookingsScreen() {
  const { user, loading } = useAuth()
  const { locale, t } = useI18n()

  const me = useQuery({
    queryKey: ['me', locale],
    queryFn: () => api<MeResponse>('/api/me'),
    enabled: !!user,
  })

  if (loading) return <Loading />
  if (!user) return <SignInPrompt text={t('signIn.requiredBookings')} />
  if (me.isPending) return <Loading label={t('bookings.loading')} />
  if (me.isError) {
    return (
      <View style={st.page}>
        <ErrorBox
          message={(me.error as ApiError).message}
          retryLabel={t('common.retry')}
          onRetry={() => void me.refetch()}
        />
      </View>
    )
  }

  const { upcoming, past } = me.data

  return (
    <ScrollView
      contentContainerStyle={st.page}
      refreshControl={
        <RefreshControl refreshing={me.isFetching} onRefresh={() => void me.refetch()} />
      }
    >
      <H2>{t('bookings.upcoming')}</H2>
      {upcoming.length === 0 ? (
        <Empty text={t('bookings.noUpcoming')} />
      ) : (
        upcoming.map((a) => <AppointmentCard key={a.publicRef} appointment={a} />)
      )}

      <View style={{ marginTop: spacing.lg }}>
        <H2>{t('bookings.past')}</H2>
        {past.length === 0 ? (
          <Empty text={t('bookings.noPast')} />
        ) : (
          past.map((a) => <AppointmentCard key={a.publicRef} appointment={a} />)
        )}
      </View>
    </ScrollView>
  )
}

function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  const t = useT()
  const fmt = useFormat()

  return (
    <Card>
      <View style={st.head}>
        <Text style={st.title}>{a.service.title}</Text>
        <StatusBadge status={a.status} />
      </View>

      <Row label={t('booking.time')} value={fmt.dateTime(a.startsAt)} />
      <Row label={t('booking.practitioner')} value={a.practitioner?.name ?? '—'} />
      <Row label={t('booking.duration')} value={`${a.service.durationMin} ${t('common.minutes')}`} />
      <Row label={t('bookings.price')} value={fmt.price(a.priceGross)} />

      <View style={{ marginTop: spacing.sm }}>
        <Muted>
          {t('common.identifier')}: {a.publicRef}
        </Muted>
      </View>
    </Card>
  )
}

function StatusBadge({ status }: { status: Appointment['status'] }) {
  const t = useT()
  const tone =
    status === 'CONFIRMED' || status === 'COMPLETED'
      ? st.badgeOk
      : status === 'CANCELLED' || status === 'NO_SHOW'
        ? st.badgeBad
        : st.badgeWait

  return (
    <View style={[st.badge, tone]}>
      <Text style={st.badgeText}>{t(`status.${status}`)}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
  badge: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.text },
  badgeOk: { backgroundColor: 'rgba(27, 94, 32, 0.12)' },
  badgeWait: { backgroundColor: colors.chip },
  badgeBad: { backgroundColor: 'rgba(179, 38, 30, 0.12)' },
})
