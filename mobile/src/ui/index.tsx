import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { colors, elevation, radius, spacing, type } from '../theme'

/**
 * Az alkalmazás elemkészlete.
 *
 * Minden képernyő EBBŐL építkezik. Ha egy képernyő saját színt vagy méretet
 * talál ki, az felületenként más ritmust ad – ez az, amitől egy app
 * összedobottnak hat, még ha minden elem külön-külön rendben is van.
 */

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth = true,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'quiet'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
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
        fullWidth && { alignSelf: 'stretch' },
        primary && s.btnPrimary,
        variant === 'secondary' && s.btnSecondary,
        variant === 'quiet' && s.btnQuiet,
        off && s.btnOff,
        pressed && !off && s.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.onInk : colors.ink} />
      ) : (
        <Text style={[type.button, primary ? s.btnLabelPrimary : s.btnLabelSecondary]}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** Kikapcsolható, ha a kártya teljes szélességű képet tartalmaz. */
  padded?: boolean
}) {
  return <View style={[s.card, padded && s.cardPadded, style]}>{children}</View>
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

/** Kis jelölő a kártyákon (időtartam, kategória). */
export function Tag({ text }: { text: string }) {
  return (
    <View style={s.tag}>
      <Text style={s.tagText}>{text}</Text>
    </View>
  )
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[type.label, { marginBottom: 7 }]}>{label}</Text>
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

/**
 * Töltés, üres lista és hiba – mindhárom ugyanúgy néz ki mindenhol.
 *
 * A szöveget a hívó adja át: így ugyanaz a doboz szolgál minden képernyőn, és
 * nem kell hozzá képernyőnként külön változat.
 */
export function Loading({ label }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.ink} />
      {!!label && <Text style={[type.caption, { marginTop: spacing.sm }]}>{label}</Text>}
    </View>
  )
}

/**
 * Csontváz-töltés a listákhoz.
 *
 * A pörgő karika azt üzeni, hogy „várj"; a csontváz azt, hogy „mindjárt itt
 * van, és így fog kinézni". Ugyanannyi idő, nyugodtabb élmény.
 */
export function SkeletonCard() {
  return (
    <Card>
      <View style={[s.skel, { width: '62%', height: 20 }]} />
      <View style={[s.skel, { width: '92%', height: 13, marginTop: spacing.md }]} />
      <View style={[s.skel, { width: '78%', height: 13, marginTop: 8 }]} />
      <View style={s.skelRow}>
        <View style={[s.skel, { width: 88, height: 30, borderRadius: radius.pill }]} />
        <View style={[s.skel, { width: 128, height: 48, borderRadius: radius.md }]} />
      </View>
    </Card>
  )
}

export function Empty({ text }: { text: string }) {
  return (
    <Card>
      <Text style={type.bodyMuted}>{text}</Text>
    </Card>
  )
}

export function ErrorBox({
  message,
  onRetry,
  retryLabel,
}: {
  message: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <Card>
      <Text style={s.errorText}>{message}</Text>
      {!!onRetry && !!retryLabel && (
        <View style={{ marginTop: spacing.md }}>
          <Button label={retryLabel} variant="secondary" onPress={onRetry} />
        </View>
      )}
    </Card>
  )
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={[type.h1, { marginBottom: spacing.sm }]}>{children}</Text>
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={[type.h2, { marginBottom: 6 }]}>{children}</Text>
}

/** Szakaszcím a listák fölött – nagyobb levegővel, mint a kártyán belüli cím. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text style={[type.h2, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>{children}</Text>
  )
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={type.bodyMuted}>{children}</Text>
}

/** Címke–érték sor az összegzésekhez. */
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={[type.caption, { flexShrink: 0 }]}>{label}</Text>
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
    minHeight: 54, // kényelmes érintési célpont
  },
  btnPrimary: { backgroundColor: colors.ink },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink },
  btnQuiet: { backgroundColor: colors.chip },
  btnOff: { opacity: 0.35 },
  btnPressed: { opacity: 0.86, transform: [{ scale: 0.995 }] },
  btnLabelPrimary: { color: colors.onInk },
  btnLabelSecondary: { color: colors.ink },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...(elevation.card as object),
  },
  cardPadded: { padding: spacing.lg },

  chip: {
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...type.caption, color: colors.textMuted },
  chipTextOn: { color: colors.onInk, fontFamily: type.label.fontFamily },

  tag: {
    backgroundColor: colors.chip,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { ...type.caption, color: colors.ink },

  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    backgroundColor: colors.surface,
    ...type.body,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { ...type.caption, color: colors.danger, marginTop: 5 },

  center: { padding: spacing.xl, alignItems: 'center' },
  errorText: { ...type.body, color: colors.danger },

  skel: { backgroundColor: colors.chip, borderRadius: radius.sm },
  skelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: spacing.md,
  },
  rowValue: {
    ...type.body,
    fontFamily: type.label.fontFamily,
    flexShrink: 1,
    textAlign: 'right',
  },
})
