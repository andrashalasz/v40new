import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import { useI18n } from '../../src/i18n'
import { useFormat } from '../../src/i18n/format'
import { colors, radius, spacing } from '../../src/theme'
import { Card, Chip, Empty, ErrorBox, Loading, Muted } from '../../src/ui'

/**
 * Kezelések listája kategória-szűrővel – az app belépő képernyője.
 *
 * A meglévő webes API-kat használja (`/api/products`, `/api/products/types`),
 * ezért nincs külön mobil-végpont, amit karban kellene tartani. A nyelvet az
 * API-kliens teszi rá minden lekérdezésre.
 */

type Service = {
  id: number
  slug: string
  title: string
  desc: string
  type: string | null
  price: number
  time: number
  vatRate: number
}

type Category = { value: string; label: string }

export default function TreatmentsScreen() {
  const { locale, t } = useI18n()

  // A szűrés SZERVEROLDALON történik: a szűrőkulcs mindig a magyar
  // kategórianév, a megjelenített címke viszont a nyelv szerinti – ezt
  // kliensoldalon nem lehetne helyesen összepárosítani.
  const [filter, setFilter] = useState('')

  const categories = useQuery({
    queryKey: ['categories', locale],
    queryFn: () => api<Category[]>('/api/products/types', { anonymous: true }),
  })

  const services = useQuery({
    queryKey: ['services', filter, locale],
    queryFn: () =>
      api<Service[]>(`/api/products${filter ? `?type=${encodeURIComponent(filter)}` : ''}`, {
        anonymous: true,
      }),
  })

  if (services.isPending) return <Loading label={t('treatments.loading')} />

  if (services.isError) {
    return (
      <View style={st.page}>
        <ErrorBox
          message={(services.error as ApiError).message}
          retryLabel={t('common.retry')}
          onRetry={() => void services.refetch()}
        />
      </View>
    )
  }

  const chips: Category[] = [{ value: '', label: t('common.all') }, ...(categories.data ?? [])]

  return (
    <FlatList
      data={services.data}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={st.page}
      refreshing={services.isFetching}
      onRefresh={() => void services.refetch()}
      ListHeaderComponent={
        <View style={st.chips}>
          {chips.map((c) => (
            <Chip
              key={c.value || 'all'}
              label={c.label}
              selected={c.value === filter}
              onPress={() => setFilter(c.value)}
            />
          ))}
        </View>
      }
      ListEmptyComponent={<Empty text={t('treatments.empty')} />}
      renderItem={({ item }) => <ServiceCard service={item} />}
    />
  )
}

function ServiceCard({ service }: { service: Service }) {
  const t = useI18n().t
  const fmt = useFormat()

  return (
    <Card>
      <Text style={st.title}>{service.title}</Text>
      {!!service.desc && (
        <Text style={st.desc} numberOfLines={3}>
          {service.desc}
        </Text>
      )}

      <View style={st.tags}>
        <Tag text={`${service.time} ${t('common.minutes')}`} />
        {!!service.type && <Tag text={service.type} />}
      </View>

      <View style={st.footer}>
        <View style={{ flexShrink: 1 }}>
          <Text style={st.price}>{fmt.price(service.price)}</Text>
          <Muted>
            {service.vatRate ? t('treatments.vatIncluded') : t('treatments.vatExempt')}
          </Muted>
        </View>

        {/* SZÁNDÉKOSAN nem <Link asChild>: az `asChild` ebben a verzióban nem
            adja tovább a gomb stílusát, ezért a gomb sima szürke linkszövegként
            jelent meg – háttér nélkül, alig láthatóan. A közvetlen navigáció
            kiszámítható, és a gomb úgy néz ki, ahogy megírtuk. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('treatments.book')} – ${service.title}`}
          onPress={() => router.push(`/foglalas/${service.slug}`)}
          style={({ pressed }) => [st.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={st.ctaText}>{t('treatments.book')}</Text>
        </Pressable>
      </View>
    </Card>
  )
}

function Tag({ text }: { text: string }) {
  return (
    <View style={st.tag}>
      <Text style={st.tagText}>{text}</Text>
    </View>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 19, fontWeight: '700', color: colors.text, marginBottom: 6 },
  desc: { color: colors.textMuted, fontSize: 15, lineHeight: 21, marginBottom: spacing.md },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tag: {
    backgroundColor: colors.chip,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagText: { fontSize: 13, color: colors.ink },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  price: { fontSize: 24, fontWeight: '700', color: colors.text },
  cta: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  ctaText: { color: colors.onInk, fontWeight: '600', fontSize: 15 },
})
