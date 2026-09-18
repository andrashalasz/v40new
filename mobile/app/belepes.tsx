import { router } from 'expo-router'
import { Image } from 'expo-image'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { ApiError } from '../src/api/client'
import { useAuth } from '../src/auth/AuthContext'
import { useI18n } from '../src/i18n'
import { colors, radius, spacing, type } from '../src/theme'
import { Button, Card, Field } from '../src/ui'
import { LanguagePicker } from '../src/ui/LanguagePicker'
import { ServerSetting } from '../src/ui/ServerSetting'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /**
   * A kiszolgáló-beállítás REJTVE van: a fejlécre hétszer koppintva jelenik meg.
   *
   * Két oka van, hogy nem látszik alapból:
   *  - egy hibakereső doboz a belépőképernyőn félkésznek mutatja az appot,
   *  - egy szabadon átállítható szerver-cím a felhasználó kezében adathalászatra
   *    is használható lenne (rá lehetne venni, hogy idegen szerverre küldje az
   *    adatait).
   */
  const [taps, setTaps] = useState(0)
  const devVisible = taps >= 7

  async function submit() {
    setBusy(true)
    setError('')
    try {
      await signIn(email.trim(), password)
      if (router.canGoBack()) router.back()
      else router.replace('/fiok')
    } catch (e) {
      const err = e instanceof ApiError ? e : null

      // A HÁLÓZATI hibát (status 0) mindig a saját üzenetével mutatjuk, nyelvtől
      // függetlenül. Enélkül egy elérhetetlen szerver "A belépés nem sikerült"
      // néven jelenne meg – ami rossz jelszóra utal, és a hibás helyen keresnénk
      // a bajt.
      if (err?.status === 0) setError(err.message)
      else setError(locale === 'hu' && err?.message ? err.message : t('signIn.failed'))
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
        <Pressable onPress={() => setTaps((n) => n + 1)} style={st.hero}>
          <Image source={require('../assets/icon.png')} style={st.logo} />
          <Text style={[type.display, st.heroTitle]}>{t('signIn.title')}</Text>
          <Text style={[type.bodyMuted, st.heroText]}>{t('signIn.subtitle')}</Text>
        </Pressable>

        <Card>
          <Field
            label={t('booking.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            placeholder="pelda@email.hu"
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
            <View style={st.errorBox}>
              <Text style={st.errorText}>{error}</Text>
            </View>
          )}

          <Button
            label={t('common.signIn')}
            onPress={() => void submit()}
            loading={busy}
            disabled={!email.trim() || !password}
          />
        </Card>

        <Text style={[type.caption, st.hint]}>{t('signIn.hint')}</Text>

        {/* A nyelv itt is átállítható: aki nem érti a felületet, ne a fiókjában
            kelljen megkeresnie a kapcsolót – oda be sem tud lépni. */}
        <View style={st.languages}>
          <LanguagePicker compact showAuto={false} />
        </View>

        {devVisible && (
          <View style={{ marginTop: spacing.lg }}>
            <ServerSetting />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  logo: { width: 66, height: 66, borderRadius: radius.md },
  heroTitle: { marginTop: spacing.md },
  heroText: { textAlign: 'center', marginTop: 6, paddingHorizontal: spacing.md },
  errorBox: {
    backgroundColor: 'rgba(179, 38, 30, 0.07)',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { ...type.body, color: colors.danger },
  hint: { textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.md },
  languages: { alignItems: 'center', marginTop: spacing.lg },
})
