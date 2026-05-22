/**
 * lib/wardrobe/gemini.ts
 * Gemini 2.5 Flash re-ranker — picks final recommendation from top-5 candidates.
 */
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { Schema } from '@google/generative-ai'
import { z } from 'zod'
import type { AutoContext } from './context'
import type { ScoredBottle, UserPicks } from './scoring'

// ---------------------------------------------------------------------------
// Zod schema for output validation
// ---------------------------------------------------------------------------

const GeminiBottleRef = z.object({
  bottle_id: z.string(),
  reason: z.string(),
})

const GeminiOutputSchema = z.object({
  primary: GeminiBottleRef,
  alternatives: z.array(GeminiBottleRef).length(3),
  avoid_today: GeminiBottleRef,
})

export type GeminiOutput = z.infer<typeof GeminiOutputSchema>

// ---------------------------------------------------------------------------
// Gemini response schema (JSON mode) — cast to Schema to satisfy SDK types
// ---------------------------------------------------------------------------

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    primary: {
      type: SchemaType.OBJECT,
      properties: {
        bottle_id: { type: SchemaType.STRING },
        reason: { type: SchemaType.STRING },
      },
      required: ['bottle_id', 'reason'],
    },
    alternatives: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          bottle_id: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING },
        },
        required: ['bottle_id', 'reason'],
      },
    },
    avoid_today: {
      type: SchemaType.OBJECT,
      properties: {
        bottle_id: { type: SchemaType.STRING },
        reason: { type: SchemaType.STRING },
      },
      required: ['bottle_id', 'reason'],
    },
  },
  required: ['primary', 'alternatives', 'avoid_today'],
}

// ---------------------------------------------------------------------------
// Logging wrapper
// ---------------------------------------------------------------------------

function logGeminiCall(latencyMs: number, inputTokens?: number, outputTokens?: number) {
  console.log(`[wardrobe/gemini] latency=${latencyMs}ms input_tokens=${inputTokens ?? '?'} output_tokens=${outputTokens ?? '?'}`)
}

// ---------------------------------------------------------------------------
// Build prompt
// ---------------------------------------------------------------------------

function buildPrompt(top5: ScoredBottle[], context: AutoContext, userPicks: UserPicks): string {
  const conditionStr = context.weatherAvailable
    ? `${context.temp}°C, ${context.humidity}% humidity, ${context.condition}`
    : 'weather unavailable'

  const contextBlock = [
    `Weather: ${conditionStr}`,
    `Time: ${context.timeOfDay}, ${context.dayOfWeek === 0 || context.dayOfWeek === 6 ? 'weekend' : 'weekday'}`,
    `Season: ${context.season} (Indian climate)`,
    userPicks.occasion ? `Occasion: ${userPicks.occasion}` : null,
    userPicks.mood ? `Mood: ${userPicks.mood}` : null,
    userPicks.setting ? `Setting: ${userPicks.setting}` : null,
    userPicks.whoWith ? `With: ${userPicks.whoWith}` : null,
  ].filter(Boolean).join('\n  ')

  const candidateBlock = top5.map((sb, i) => {
    const b = sb.bottle
    const topNotes = (b.top_notes ?? []).slice(0, 5).join(', ')
    const heartNotes = (b.heart_notes ?? []).slice(0, 5).join(', ')
    const baseNotes = (b.base_notes ?? []).slice(0, 5).join(', ')
    const notesStr = [topNotes, heartNotes, baseNotes].filter(Boolean).join(' / ')
    const daysSince = b.last_worn_at
      ? `${Math.floor((Date.now() - new Date(b.last_worn_at).getTime()) / 86400000)}d ago`
      : 'never worn'
    const rating = b.user_rating ?? b.rating ?? 'unrated'
    return `${i + 1}. [bottle_id=${b.id}] ${b.name ?? 'Unknown'} by ${b.brand ?? 'Unknown'}, ${b.family ?? '?'} family, projection: ${b.projection ?? '?'}, notes: ${notesStr || 'unknown'}, score: ${sb.score}, last worn: ${daysSince}, rated: ${rating}/5`
  }).join('\n')

  const avoidBottle = top5[top5.length - 1]?.bottle
  const avoidBlock = avoidBottle
    ? `[bottle_id=${avoidBottle.id}] ${avoidBottle.name ?? 'Unknown'}`
    : 'none'

  return `You are a fragrance concierge for someone's personal collection. Given their current context and 5 candidate fragrances (already pre-scored by algorithm), pick ONE primary recommendation and 3 alternatives. Also name ONE fragrance to avoid today and why.

Be warm, personal, and conversational — like a trusted friend who knows their wardrobe inside out. Reference specific notes when relevant. Never sound robotic. Avoid the word "perfect."

CONTEXT:
  ${contextBlock}

CANDIDATES (already pre-scored, but use your judgment):
${candidateBlock}

AVOID LIST (worst scoring — only mention if genuinely poorly suited):
${avoidBlock}

Respond with JSON only matching the exact schema.`
}

// ---------------------------------------------------------------------------
// Validate output against candidate IDs
// ---------------------------------------------------------------------------

function validateOutput(output: GeminiOutput, candidateIds: string[]): boolean {
  const idSet = new Set(candidateIds)
  if (!idSet.has(output.primary.bottle_id)) return false
  for (const alt of output.alternatives) {
    if (!idSet.has(alt.bottle_id)) return false
  }
  const mentioned = new Set([output.primary.bottle_id, ...output.alternatives.map(a => a.bottle_id)])
  if (mentioned.size !== 4) return false
  return true
}

// ---------------------------------------------------------------------------
// Main: pick final recommendation
// ---------------------------------------------------------------------------

export async function pickFinalRecommendation(
  top5: ScoredBottle[],
  context: AutoContext,
  userPicks: UserPicks
): Promise<GeminiOutput> {
  const candidateIds = top5.map(sb => sb.bottle.id)

  const fallback = (): GeminiOutput => ({
    primary: {
      bottle_id: top5[0].bottle.id,
      reason: `This scores highest for today's weather, your ${userPicks.occasion ?? 'chosen'} occasion, and your recent rotation. It should land well.`,
    },
    alternatives: top5.slice(1, 4).map(sb => ({
      bottle_id: sb.bottle.id,
      reason: `Also strong for today's context.`,
    })),
    avoid_today: {
      bottle_id: top5[top5.length - 1].bottle.id,
      reason: `Lower score for today's specific conditions.`,
    },
  })

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    console.warn('[wardrobe/gemini] GOOGLE_GEMINI_API_KEY not set — using fallback')
    return fallback()
  }

  const startMs = Date.now()
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        maxOutputTokens: 500,
      },
    })

    const prompt = buildPrompt(top5, context, userPicks)
    const result = await model.generateContent(prompt)
    const latency = Date.now() - startMs
    const usage = result.response.usageMetadata
    logGeminiCall(latency, usage?.promptTokenCount, usage?.candidatesTokenCount)

    const raw = result.response.text()
    const parsed = GeminiOutputSchema.safeParse(JSON.parse(raw))

    if (!parsed.success) {
      console.warn('[wardrobe/gemini] Zod validation failed:', parsed.error.message)
      return fallback()
    }

    if (!validateOutput(parsed.data, candidateIds)) {
      console.warn('[wardrobe/gemini] Output referenced unknown/duplicate bottle_ids')
      return fallback()
    }

    return parsed.data
  } catch (err) {
    const latency = Date.now() - startMs
    logGeminiCall(latency)
    console.error('[wardrobe/gemini] Error:', err)
    return fallback()
  }
}
