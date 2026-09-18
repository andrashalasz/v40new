import { router } from 'expo-router'
import { ScrollView } from 'react-native'
import { spacing } from '../theme'
import { Button, Card, H2, Muted } from './index'

/**
 * Kijelentkezett állapot azokon a füleken, amelyek belépést igényelnek.
 *
 * Szándékosan NEM automatikus átirányítás a belépésre: az ilyen ugrás elveszi
 * a felhasználótól az irányítást, és kényelmetlen, ha csak körülnézne.
 */
export function SignInPrompt({ text }: { text: string }) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <H2>Ehhez belépés kell</H2>
        <Muted>{text}</Muted>
        <Button label="Belépés" onPress={() => router.push('/belepes')} />
      </Card>
    </ScrollView>
  )
}
