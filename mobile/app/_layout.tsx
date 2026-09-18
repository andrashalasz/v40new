import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '../src/auth/AuthContext'
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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
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
              options={{ title: 'Belépés', presentation: 'modal' }}
            />
            <Stack.Screen name="foglalas/[slug]" options={{ title: 'Időpontfoglalás' }} />
          </Stack>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
