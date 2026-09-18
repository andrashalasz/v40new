import { randomBytes } from 'node:crypto'
import Stripe from 'stripe'

/**
 * Fizetési absztrakció.
 *
 * Egyetlen szabály: NYERS kártyaadat SOHA nem érinti a szerverünket. A kártya
 * mindig a szolgáltató (Stripe) oldalán, tokenizálva keletkezik; nálunk csak
 * hivatkozások maradnak (customerRef, setupIntentId, paymentMethodId) plusz a
 * megjeleníthető törzsadat (márka, utolsó 4 számjegy).
 *
 * Két provider:
 *  - MockPaymentProvider: kulcsok nélkül is végigvihető a folyamat (fejlesztés,
 *    teszt). Minden művelet "sikerül", hamis azonosítókat ad vissza.
 *  - StripePaymentProvider: valódi Stripe, ha a STRIPE_SECRET_KEY be van állítva.
 */

// ------------------------------- típusok ------------------------------------

export type ProviderKind = 'STRIPE' | 'MOCK'

export interface GuaranteeSetup {
  provider: ProviderKind
  mock: boolean
  setupIntentId: string
  clientSecret: string
  customerRef: string | null
  publishableKey: string | null
}

export interface GuaranteeState {
  status: 'PENDING' | 'ACTIVE' | 'FAILED'
  paymentMethodId: string | null
  cardBrand: string | null
  cardLast4: string | null
}

export interface ChargeResult {
  status: 'SUCCEEDED' | 'FAILED'
  providerPaymentId: string
  failReason: string | null
}

export interface CheckoutSetup {
  provider: ProviderKind
  mock: boolean
  paymentIntentId: string
  clientSecret: string
  publishableKey: string | null
}

export interface PaymentState {
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
}

export interface WebhookEvent {
  id: string
  type: string
  data: Record<string, unknown>
  signatureOk: boolean
}

export interface PaymentProvider {
  readonly kind: ProviderKind
  readonly mock: boolean
  readonly publishableKey: string | null

  /** SetupIntent létrehozása kártya-biztosíték begyűjtéséhez (off_session terhelhető). */
  createGuaranteeSetup(opts: {
    email: string | null
    name?: string | null
    metadata: Record<string, string>
  }): Promise<GuaranteeSetup>

  /** A SetupIntent aktuális állapota + a hozzá mentett kártya törzsadatai. */
  getGuaranteeState(setupIntentId: string): Promise<GuaranteeState>

  /** A már mentett kártya megterhelése (pl. no-show díj). */
  chargeGuarantee(opts: {
    customerRef: string | null
    paymentMethodId: string
    amountMinor: number
    currency: string
    metadata: Record<string, string>
  }): Promise<ChargeResult>

  /** Azonnali fizetés indítása (PaymentIntent). A Payment Element wallet-eket
   *  (Apple Pay / Google Pay) is felkínál, ha a böngésző/eszköz támogatja. */
  createCheckout(opts: {
    email: string | null
    name?: string | null
    amountMinor: number
    currency: string
    metadata: Record<string, string>
  }): Promise<CheckoutSetup>

  /** Egy fizetés aktuális állapota. */
  getPaymentState(paymentIntentId: string): Promise<PaymentState>

  /** Egy korábbi fizetés (rész)visszatérítése. amountMinor nélkül teljes. */
  refundPayment(opts: { providerPaymentId: string; amountMinor?: number }): Promise<ChargeResult>

  /** Webhook aláírás-ellenőrzés + esemény kibontása. */
  verifyWebhook(rawBody: string, signature: string | null): WebhookEvent | null
}

// ------------------------------- segédek ------------------------------------

function rnd(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('hex')}`
}

// ------------------------------ Mock provider -------------------------------

export class MockPaymentProvider implements PaymentProvider {
  readonly kind = 'MOCK' as const
  readonly mock = true
  readonly publishableKey = null

  async createGuaranteeSetup(): Promise<GuaranteeSetup> {
    const setupIntentId = rnd('seti_mock')
    return {
      provider: 'MOCK',
      mock: true,
      setupIntentId,
      clientSecret: `${setupIntentId}_secret_${randomBytes(8).toString('hex')}`,
      customerRef: rnd('cus_mock'),
      publishableKey: null,
    }
  }

  async getGuaranteeState(): Promise<GuaranteeState> {
    // Mockban a kártya "azonnal" el van mentve.
    return {
      status: 'ACTIVE',
      paymentMethodId: rnd('pm_mock'),
      cardBrand: 'visa',
      cardLast4: '4242',
    }
  }

  async chargeGuarantee(): Promise<ChargeResult> {
    return { status: 'SUCCEEDED', providerPaymentId: rnd('pi_mock'), failReason: null }
  }

  async createCheckout(): Promise<CheckoutSetup> {
    const paymentIntentId = rnd('pi_mock')
    return {
      provider: 'MOCK',
      mock: true,
      paymentIntentId,
      clientSecret: `${paymentIntentId}_secret_${randomBytes(8).toString('hex')}`,
      publishableKey: null,
    }
  }

  async getPaymentState(): Promise<PaymentState> {
    return { status: 'SUCCEEDED' }
  }

  async refundPayment(): Promise<ChargeResult> {
    return { status: 'SUCCEEDED', providerPaymentId: rnd('re_mock'), failReason: null }
  }

  verifyWebhook(rawBody: string): WebhookEvent | null {
    try {
      const parsed = JSON.parse(rawBody) as { id?: string; type?: string; data?: { object?: Record<string, unknown> } }
      return {
        id: parsed.id ?? rnd('evt_mock'),
        type: parsed.type ?? 'mock.event',
        data: parsed.data?.object ?? {},
        signatureOk: true, // mockban nincs aláírás-ellenőrzés
      }
    } catch {
      return null
    }
  }
}

// ------------------------------ Stripe provider -----------------------------

export class StripePaymentProvider implements PaymentProvider {
  readonly kind = 'STRIPE' as const
  readonly mock = false
  readonly publishableKey: string | null

  private stripe: Stripe
  private webhookSecret: string | null

  constructor(secretKey: string, publishableKey: string | null, webhookSecret: string | null) {
    // apiVersion szándékosan nem kötött: a telepített SDK alapértelmezettjét
    // használjuk, így SDK-frissítéskor nem törik el a típusellenőrzés.
    this.stripe = new Stripe(secretKey)
    this.publishableKey = publishableKey
    this.webhookSecret = webhookSecret
  }

  async createGuaranteeSetup(opts: {
    email: string | null
    name?: string | null
    metadata: Record<string, string>
  }): Promise<GuaranteeSetup> {
    const customer = await this.stripe.customers.create({
      email: opts.email ?? undefined,
      name: opts.name ?? undefined,
      metadata: opts.metadata,
    })

    const setupIntent = await this.stripe.setupIntents.create({
      customer: customer.id,
      usage: 'off_session', // később, ügyfél jelenléte nélkül is terhelhető
      metadata: opts.metadata,
    })

    return {
      provider: 'STRIPE',
      mock: false,
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret ?? '',
      customerRef: customer.id,
      publishableKey: this.publishableKey,
    }
  }

  async getGuaranteeState(setupIntentId: string): Promise<GuaranteeState> {
    const si = await this.stripe.setupIntents.retrieve(setupIntentId, {
      expand: ['payment_method'],
    })

    if (si.status !== 'succeeded' || !si.payment_method) {
      return {
        status: si.status === 'canceled' ? 'FAILED' : 'PENDING',
        paymentMethodId: null,
        cardBrand: null,
        cardLast4: null,
      }
    }

    const pm = typeof si.payment_method === 'string'
      ? await this.stripe.paymentMethods.retrieve(si.payment_method)
      : si.payment_method

    return {
      status: 'ACTIVE',
      paymentMethodId: pm.id,
      cardBrand: pm.card?.brand ?? null,
      cardLast4: pm.card?.last4 ?? null,
    }
  }

  async chargeGuarantee(opts: {
    customerRef: string | null
    paymentMethodId: string
    amountMinor: number
    currency: string
    metadata: Record<string, string>
  }): Promise<ChargeResult> {
    try {
      const pi = await this.stripe.paymentIntents.create({
        amount: opts.amountMinor,
        currency: opts.currency.toLowerCase(),
        customer: opts.customerRef ?? undefined,
        payment_method: opts.paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: opts.metadata,
      })
      return {
        status: pi.status === 'succeeded' ? 'SUCCEEDED' : 'FAILED',
        providerPaymentId: pi.id,
        failReason: pi.status === 'succeeded' ? null : pi.status,
      }
    } catch (err) {
      const e = err as Stripe.errors.StripeError
      return {
        status: 'FAILED',
        providerPaymentId: e.payment_intent?.id ?? rnd('pi_failed'),
        failReason: e.message ?? 'charge_failed',
      }
    }
  }

  async createCheckout(opts: {
    email: string | null
    name?: string | null
    amountMinor: number
    currency: string
    metadata: Record<string, string>
  }): Promise<CheckoutSetup> {
    const pi = await this.stripe.paymentIntents.create({
      amount: opts.amountMinor,
      currency: opts.currency.toLowerCase(),
      // Kártya + wallet-ek (Apple Pay / Google Pay) automatikusan, a Payment
      // Element ezek közül ajánlja fel az eszközön elérhetőket.
      automatic_payment_methods: { enabled: true },
      receipt_email: opts.email ?? undefined,
      metadata: opts.metadata,
    })
    return {
      provider: 'STRIPE',
      mock: false,
      paymentIntentId: pi.id,
      clientSecret: pi.client_secret ?? '',
      publishableKey: this.publishableKey,
    }
  }

  async getPaymentState(paymentIntentId: string): Promise<PaymentState> {
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId)
    if (pi.status === 'succeeded') return { status: 'SUCCEEDED' }
    if (pi.status === 'canceled') return { status: 'FAILED' }
    return { status: 'PENDING' }
  }

  async refundPayment(opts: { providerPaymentId: string; amountMinor?: number }): Promise<ChargeResult> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: opts.providerPaymentId,
        amount: opts.amountMinor,
      })
      return {
        status: refund.status === 'succeeded' || refund.status === 'pending' ? 'SUCCEEDED' : 'FAILED',
        providerPaymentId: refund.id,
        failReason: refund.failure_reason ?? null,
      }
    } catch (err) {
      const e = err as Stripe.errors.StripeError
      return { status: 'FAILED', providerPaymentId: rnd('re_failed'), failReason: e.message ?? 'refund_failed' }
    }
  }

  verifyWebhook(rawBody: string, signature: string | null): WebhookEvent | null {
    if (!this.webhookSecret || !signature) return null
    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret)
      return {
        id: event.id,
        type: event.type,
        data: (event.data.object as unknown as Record<string, unknown>) ?? {},
        signatureOk: true,
      }
    } catch {
      return null
    }
  }
}

// ------------------------------- selector -----------------------------------

let cached: PaymentProvider | null = null

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached
  const secret = process.env.STRIPE_SECRET_KEY
  if (secret) {
    cached = new StripePaymentProvider(
      secret,
      process.env.STRIPE_PUBLISHABLE_KEY ?? null,
      process.env.STRIPE_WEBHOOK_SECRET ?? null,
    )
  } else {
    cached = new MockPaymentProvider()
  }
  return cached
}
