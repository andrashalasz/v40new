import { useQuery } from '@tanstack/react-query'
import { Link } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { api, ApiError } from '../../src/api/client'
import { colors, formatFt, radius, spacing } from '../../src/theme'
import { Card, Chip, Empty, ErrorBox, Loading, Muted } from '../../src/ui'

/**
 * Kezelések listája kategória-szűrővel – az app belépő képernyője.
 *
 * A meglévő webes API-kat használja (`/api/products`, `/api/products/types`),
 * ezért nincs külön mobil-végpont, amit karban kellene tartani.
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
  // A szűrés SZERVEROLDALON történik: a szűrőkulcs mindig a magyar
  // kategórianév, a megjelenített címke viszont a nyelv szerinti – ezt
  // kliensoldalon nem lehetne helyesen összepárosítani.
  const [filter, setFilter] = useState('')

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/api/products/types', { anonymous: true }),
  })

  const services = useQuery({
    queryKey: ['services', filter],
    queryFn: () =>
      api<Service[]>(`/api/products${filter ? `?type=${encodeURIComponent(filter)}` : ''}`, {
        anonymous: true,
      }),
  })

  if (services.isPending) return <Loading label="Kezelések betöltése…" />

  if (services.isError) {
    return (
      <View style={st.page}>
        <ErrorBox
          message={(services.error as ApiError).message}
          onRetry={() => void services.refetch()}
        />
      </View>
    )
  }

  const chips: Category[] = [{ value: '', label: 'Minden' }, ...(categories.data ?? [])]

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
      ListEmptyComponent={<Empty text="Ebben a kategóriában jelenleg nincs foglalható kezelés." />}
      renderItem={({ item }) => <ServiceCard service={item} />}
    />
  )
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <Card>
      <Text style={st.title}>{service.title}</Text>
      {!!service.desc && (
        <Text style={st.desc} numberOfLines={3}>
          {service.desc}
        </Text>
      )}

      <View style={st.tags}>
        <Tag text={`${service.time} perc`} />
        {!!service.type && <Tag text={service.type} />}
      </View>

      <View style={st.footer}>
        <View style={{ flexShrink: 1 }}>
          <Text style={st.price}>{formatFt(service.price)}</Text>
          <Muted>
            {service.vatRate ? 'bruttó, 27% áfa' : 'áfamentes egészségügyi szolgáltatás'}
          </Muted>
        </View>

        <Link href={`/foglalas/${service.slug}`} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Időpontot választok – ${service.title}`}
            style={({ pressed }) => [st.cta, pressed && { opacity: 0.85 }]}
          >
            <Text style={st.ctaText}>Időpontot választok</Text>
          </Pressable>
        </Link>
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
