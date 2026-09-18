import { router } from 'expo-router'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useI18n } from '../src/i18n'
import { colors, spacing } from '../src/theme'
import { LanguagePicker } from '../src/ui/LanguagePicker'

/**
 * Nyelvválasztó – első indításkor.
 *
 * Csak EGYSZER jelenik meg: amint a felhasználó választ, a döntés megmarad, és
 * innentől a fiókjában módosíthatja. Az „Automatikus" is választás, tehát az
 * sem hozza vissza ezt a képernyőt (lásd i18n/preference.ts).
 *
 * A felirat mind a három nyelven szerepel: aki ide érkezik, épp azért van itt,
 * mert nem tudjuk, melyiket érti.
 */
export default function LanguageScreen() {
  const { t } = useI18n()
  const insets = useSafeAreaInsets()

  return (
    <View style={[st.page, { paddingTop: insets.top + spacing.xl }]}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <Image
          source={require('../assets/icon.png')}
          style={st.logo}
          accessibilityLabel="V40 Vital"
        />

        <Text style={st.title}>V40 Vital</Text>

        {/* Szándékosan mindhárom nyelven, fordítás nélkül. */}
        <Text style={st.subtitle}>
          Válassz nyelvet{'\n'}Choose your language{'\n'}Sprache wählen
        </Text>

        <View style={st.picker}>
          <LanguagePicker onPick={() => router.replace('/')} />
        </View>

        <Text style={st.footer}>{t('language.changeLater')}</Text>
      </ScrollView>
    </View>
  )
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, alignItems: 'stretch' },
  logo: { width: 84, height: 84, borderRadius: 19, alignSelf: 'center' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  picker: { marginBottom: spacing.lg },
  footer: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
})
