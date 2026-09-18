import { router } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useT } from '../i18n'
import { spacing } from '../theme'
import { Button, Card, H2, Muted } from './index'

/**
 * Kijelentkezett állapot azokon a füleken, amelyek belépést igényelnek.
 *
 * Szándékosan NEM automatikus átirányítás a belépésre: az ilyen ugrás elveszi
 * a felhasználótól az irányítást, és kényelmetlen, ha csak körülnézne.
 */
export function SignInPrompt({ text }: { text: string }) {
  const t = useT()

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <H2>{t('signIn.required')}</H2>
        <Muted>{text}</Muted>
        <View style={{ marginTop: spacing.md }}>
          <Button label={t('common.signIn')} onPress={() => router.push('/belepes')} />
        </View>
      </Card>
    </ScrollView>
  )
}
