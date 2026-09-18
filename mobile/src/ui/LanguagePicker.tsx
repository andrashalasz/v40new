import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LOCALE_LABELS, SUPPORTED, useI18n, type Locale } from '../i18n'
import type { LocalePreference } from '../i18n/preference'
import { colors, radius, spacing } from '../theme'

/**
 * Nyelvválasztó zászlókkal.
 *
 * Az „Automatikus" külön lehetőség, nem alapértelmezett állapot: ha valaki ezt
 * választja, az DÖNTÉS – nem kérdezünk rá újra. (Lásd i18n/preference.ts.)
 *
 * A nyelvek a SAJÁT nyelvükön szerepelnek („Deutsch", nem „Német"): aki nem
 * beszéli az éppen beállított nyelvet, csak így találja meg a sajátját.
 */
export function LanguagePicker({
  onPick,
  showAuto = true,
  compact = false,
}: {
  onPick?: (pref: LocalePreference) => void
  showAuto?: boolean
  compact?: boolean
}) {
  const { preference, setPreference, deviceLocale, t } = useI18n()

  async function choose(pref: LocalePreference) {
    await setPreference(pref)
    onPick?.(pref)
  }

  const isSelected = (pref: LocalePreference) =>
    pref === 'auto' ? preference === 'auto' : preference === pref

  return (
    <View style={compact ? s.rowWrap : undefined}>
      {SUPPORTED.map((code: Locale) => (
        <Pressable
          key={code}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected(code) }}
          accessibilityLabel={LOCALE_LABELS[code].name}
          onPress={() => void choose(code)}
          style={({ pressed }) => [
            compact ? s.chip : s.row,
            isSelected(code) && s.selected,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={compact ? s.flagSmall : s.flag}>{LOCALE_LABELS[code].flag}</Text>
          <Text style={[compact ? s.chipText : s.name, isSelected(code) && s.selectedText]}>
            {LOCALE_LABELS[code].name}
          </Text>
          {!compact && isSelected(code) && <Text style={s.check}>✓</Text>}
        </Pressable>
      ))}

      {showAuto && (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected('auto') }}
          onPress={() => void choose('auto')}
          style={({ pressed }) => [
            compact ? s.chip : s.row,
            isSelected('auto') && s.selected,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={compact ? s.flagSmall : s.flag}>⚙︎</Text>
          <View style={{ flexShrink: 1 }}>
            <Text style={[compact ? s.chipText : s.name, isSelected('auto') && s.selectedText]}>
              {t('language.auto')}
            </Text>
            {!compact && (
              <Text style={[s.hint, isSelected('auto') && s.selectedText]}>
                {LOCALE_LABELS[deviceLocale].flag} {LOCALE_LABELS[deviceLocale].name}
              </Text>
            )}
          </View>
          {!compact && isSelected('auto') && <Text style={s.check}>✓</Text>}
        </Pressable>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    minHeight: 60,
  },
  selected: { borderColor: colors.ink, backgroundColor: colors.tint, borderWidth: 2 },
  selectedText: { color: colors.ink, fontWeight: '700' },
  flag: { fontSize: 28 },
  name: { fontSize: 17, color: colors.text, fontWeight: '500' },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  check: { marginLeft: 'auto', fontSize: 18, color: colors.ink, fontWeight: '700' },

  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  flagSmall: { fontSize: 18 },
  chipText: { fontSize: 15, color: colors.text },
})
