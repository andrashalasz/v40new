import * as SecureStore from 'expo-secure-store'

/**
 * A bejelentkezési tokenek tárolása.
 *
 * SecureStore = iOS Keychain / Android Keystore. NEM AsyncStorage: az sima
 * fájlban tárol, amit egy feltört (jailbreak/root) készüléken bármely másik
 * alkalmazás kiolvashat. Egészségügyi adathoz vezető tokennél ez nem opció.
 *
 * A `WHEN_UNLOCKED_THIS_DEVICE_ONLY` azt jelenti: a token nem kerül bele az
 * iCloud/Google mentésbe, tehát egy másik készülékre visszaállított biztonsági
 * mentésből nem lehet vele belépni.
 */

const ACCESS = 'v40.accessToken'
const REFRESH = 'v40.refreshToken'

const OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

export type Tokens = { accessToken: string; refreshToken: string }

export async function loadTokens(): Promise<Tokens | null> {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS, OPTS),
      SecureStore.getItemAsync(REFRESH, OPTS),
    ])
    if (!accessToken || !refreshToken) return null
    return { accessToken, refreshToken }
  } catch {
    // Sérült vagy olvashatatlan tároló: kezeljük kijelentkezett állapotként,
    // ne omoljon össze az app indulás közben.
    return null
  }
}

export async function saveTokens(t: Tokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS, t.accessToken, OPTS),
    SecureStore.setItemAsync(REFRESH, t.refreshToken, OPTS),
  ])
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS, OPTS).catch(() => {}),
    SecureStore.deleteItemAsync(REFRESH, OPTS).catch(() => {}),
  ])
}
