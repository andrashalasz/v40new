import Anthropic from '@anthropic-ai/sdk'

/**
 * AI-fordítás Anthropic Claude-dal. Ha nincs ANTHROPIC_API_KEY, "mock" módban
 * az eredeti (magyar) szöveget adja vissza – így a folyamat kulcs nélkül is
 * végigfut, csak nem fordít. A hívó a Translation táblába menti az eredményt.
 */

let cached: Anthropic | null | undefined

function getClient(): Anthropic | null {
  if (cached !== undefined) return cached
  cached = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null
  return cached
}

export const translatorConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY)

/** A modell néha ```json ... ``` blokkba teszi – kiszedjük a nyers tömböt. */
function extractJsonArray(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced?.[1] ?? text
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  return start >= 0 && end > start ? body.slice(start, end + 1) : body
}

/**
 * Egy adag magyar szöveg lefordítása a megadott nyelvre. A visszatérő tömb
 * ugyanolyan hosszú és sorrendű, mint a bemenet. Hiba esetén dob.
 */
export async function translateBatch(texts: string[], targetLanguageName: string): Promise<string[]> {
  if (!texts.length) return []
  const client = getClient()
  if (!client) return [...texts] // mock: nincs kulcs, marad a magyar

  const system =
    `Te egy egészségügyi/longevity klinika weboldalának szakfordítója vagy. ` +
    `Fordíts magyarról ${targetLanguageName} nyelvre. Tartsd meg a jelentést, a hangnemet és a szakkifejezéseket. ` +
    `A tulajdonneveket, a márkaneveket (V40 Vital, NAD+, FotoFinder) és a számokat NE fordítsd. ` +
    `A válaszod KIZÁRÓLAG egy JSON tömb legyen a lefordított szövegekkel, pontosan ugyanannyi elemmel és ugyanabban a sorrendben, mint a bemenet – semmi más.`

  const message = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 8000,
    system,
    messages: [{ role: 'user', content: JSON.stringify(texts) }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  const raw = textBlock && 'text' in textBlock ? textBlock.text : '[]'
  const parsed = JSON.parse(extractJsonArray(raw)) as unknown

  if (!Array.isArray(parsed) || parsed.length !== texts.length) {
    throw new Error('A fordítás nem a várt alakú (eltérő hossz).')
  }
  return parsed.map((v) => String(v))
}
