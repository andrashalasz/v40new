import { useQuery } from '@tanstack/react-query'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import { APPOINTMENT_STATUS, type Appointment, type MeResponse } from '../../src/api/types'
import { useAuth } from '../../src/auth/AuthContext'
import { colors, formatDateTime, formatFt, radius, spacing } from '../../src/theme'
import { Card, Empty, ErrorBox, H2, Loading, Muted, Row } from '../../src/ui'
import { SignInPrompt } from '../../src/ui/SignInPrompt'

export default function MyBookingsScreen() {
  const { user, loading } = useAuth()

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
    enabled: !!user,
  })

  if (loading) return <Loading />
  if (!user) return <SignInPrompt text="A foglalásaid megtekintéséhez lépj be a fiókodba." />
  if (me.isPending) return <Loading label="Foglalások betöltése…" />
  if (me.isError) {
    return (
      <View style={st.page}>
        <ErrorBox message={(me.error as ApiError).message} onRetry={() => void me.refetch()} />
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
      <H2>Közelgő</H2>
      {upcoming.length === 0 ? (
        <Empty text="Jelenleg nincs közelgő foglalásod." />
      ) : (
        upcoming.map((a) => <AppointmentCard key={a.publicRef} appointment={a} />)
      )}

      <View style={{ marginTop: spacing.lg }}>
        <H2>Korábbi</H2>
        {past.length === 0 ? (
          <Empty text="Még nincs lezárt kezelésed." />
        ) : (
          past.map((a) => <AppointmentCard key={a.publicRef} appointment={a} />)
        )}
      </View>
    </ScrollView>
  )
}

function AppointmentCard({ appointment: a }: { appointment: Appointment }) {
  return (
    <Card>
      <View style={st.head}>
        <Text style={st.title}>{a.service.title}</Text>
        <StatusBadge status={a.status} />
      </View>

      <Row label="Időpont" value={formatDateTime(a.startsAt)} />
      <Row label="Szakember" value={a.practitioner?.name ?? '—'} />
      <Row label="Időtartam" value={`${a.service.durationMin} perc`} />
      <Row label="Ár" value={formatFt(a.priceGross)} />

      <View style={{ marginTop: spacing.sm }}>
        <Muted>Azonosító: {a.publicRef}</Muted>
      </View>
    </Card>
  )
}

function StatusBadge({ status }: { status: Appointment['status'] }) {
  const tone =
    status === 'CONFIRMED' || status === 'COMPLETED'
      ? st.badgeOk
      : status === 'CANCELLED' || status === 'NO_SHOW'
        ? st.badgeBad
        : st.badgeWait

  return (
    <View style={[st.badge, tone]}>
      <Text style={st.badgeText}>{APPOINTMENT_STATUS[status]}</Text>
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
