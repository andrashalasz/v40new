import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import type { MeResponse } from '../../src/api/types'
import { useAuth } from '../../src/auth/AuthContext'
import { useI18n } from '../../src/i18n'
import { useFormat } from '../../src/i18n/format'
import { colors, spacing } from '../../src/theme'
import { Button, Card, Empty, ErrorBox, H2, Loading, Muted, Row } from '../../src/ui'
import { SignInPrompt } from '../../src/ui/SignInPrompt'

export default function AccountScreen() {
  const { user, loading, signOut } = useAuth()
  const { locale, t } = useI18n()
  const fmt = useFormat()
  const queryClient = useQueryClient()

  const me = useQuery({
    queryKey: ['me', locale],
    queryFn: () => api<MeResponse>('/api/me'),
    enabled: !!user,
  })

  if (loading) return <Loading />
  if (!user) return <SignInPrompt text={t('signIn.requiredAccount')} />
  if (me.isPending) return <Loading label={t('account.loading')} />
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

  const { profile, invoices, opinions, documents } = me.data
  const name = [profile?.lastName, profile?.firstName].filter(Boolean).join(' ')

  async function handleSignOut() {
    await signOut()
    // A gyorsítótár ürítése nélkül a következő belépő felhasználó egy
    // pillanatra az előző adatait látná.
    queryClient.clear()
  }

  return (
    <ScrollView
      contentContainerStyle={st.page}
      refreshControl={
        <RefreshControl refreshing={me.isFetching} onRefresh={() => void me.refetch()} />
      }
    >
      <Card>
        <H2>{name || t('account.title')}</H2>
        <Row label={t('account.email')} value={profile?.email ?? '—'} />
        <Row label={t('account.phone')} value={profile?.phone ?? '—'} />
      </Card>

      <H2>{t('account.opinions')}</H2>
      {opinions.length === 0 ? (
        <Empty text={t('account.noOpinions')} />
      ) : (
        opinions.map((o) => (
          <Card key={o.id}>
            <Text style={st.itemTitle}>{o.title}</Text>
            <Muted>
              {o.documentCode} · {fmt.date(o.createdAt)}
            </Muted>
          </Card>
        ))
      )}

      <H2>{t('account.documents')}</H2>
      {documents.length === 0 ? (
        <Empty text={t('account.noDocuments')} />
      ) : (
        documents.map((d) => (
          <Card key={d.id}>
            <Text style={st.itemTitle}>{d.fileName}</Text>
            <Muted>{fmt.date(d.createdAt)}</Muted>
          </Card>
        ))
      )}

      <H2>{t('account.invoices')}</H2>
      {invoices.length === 0 ? (
        <Empty text={t('account.noInvoices')} />
      ) : (
        invoices.map((i) => (
          <Card key={i.id}>
            <Text style={st.itemTitle}>
              {i.invoiceNumber}
              {i.isStorno ? ` ${t('account.storno')}` : ''}
            </Text>
            <Muted>
              {fmt.price(i.totalGross)} · {fmt.date(i.issuedAt ?? i.createdAt)}
            </Muted>
          </Card>
        ))
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Button
          label={t('common.signOut')}
          variant="secondary"
          onPress={() => void handleSignOut()}
        />
      </View>
    </ScrollView>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  itemTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
})
