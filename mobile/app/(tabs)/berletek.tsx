import { useQuery } from '@tanstack/react-query'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import type { CustomerPass, MeResponse, PassTemplate } from '../../src/api/types'
import { useAuth } from '../../src/auth/AuthContext'
import { useI18n, useT } from '../../src/i18n'
import { useFormat } from '../../src/i18n/format'
import { colors, radius, spacing } from '../../src/theme'
import { Card, Empty, ErrorBox, H2, Loading, Muted, Row } from '../../src/ui'

/**
 * Bérletek: a saját, érvényes bérletek felül, alattuk a megvásárolható
 * csomagok.
 *
 * A vásárlás MÉG NEM innen indul – lásd a képernyő alján lévő megjegyzést.
 */
export default function PassesScreen() {
  const { user } = useAuth()
  const { locale, t } = useI18n()

  const catalog = useQuery({
    queryKey: ['passTemplates', locale],
    queryFn: () => api<PassTemplate[]>('/api/passes', { anonymous: true }),
  })

  const me = useQuery({
    queryKey: ['me', locale],
    queryFn: () => api<MeResponse>('/api/me'),
    enabled: !!user,
  })

  if (catalog.isPending) return <Loading label={t('passes.loading')} />
  if (catalog.isError) {
    return (
      <View style={st.page}>
        <ErrorBox
          message={(catalog.error as ApiError).message}
          retryLabel={t('common.retry')}
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
              <H2>{t('passes.mine')}</H2>
              {myPasses.length === 0 ? (
                <Empty text={t('passes.noneMine')} />
              ) : (
                myPasses.map((p) => <MyPassCard key={p.code} pass={p} />)
              )}
            </View>
          )}
          <H2>{t('passes.available')}</H2>
        </View>
      }
      ListEmptyComponent={<Empty text={t('passes.noneAvailable')} />}
      renderItem={({ item }) => <PassTemplateCard pass={item} />}
    />
  )
}

function MyPassCard({ pass }: { pass: CustomerPass }) {
  const t = useT()
  const fmt = useFormat()

  const used = pass.sessionsTotal - pass.sessionsRemaining
  const ratio = pass.sessionsTotal > 0 ? used / pass.sessionsTotal : 0

  return (
    <Card>
      <Text style={st.title}>{pass.passTemplate.title}</Text>

      <View
        style={st.barTrack}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: pass.sessionsTotal, now: pass.sessionsRemaining }}
      >
        <View style={[st.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
      <Muted>
        {t('passes.sessionsLeft', {
          remaining: pass.sessionsRemaining,
          total: pass.sessionsTotal,
        })}
      </Muted>

      <View style={{ marginTop: spacing.md }}>
        <Row label={t('passes.validUntil')} value={fmt.date(pass.validUntil)} />
        <Row label={t('passes.code')} value={pass.code} />
      </View>
    </Card>
  )
}

function PassTemplateCard({ pass }: { pass: PassTemplate }) {
  const t = useT()
  const fmt = useFormat()

  return (
    <Card>
      <Text style={st.title}>{pass.title}</Text>
      {!!pass.desc && (
        <Text style={st.desc} numberOfLines={3}>
          {pass.desc}
        </Text>
      )}

      <Row
        label={t('passes.sessions')}
        value={t('passes.sessionsValue', { count: pass.sessionCount })}
      />
      <Row
        label={t('passes.validity')}
        value={t('passes.validityValue', { days: pass.validityDays })}
      />
      <Row label={t('passes.price')} value={fmt.price(pass.priceGross)} />

      <View style={{ marginTop: spacing.md }}>
        <Muted>{t('passes.buyOnWeb')}</Muted>
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
    backgroundColor: colors.line,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  barFill: { height: '100%', backgroundColor: colors.ink },
})
