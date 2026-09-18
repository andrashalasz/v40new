import { Feather } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { Platform, type ColorValue } from 'react-native'
import { useT } from '../../src/i18n'
import { colors, fonts } from '../../src/theme'

/**
 * Alsó fülsáv.
 *
 * Valódi vektoros ikonkészlet (Feather): a korábbi szöveges jelek (✚ ◈ ▤ ♥ ☺)
 * készülékenként más betűkészletből jöttek, eltérő súllyal és mérettel – ez
 * önmagában elárulta, hogy nem végleges a felület.
 *
 * A Feather azért illik ide, mert vékony, mértani és visszafogott: ugyanaz a
 * hangnem, mint a weboldal tipográfiájáé.
 */
const icon =
  (name: keyof typeof Feather.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Feather name={name} size={size - 2} color={color} />
  )

export default function TabsLayout() {
  const t = useT()

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 17 },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          // Androidon a sáv magasabb legyen, hogy a felirat ne préselődjön a
          // gesztussávra.
          height: Platform.OS === 'android' ? 64 : undefined,
          paddingTop: 6,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tab.treatments'), tabBarIcon: icon('plus-circle') }}
      />
      <Tabs.Screen
        name="berletek"
        options={{ title: t('tab.passes'), tabBarIcon: icon('layers') }}
      />
      <Tabs.Screen
        name="foglalasaim"
        options={{ title: t('tab.bookings'), tabBarIcon: icon('calendar') }}
      />
      <Tabs.Screen
        name="egeszseg"
        options={{ title: t('tab.health'), tabBarIcon: icon('activity') }}
      />
      <Tabs.Screen name="fiok" options={{ title: t('tab.account'), tabBarIcon: icon('user') }} />
    </Tabs>
  )
}
