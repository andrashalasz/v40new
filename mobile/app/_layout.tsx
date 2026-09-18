import { DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
} from '@expo-google-fonts/manrope'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { router, Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { loadBaseUrl } from '../src/api/baseUrl'
import { AuthProvider } from '../src/auth/AuthContext'
import { I18nProvider, useI18n } from '../src/i18n'
import { colors, type } from '../src/theme'

// Az indítókép addig marad, amíg a betűk és a beállítások betöltenek.
void SplashScreen.preventAutoHideAsync().catch(() => {})

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

  // A weboldal betűi. Amíg töltődnek, NEM renderelünk: a rendszerbetűről a
  // márkabetűre váltás látható ugrás lenne, és pont az igényes hatást rontaná.
  const [fontsLoaded] = useFonts({
    DMSans_500Medium,
    DMSans_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
  })

  // A mentett szerver-cím betöltése. Amíg fut, NEM renderelünk semmit: ha a
  // gyerekek előbb indítanák a lekérdezéseiket, azok még a beépített (rossz)
  // címre mennének, és egy hálózati hiba villanna fel indításkor.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    loadBaseUrl().finally(() => setReady(true))
  }, [])

  // Az indítóképet csak akkor engedjük el, ha MINDEN készen áll – így a
  // felhasználó nem lát félkész, ugráló felületet.
  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync().catch(() => {})
  }, [ready, fontsLoaded])

  if (!ready || !fontsLoaded) return null

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
  const { t, preference } = useI18n()

  // Első indítás: a felhasználó még nem választott nyelvet. Egyszer
  // megkérdezzük, utána soha többé – az „Automatikus" is választásnak számít.
  //
  // A `useEffect` azért kell, mert a navigáció csak a Stack felépülése UTÁN
  // fogad irányítást; renderelés közben hívva figyelmen kívül maradna.
  useEffect(() => {
    if (preference === null) router.replace('/nyelv')
  }, [preference])

  return (
    <Stack
      screenOptions={{
        // Árnyék nélküli, a tartalommal azonos hátterű fejléc: a szürke sáv és
        // az elválasztó vonal az, ami a legtöbb appot "rendszer-alapértelmezett"
        // hatásúvá teszi.
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: type.h2.fontFamily, fontSize: 17 },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="nyelv" options={{ headerShown: false }} />
      <Stack.Screen
        name="belepes"
        options={{ title: t('signIn.title'), presentation: 'modal' }}
      />
      <Stack.Screen name="foglalas/[slug]" options={{ title: t('booking.title') }} />
    </Stack>
  )
}
