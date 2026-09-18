import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import { getBaseUrl } from '../../src/api/baseUrl'
import { useI18n } from '../../src/i18n'
import { useFormat } from '../../src/i18n/format'
import { colors, radius, spacing, type } from '../../src/theme'
import { Card, Chip, Empty, ErrorBox, SkeletonCard, Tag } from '../../src/ui'

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
  picUrl: string | null
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

  const chips: Category[] = [{ value: '', label: t('common.all') }, ...(categories.data ?? [])]

  // Csontváz a pörgő karika helyett: a felhasználó látja, mi fog érkezni.
  if (services.isPending) {
    return (
      <View style={st.page}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    )
  }

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

  return (
    <FlatList
      data={services.data}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={st.page}
      refreshing={services.isFetching}
      onRefresh={() => void services.refetch()}
      showsVerticalScrollIndicator={false}
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
  const { t } = useI18n()
  const fmt = useFormat()

  // A kép a backendről jön, relatív néven (pl. "41.jpeg"). A teljes címet a
  // mindenkori kiszolgálóhoz kötjük – így a teszt- és az éles szerver is
  // működik, külön beállítás nélkül.
  const image = service.picUrl ? `${getBaseUrl()}/${service.picUrl.replace(/^\//, '')}` : null

  return (
    <Card padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${service.title} – ${t('treatments.book')}`}
        onPress={() => router.push(`/foglalas/${service.slug}`)}
        style={({ pressed }) => pressed && { opacity: 0.94 }}
      >
        {!!image && (
          <Image
            source={{ uri: image }}
            style={st.image}
            contentFit="cover"
            transition={220}
            // A márkaszín addig tölti ki a helyet, amíg a kép betölt – így nem
            // villan fehér téglalap, és nem ugrik a lista.
            placeholder={{ blurhash: 'L6B|d*00_3~q00%M4n?bIURjWBt7' }}
          />
        )}

        <View style={st.body}>
          <Text style={type.h2}>{service.title}</Text>

          {!!service.desc && (
            <Text style={[type.bodyMuted, st.desc]} numberOfLines={2}>
              {service.desc}
            </Text>
          )}

          <View style={st.tags}>
            <Tag text={`${service.time} ${t('common.minutes')}`} />
            {!!service.type && <Tag text={service.type} />}
          </View>

          <View style={st.footer}>
            <View style={{ flexShrink: 1 }}>
              <Text style={type.price}>{fmt.price(service.price)}</Text>
              <Text style={type.caption}>
                {service.vatRate ? t('treatments.vatIncluded') : t('treatments.vatExempt')}
              </Text>
            </View>

            <View style={st.cta}>
              <Text style={st.ctaText}>{t('treatments.book')}</Text>
              <Feather name="arrow-right" size={16} color={colors.onInk} />
            </View>
          </View>
        </View>
      </Pressable>
    </Card>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xxl },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  image: { width: '100%', height: 168, backgroundColor: colors.chip },
  body: { padding: spacing.lg },
  desc: { marginTop: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 48,
  },
  ctaText: { ...type.button, color: colors.onInk },
})
