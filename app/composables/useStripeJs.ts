/**
 * A Stripe.js egyszeri betöltése és egy Stripe példány létrehozása a megadott
 * publishable kulccsal. A böngészőben fut, a scriptet csak egyszer injektáljuk.
 */
export async function loadStripe(publishableKey: string): Promise<any> {
  const w = window as any
  if (!w.Stripe) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-stripe-js]') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('A Stripe nem tölthető be.')))
        return
      }
      const s = document.createElement('script')
      s.src = 'https://js.stripe.com/v3/'
      s.dataset.stripeJs = 'true'
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('A Stripe nem tölthető be.'))
      document.head.appendChild(s)
    })
  }
  return w.Stripe(publishableKey)
}
