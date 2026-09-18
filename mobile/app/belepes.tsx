import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ApiError } from '../src/api/client'
import { useAuth } from '../src/auth/AuthContext'
import { useI18n } from '../src/i18n'
import { colors, spacing } from '../src/theme'
import { Button, Card, Field, H1, Muted } from '../src/ui'
import { ServerSetting } from '../src/ui/ServerSetting'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await signIn(email.trim(), password)
      // A modálist bezárjuk; a fiók fül már bejelentkezve jelenik meg.
      if (router.canGoBack()) router.back()
      else router.replace('/fiok')
    } catch (e) {
      const err = e instanceof ApiError ? e : null

      // A HÁLÓZATI hibát (status 0) mindig a saját üzenetével mutatjuk, nyelvtől
      // függetlenül. Enélkül egy elérhetetlen szerver "A belépés nem sikerült"
      // néven jelenne meg – ami rossz jelszóra utal, és a felhasználó (vagy a
      // fejlesztő) a hibás helyen keresné a bajt. Pontosan ebbe futottunk bele
      // az emulátoron.
      if (err?.status === 0) {
        setError(err.message)
      } else {
        // A szerver hibaüzenetei egyelőre csak magyarul léteznek, ezért idegen
        // nyelven a saját, lefordított üzenetünket mutatjuk. Magyarul viszont a
        // szerveré a pontosabb (megmondja, ha pl. a fiók deaktivált).
        setError(locale === 'hu' && err?.message ? err.message : t('signIn.failed'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={st.page} keyboardShouldPersistTaps="handled">
        <H1>{t('signIn.title')}</H1>
        <Muted>{t('signIn.subtitle')}</Muted>

        <Card style={{ marginTop: spacing.lg }}>
          <Field
            label={t('booking.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
          />
          <Field
            label={t('signIn.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
          />

          {!!error && (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={st.error}>{error}</Text>
            </View>
          )}

          <Button
            label={t('common.signIn')}
            onPress={() => void submit()}
            loading={busy}
            disabled={!email.trim() || !password}
          />
        </Card>

        <Muted>{t('signIn.hint')}</Muted>

        {/* Teszt-időszakra: a kiszolgáló címe itt írható át, hogy egy változó
            LAN-cím miatt ne kelljen új buildet készíteni. */}
        <View style={{ marginTop: spacing.lg }}>
          <ServerSetting />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  error: { color: colors.danger, fontSize: 15, lineHeight: 21 },
})
