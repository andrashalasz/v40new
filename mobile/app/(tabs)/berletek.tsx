import { useQuery } from '@tanstack/react-query'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import type { CustomerPass, MeResponse, PassTemplate } from '../../src/api/types'
import { useAuth } from '../../src/auth/AuthContext'
import { colors, formatFt, radius, spacing } from '../../src/theme'
import { Card, Empty, ErrorBox, H2, Loading, Muted, Row } from '../../src/ui'

/**
 * Bérletek: a saját, érvényes bérletek felül, alattuk a megvásárolható
 * csomagok.
 *
 * A vásárlás MÉG NEM innen indul – lásd a képernyő alján lévő megjegyzést.
 */
export default function PassesScreen() {
  const { user } = useAuth()

  const catalog = useQuery({
    queryKey: ['passTemplates'],
    queryFn: () => api<PassTemplate[]>('/api/passes', { anonymous: true }),
  })

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
    enabled: !!user,
  })

  if (catalog.isPending) return <Loading label="Bérletek betöltése…" />
  if (catalog.isError) {
    return (
      <View style={st.page}>
        <ErrorBox
          message={(catalog.error as ApiError).message}
          onRetry={() => void catalog.refetch()}
        />
      </View>
    )
  }

  const myPasses = me.data?.passes ?? []

  return (
    <FlatList
      data={catalog.data}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={st.page}
      refreshing={catalog.isFetching}
      onRefresh={() => {
        void catalog.refetch()
        if (user) void me.refetch()
      }}
      ListHeaderComponent={
        <View>
          {!!user && (
            <View style={{ marginBottom: spacing.lg }}>
              <H2>Az én bérleteim</H2>
              {myPasses.length === 0 ? (
                <Empty text="Jelenleg nincs érvényes bérleted." />
              ) : (
                myPasses.map((p) => <MyPassCard key={p.code} pass={p} />)
              )}
            </View>
          )}
          <H2>Megvásárolható bérletek</H2>
        </View>
      }
      ListEmptyComponent={<Empty text="Jelenleg nincs elérhető bérlet." />}
      renderItem={({ item }) => <PassTemplateCard pass={item} />}
    />
  )
}

function MyPassCard({ pass }: { pass: CustomerPass }) {
  const used = pass.sessionsTotal - pass.sessionsRemaining
  const ratio = pass.sessionsTotal > 0 ? used / pass.sessionsTotal : 0

  return (
    <Card>
      <Text style={st.title}>{pass.passTemplate.title}</Text>

      <View style={st.barTrack}>
        <View style={[st.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
      <Muted>
        {pass.sessionsRemaining} alkalom maradt a(z) {pass.sessionsTotal}-ből
      </Muted>

      <View style={{ marginTop: spacing.md }}>
        <Row
          label="Érvényes"
          value={new Date(pass.validUntil).toLocaleDateString('hu-HU')}
        />
        <Row label="Kód" value={pass.code} />
      </View>
    </Card>
  )
}

function PassTemplateCard({ pass }: { pass: PassTemplate }) {
  return (
    <Card>
      <Text style={st.title}>{pass.title}</Text>
      {!!pass.desc && (
        <Text style={st.desc} numberOfLines={3}>
          {pass.desc}
        </Text>
      )}

      <Row label="Alkalmak" value={`${pass.sessionCount} alkalom`} />
      <Row label="Érvényesség" value={`${pass.validityDays} nap`} />
      <Row label="Ár" value={formatFt(pass.priceGross)} />

      <View style={{ marginTop: spacing.md }}>
        <Muted>
          A bérlet megvásárlása jelenleg a weboldalon lehetséges. Az appon belüli vásárlás a
          fizetési modul beépítése után lesz elérhető.
        </Muted>
      </View>
    </Card>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  desc: { color: colors.textMuted, fontSize: 15, lineHeight: 21, marginBottom: spacing.md },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  barFill: { height: '100%', backgroundColor: colors.ink },
})
