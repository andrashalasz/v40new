import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { loadBaseUrl } from '../src/api/baseUrl'
import { AuthProvider } from '../src/auth/AuthContext'
import { I18nProvider, useI18n } from '../src/i18n'
import { colors } from '../src/theme'

/**
 * Az alkalmazás gyökere: itt élnek a globális szolgáltatók.
 *
 * A QueryClient `useState`-ben jön létre, nem modulszintű konstansként: a
 * fejlesztői gyorstöltés (Fast Refresh) modulszinten újrafuttatná a fájlt, és
 * minden mentésnél elveszne a gyorsítótár.
 */
export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Mobilhálózaton a felesleges újratöltés adatforgalom és akku.
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  )

  // A mentett szerver-cím betöltése. Amíg fut, NEM renderelünk semmit: ha a
  // gyerekek előbb indítanák a lekérdezéseiket, azok még a beépített (rossz)
  // címre mennének, és egy hálózati hiba villanna fel indításkor.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    loadBaseUrl().finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <Navigation />
          </SafeAreaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/**
 * A navigáció külön komponens, mert a képernyők CÍME fordítandó – ahhoz pedig
 * az I18nProvider-en BELÜL kell lennie.
 */
function Navigation() {
  const { t } = useI18n()

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.tint },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="belepes"
        options={{ title: t('signIn.title'), presentation: 'modal' }}
      />
      <Stack.Screen name="foglalas/[slug]" options={{ title: t('booking.title') }} />
    </Stack>
  )
}
