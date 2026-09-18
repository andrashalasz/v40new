import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Linking, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import { useAuth } from '../../src/auth/AuthContext'
import { isAvailable, requestPermissions } from '../../src/health/read'
import { androidHealthStatus, requestAndroidPermissions } from '../../src/health/read.android'
import { setConsent, syncHealth, type SyncResult } from '../../src/health/sync'
import { colors, spacing } from '../../src/theme'
import { Button, Card, ErrorBox, H2, Loading, Muted, Row } from '../../src/ui'
import { SignInPrompt } from '../../src/ui/SignInPrompt'

/**
 * Egészségügyi adatok megosztása – a páciens oldala.
 *
 * Itt adja meg kategóriánként a hozzájárulást, és innen indul a szinkron.
 * SZÁNDÉKOSAN kézi indítású: a háttérszinkron az Apple review-n külön
 * indoklást kíván, és a tesztfázisban amúgy is fontos, hogy a felhasználó
 * lássa, mi történik és mikor.
 */

type Category = { key: string; label: string; purpose: string; metrics: { key: string; label: string }[] }

export default function HealthScreen() {
  const { user, loading } = useAuth()
  const [granted, setGranted] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState('')

  const catalog = useQuery({
    queryKey: ['healthCatalog'],
    queryFn: () => api<Category[]>('/api/mobile/health/catalog', { anonymous: true }),
  })

  // Androidon a Health Connect külön alkalmazás: Android 14 előtt a Play
  // Áruházból telepítendő. Ezt indulás után derítjük ki, hogy a felhasználót
  // oda tudjuk irányítani ahelyett, hogy egy néma hiba fogadná.
  const [android, setAndroid] = useState<'checking' | 'ready' | 'needs-update' | 'unavailable'>(
    Platform.OS === 'android' ? 'checking' : 'ready',
  )
  useEffect(() => {
    if (Platform.OS === 'android') void androidHealthStatus().then(setAndroid)
  }, [])

  if (loading) return <Loading />
  if (!user) return <SignInPrompt text="Az egészségügyi adatok megosztásához lépj be a fiókodba." />

  if (Platform.OS === 'ios' && !isAvailable()) {
    return (
      <ScrollView contentContainerStyle={st.page}>
        <Card>
          <H2>Nem érhető el</H2>
          <Muted>Ezen a készüléken nincs Apple Health.</Muted>
        </Card>
      </ScrollView>
    )
  }

  if (Platform.OS === 'android' && android !== 'ready') {
    return (
      <ScrollView contentContainerStyle={st.page}>
        <Card>
          <H2>Health Connect szükséges</H2>
          <Muted>
            {android === 'checking'
              ? 'Ellenőrzés…'
              : android === 'needs-update'
                ? 'A Health Connect frissítésre szorul. Frissítsd a Play Áruházban, majd térj vissza.'
                : 'Ehhez a Health Connect alkalmazás kell. Android 14-től a rendszer része, korábbi verziókon a Play Áruházból telepíthető. Ide gyűjti az adatokat a Samsung Health, a Google Fit, a Whoop és a Garmin is.'}
          </Muted>
          {android !== 'checking' && (
            <View style={{ marginTop: spacing.md }}>
              <Button
                label="Megnyitás a Play Áruházban"
                onPress={() =>
                  void Linking.openURL(
                    'market://details?id=com.google.android.apps.healthdata',
                  ).catch(() =>
                    Linking.openURL(
                      'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata',
                    ),
                  )
                }
              />
            </View>
          )}
        </Card>
      </ScrollView>
    )
  }

  if (catalog.isPending) return <Loading label="Betöltés…" />
  if (catalog.isError) {
    return (
      <View style={st.page}>
        <ErrorBox
          message={(catalog.error as ApiError).message}
          retryLabel="Újrapróbálom"
          onRetry={() => void catalog.refetch()}
        />
      </View>
    )
  }

  const anyGranted = Object.values(granted).some(Boolean)

  async function toggle(category: string, value: boolean) {
    setError('')
    // Először a szerverre: ha a hozzájárulás nem rögzül, a szinkron úgyis
    // visszautasítaná az adatot – jobb itt megállni, mint később hibázni.
    try {
      await setConsent(category, value)
      setGranted((g) => ({ ...g, [category]: value }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'A beállítás mentése nem sikerült.')
    }
  }

  async function run() {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      setStatus(
        Platform.OS === 'android'
          ? 'Engedély kérése a Health Connecttől…'
          : 'Engedély kérése az Apple Health-től…',
      )
      if (Platform.OS === 'android') await requestAndroidPermissions()
      else await requestPermissions()

      // Egy év: elég hosszú a trendhez és a kezelés előtti/utáni
      // összehasonlításhoz, és néhány másodperc alatt feltöltődik.
      const res = await syncHealth(365, (p) => {
        setStatus(
          p.phase === 'reading'
            ? 'Adatok beolvasása a telefonról…'
            : p.phase === 'uploading'
              ? `Feltöltés… ${Math.round(p.ratio * 100)}%`
              : 'Kész.',
        )
      })
      setResult(res)
      setStatus('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'A szinkronizálás nem sikerült.')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={st.page}>
      <Card>
        <H2>Egészségügyi adatok megosztása</H2>
        <Muted>
          Az alábbi adatokat az orvosod látja, hogy a kezelésedet a valós állapotodhoz igazítsa.
          Bármikor visszavonhatod. Az adatokat nem adjuk tovább és nem használjuk hirdetésre.
        </Muted>
      </Card>

      {catalog.data.map((c) => (
        <Card key={c.key}>
          <View style={st.head}>
            <Text style={st.title}>{c.label}</Text>
            <Switch
              value={!!granted[c.key]}
              onValueChange={(v) => void toggle(c.key, v)}
              trackColor={{ true: colors.ink }}
            />
          </View>
          <Muted>{c.purpose}</Muted>
          <View style={{ marginTop: spacing.sm }}>
            <Muted>{c.metrics.map((m) => m.label).join(' · ')}</Muted>
          </View>
        </Card>
      ))}

      <Card>
        <H2>Szinkronizálás</H2>
        <Muted>
          Az elmúlt egy év adatait töltjük fel, naponta összesítve. A nyers mérések nem hagyják
          el a telefonodat.
        </Muted>

        {!!status && (
          <View style={{ marginTop: spacing.md }}>
            <Muted>{status}</Muted>
          </View>
        )}

        {!!error && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={st.error}>{error}</Text>
          </View>
        )}

        <View style={{ marginTop: spacing.md }}>
          <Button
            label="Adatok szinkronizálása"
            onPress={() => void run()}
            loading={busy}
            disabled={!anyGranted}
          />
          {!anyGranted && (
            <View style={{ marginTop: spacing.sm }}>
              <Muted>Előbb engedélyezz legalább egy adatkört.</Muted>
            </View>
          )}
        </View>
      </Card>

      {!!result && (
        <Card>
          <H2>Eredmény</H2>
          <Row label="Beolvasott napi érték" value={String(result.read)} />
          <Row label="Feltöltve" value={String(result.written)} />
          {result.rejected > 0 && <Row label="Visszautasítva" value={String(result.rejected)} />}

          {result.emptyMetrics.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Muted>
                Ezekhez nem találtunk adatot: {result.emptyMetrics.join(', ')}. Ez általában azt
                jelenti, hogy a mérést nem rögzíti a készüléked (pl. óra nélkül nincs pulzus vagy
                alvás), vagy az Apple Health engedélykérésnél nem engedélyezted.
              </Muted>
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
  error: { color: colors.danger, fontSize: 15, lineHeight: 21 },
})
