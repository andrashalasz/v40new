import { Tabs } from 'expo-router'
import { Text, type ColorValue } from 'react-native'
import { colors } from '../../src/theme'

/**
 * Alsó fülsáv. Az ikonok egyelőre szöveges jelek – a végleges ikonkészlet a
 * grafikai arculattal együtt kerül be, hogy ne kelljen kétszer cserélni.
 */
const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ fontSize: 20, color }}>{glyph}</Text>
  }

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.tint },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Kezelések', tabBarIcon: icon('✚') }}
      />
      <Tabs.Screen
        name="berletek"
        options={{ title: 'Bérletek', tabBarIcon: icon('◈') }}
      />
      <Tabs.Screen
        name="foglalasaim"
        options={{ title: 'Foglalásaim', tabBarIcon: icon('▤') }}
      />
      <Tabs.Screen
        name="fiok"
        options={{ title: 'Fiókom', tabBarIcon: icon('☺') }}
      />
    </Tabs>
  )
}
