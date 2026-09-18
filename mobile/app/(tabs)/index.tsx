import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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
        // VÍZSZINTESEN görgethető sor, nem tördelt rács. Tizenöt kategória
        // tördelve a képernyő felét elvitte, mielőtt egyetlen kezelés is
        // látszott volna – telefonon ez használhatatlan.
        //
        // A negatív margó + belső térköz azért kell, hogy a sor a kártyák
        // széléig fusson (így látszik, hogy van még oldalra), de az első és az
        // utolsó elem mégis a szokásos margóban álljon.
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.chipsRow}
          contentContainerStyle={st.chipsContent}
        >
          {chips.map((c) => (
            <Chip
              key={c.value || 'all'}
              label={c.label}
              selected={c.value === filter}
              onPress={() => setFilter(c.value)}
            />
          ))}
        </ScrollView>
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

          {/* Az ár és a gomb EGYMÁS ALATT, nem egymás mellett.
              Telefonon a kettő egy sorban nem fért el: az áfa-magyarázat három
              sorba tört, és a gombhoz préselődött. Egymás alatt mindkettő
              olvasható, a gomb pedig teljes szélességű érintési célpont. */}
          <View style={st.footer}>
            <Text style={type.price}>
              {service.price > 0 ? fmt.price(service.price) : t('treatments.priceOnRequest')}
            </Text>
            {service.price > 0 && (
              <Text style={type.caption}>
                {service.vatRate ? t('treatments.vatIncluded') : t('treatments.vatExempt')}
              </Text>
            )}
          </View>

          <View style={st.cta}>
            <Text style={st.ctaText}>{t('treatments.book')}</Text>
            <Feather name="arrow-right" size={16} color={colors.onInk} />
          </View>
        </View>
      </Pressable>
    </Card>
  )
}

const st = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xxl },
  chipsRow: { marginHorizontal: -spacing.md, marginBottom: spacing.md },
  chipsContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  image: { width: '100%', height: 168, backgroundColor: colors.chip },
  body: { padding: spacing.lg },
  desc: { marginTop: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  footer: { marginTop: spacing.lg },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    minHeight: 50,
    marginTop: spacing.md,
  },
  ctaText: { ...type.button, color: colors.onInk },
})
