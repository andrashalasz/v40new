import { router } from 'expo-router'
import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ApiError } from '../src/api/client'
import { useAuth } from '../src/auth/AuthContext'
import { colors, spacing } from '../src/theme'
import { Button, Card, Field, H1, Muted } from '../src/ui'

export default function LoginScreen() {
  const { signIn } = useAuth()
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
      setError(e instanceof ApiError ? e.message : 'A belépés nem sikerült.')
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
        <H1>Belépés</H1>
        <Muted>A foglalásaid, bérleteid és dokumentumaid egy helyen.</Muted>

        <Card style={{ marginTop: spacing.lg }}>
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
          />
          <Field
            label="Jelszó"
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
            label="Belépés"
            onPress={() => void submit()}
            loading={busy}
            disabled={!email.trim() || !password}
          />
        </Card>

        <Muted>
          Ha foglaltál már nálunk, a fiókod automatikusan létrejött. Jelszó nélkül e-mailes belépő
          linket is kérhetsz a weboldalon.
        </Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  error: { color: colors.danger, fontSize: 15, lineHeight: 21 },
})
