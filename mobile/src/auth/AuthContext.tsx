import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, deviceInfo, setSignOutHandler } from '../api/client'
import { clearTokens, loadTokens, saveTokens } from '../api/tokens'

export type User = {
  id: number
  email: string
  role: 'ADMIN' | 'STAFF' | 'DOCTOR' | 'USER'
  firstName: string | null
  lastName: string | null
}

type LoginResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

type AuthState = {
  /** Az induló token-ellenőrzés még fut. Addig nem szabad átirányítani. */
  loading: boolean
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Ha az API-kliens bárhol kijelentkeztet (lejárt munkamenet), a felület is
  // kövesse. Enélkül a képernyő "bejelentkezve" maradna, üres adatokkal.
  useEffect(() => {
    setSignOutHandler(() => setUser(null))
    return () => setSignOutHandler(null)
  }, [])

  // Indításkor: van-e még érvényes munkamenet?
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const tokens = await loadTokens()
        if (!tokens) return
        // A /api/me hívás egyben ellenőrzi a tokent és frissíti, ha lejárt.
        const me = await api<{ profile: Omit<User, 'id' | 'role'> & { email: string } }>('/api/me')
        if (cancelled) return
        setUser({
          id: 0,
          email: me.profile.email,
          role: 'USER',
          firstName: me.profile.firstName,
          lastName: me.profile.lastName,
        })
      } catch {
        // Érvénytelen vagy lejárt munkamenet – kijelentkezett állapot.
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<LoginResponse>('/api/mobile/auth/login', {
      anonymous: true,
      body: { email, password, device: deviceInfo() },
    })
    await saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
    setUser(res.user)
  }, [])

  const signOut = useCallback(async () => {
    const tokens = await loadTokens()
    // A helyi állapotot AKKOR is töröljük, ha a szerver nem érhető el: a
    // felhasználó kijelentkezési szándéka fontosabb, mint a szinkron.
    if (tokens) {
      await api('/api/mobile/auth/logout', {
        anonymous: true,
        body: { refreshToken: tokens.refreshToken },
      }).catch(() => {})
    }
    await clearTokens()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ loading, user, signIn, signOut }),
    [loading, user, signIn, signOut],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('A useAuth csak az AuthProvider-en belül használható.')
  return ctx
}
