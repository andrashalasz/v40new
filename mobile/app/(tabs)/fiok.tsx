import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import type { MeResponse } from '../../src/api/types'
import { useAuth } from '../../src/auth/AuthContext'
import { colors, formatFt, spacing } from '../../src/theme'
import { Button, Card, Empty, ErrorBox, H2, Loading, Muted, Row } from '../../src/ui'
import { SignInPrompt } from '../../src/ui/SignInPrompt'

export default function AccountScreen() {
  const { user, loading, signOut } = useAuth()
  const queryClient = useQueryClient()

  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
    enabled: !!user,
  })

  if (loading) return <Loading />
  if (!user) return <SignInPrompt text="A fiókod adataihoz, számláihoz és dokumentumaihoz lépj be." />
  if (me.isPending) return <Loading label="Fiók betöltése…" />
  if (me.isError) {
    return (
      <View style={st.page}>
        <ErrorBox message={(me.error as ApiError).message} onRetry={() => void me.refetch()} />
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
        <H2>{name || 'Fiókom'}</H2>
        <Row label="E-mail" value={profile?.email ?? '—'} />
        <Row label="Telefon" value={profile?.phone ?? '—'} />
      </Card>

      <H2>Szakvélemények</H2>
      {opinions.length === 0 ? (
        <Empty text="Még nincs szakvéleményed." />
      ) : (
        opinions.map((o) => (
          <Card key={o.id}>
            <Text style={st.itemTitle}>{o.title}</Text>
            <Muted>
              {o.documentCode} · {new Date(o.createdAt).toLocaleDateString('hu-HU')}
            </Muted>
          </Card>
        ))
      )}

      <H2>Dokumentumaim</H2>
      {documents.length === 0 ? (
        <Empty text="Még nem töltöttél fel leletet." />
      ) : (
        documents.map((d) => (
          <Card key={d.id}>
            <Text style={st.itemTitle}>{d.fileName}</Text>
            <Muted>{new Date(d.createdAt).toLocaleDateString('hu-HU')}</Muted>
          </Card>
        ))
      )}

      <H2>Számlák</H2>
      {invoices.length === 0 ? (
        <Empty text="Még nincs számlád." />
      ) : (
        invoices.map((i) => (
          <Card key={i.id}>
            <Text style={st.itemTitle}>
              {i.invoiceNumber}
              {i.isStorno ? ' (sztornó)' : ''}
            </Text>
            <Muted>
              {formatFt(i.totalGross)} ·{' '}
              {new Date(i.issuedAt ?? i.createdAt).toLocaleDateString('hu-HU')}
            </Muted>
          </Card>
        ))
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Button label="Kijelentkezés" variant="secondary" onPress={() => void handleSignOut()} />
      </View>
    </ScrollView>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  itemTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
})
