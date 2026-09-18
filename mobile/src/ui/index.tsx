import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { colors, radius, spacing } from '../theme'

/** Egységes elemek, hogy a képernyők ne találjanak ki mindig új stílust. */

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  loading?: boolean
}) {
  const off = disabled || loading
  const primary = variant === 'primary'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.btn,
        primary ? s.btnPrimary : s.btnSecondary,
        off && s.btnOff,
        pressed && !off && s.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.onInk : colors.ink} />
      ) : (
        <Text style={[s.btnLabel, primary ? s.btnLabelPrimary : s.btnLabelSecondary]}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected?: boolean
  onPress?: () => void
}) {
  const Wrapper = onPress ? Pressable : View
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      style={[s.chip, selected && s.chipOn]}
    >
      <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
    </Wrapper>
  )
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[s.input, !!error && s.inputError, props.style]}
      />
      {!!error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  )
}

/** Töltés, üres lista és hiba – mindhárom ugyanúgy néz ki mindenhol. */
export function Loading({ label = 'Betöltés…' }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.ink} />
      <Text style={s.muted}>{label}</Text>
    </View>
  )
}

export function Empty({ text }: { text: string }) {
  return (
    <Card>
      <Text style={s.muted}>{text}</Text>
    </Card>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <Text style={s.errorText}>{message}</Text>
      {!!onRetry && (
        <View style={{ marginTop: spacing.md }}>
          <Button label="Újrapróbálom" variant="secondary" onPress={onRetry} />
        </View>
      )}
    </Card>
  )
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={s.h1}>{children}</Text>
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={s.h2}>{children}</Text>
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={s.muted}>{children}</Text>
}

/** Címke–érték sor az összegzésekhez. */
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52, // kényelmes érintési célpont
  },
  btnPrimary: { backgroundColor: colors.ink },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink },
  btnOff: { opacity: 0.4 },
  btnPressed: { opacity: 0.85 },
  btnLabel: { fontSize: 16, fontWeight: '600' },
  btnLabelPrimary: { color: colors.onInk },
  btnLabelSecondary: { color: colors.ink },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  chip: {
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 14, color: colors.textMuted },
  chipTextOn: { color: colors.onInk, fontWeight: '600' },

  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 13, marginTop: 4 },

  center: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  errorText: { color: colors.danger, fontSize: 15, lineHeight: 22 },

  h1: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  h2: { fontSize: 19, fontWeight: '700', color: colors.text, marginBottom: 6 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLabel: { color: colors.textMuted, fontSize: 15 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
})
