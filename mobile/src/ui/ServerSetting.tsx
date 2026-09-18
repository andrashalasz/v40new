import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { DEFAULT_BASE_URL, getBaseUrl, isValidBaseUrl, setBaseUrl } from '../api/baseUrl'
import { colors, spacing } from '../theme'
import { Button, Card, Field, H2, Muted } from './index'

/**
 * A backend címének átírása a készüléken – TESZTELÉSHEZ.
 *
 * Miért kell: helyi (Docker) kiszolgálónál a gép LAN-címe DHCP-vel változhat,
 * és a beégetett cím miatt minden változásnál új TestFlight build kellene –
 * ami 20-30 perc. Így elég beírni az új címet.
 *
 * Éles kiadás előtt ez a doboz elrejtendő vagy eltávolítandó: egy átállítható
 * szerver-cím a felhasználó kezében adathalászatra is használható lenne
 * (valaki ráveheti, hogy idegen szerverre küldje az adatait).
 */
export function ServerSetting() {
  const [value, setValue] = useState(getBaseUrl())
  const [saved, setSaved] = useState(false)
  const queryClient = useQueryClient()

  const valid = isValidBaseUrl(value)

  async function save() {
    if (!valid) return
    const applied = await setBaseUrl(value)
    setValue(applied)
    setSaved(true)
    // A gyorsítótár ürítése nélkül a régi szerverről kapott adat maradna a
    // képernyőn, miközben már a másikhoz beszélünk.
    queryClient.clear()
  }

  return (
    <Card>
      <H2>Kiszolgáló (teszt)</H2>
      <Muted>
        Csak tesztelés közben van rá szükség. Üresen hagyva a beépített cím
        érvényes: {DEFAULT_BASE_URL}
      </Muted>

      <View style={{ marginTop: spacing.md }}>
        <Field
          label="Cím"
          value={value}
          onChangeText={(v) => {
            setValue(v)
            setSaved(false)
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="http://10.0.0.5:3001"
          error={valid ? undefined : 'Érvénytelen cím – http:// vagy https:// kell az elejére.'}
        />
        <Button label="Mentés" onPress={() => void save()} disabled={!valid} />
        {saved && (
          <View style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.success }}>Mentve. Jelentkezz be újra.</Text>
          </View>
        )}
      </View>
    </Card>
  )
}
