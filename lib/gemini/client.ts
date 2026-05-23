import { GoogleGenerativeAI, Schema } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

export class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

export class InvalidResponseError extends Error {
  constructor(message = 'Invalid response format') {
    super(message)
    this.name = 'InvalidResponseError'
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network error') {
    super(message)
    this.name = 'NetworkError'
  }
}

interface CallGeminiOpts {
  flow: 'fragrance_info' | 'wardrobe_rec'
  userId?: string
  model?: 'gemini-3.1-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro'
  systemInstruction: string
  userPrompt: string
  responseSchema: Schema
  maxOutputTokens?: number
  temperature?: number
}

// Bypass RLS to log API usage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function logApiCall(opts: {
  userId?: string
  flow: string
  cacheHit: boolean
  model: string
  inputTokens?: number
  outputTokens?: number
  latencyMs: number
  error?: string
}) {
  try {
    await supabaseAdmin.from('gemini_api_log').insert({
      user_id: opts.userId || null,
      flow: opts.flow,
      cache_hit: opts.cacheHit,
      model: opts.model,
      input_tokens: opts.inputTokens || null,
      output_tokens: opts.outputTokens || null,
      latency_ms: opts.latencyMs,
      error: opts.error || null,
    })
  } catch (err) {
    console.error('[gemini/client] Failed to log API call:', err)
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function callGemini<T>(opts: CallGeminiOpts): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const modelName = opts.model || 'gemini-3.1-flash-lite'
  const maxOutputTokens = opts.maxOutputTokens ?? (opts.flow === 'fragrance_info' ? 800 : 500)
  const temperature = opts.temperature ?? (opts.flow === 'fragrance_info' ? 0.3 : 0.7)

  const generativeModel = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: opts.systemInstruction,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: opts.responseSchema,
      maxOutputTokens,
      temperature,
    },
  })

  const rateLimitDelays = [1000, 3000, 9000]
  const serverErrorDelays = [500, 2000]
  
  let attempts = 0
  let isJsonValidationError = false

  while (true) {
    const startMs = Date.now()
    try {
      let prompt = opts.userPrompt
      if (isJsonValidationError) {
        prompt += '\n\nIMPORTANT: Your previous response was not valid JSON matching the requested schema. Please ensure you strictly follow the schema.'
      }

      const result = await generativeModel.generateContent(prompt)
      const latencyMs = Date.now() - startMs
      const usage = result.response.usageMetadata

      const text = result.response.text()
      try {
        const parsed = JSON.parse(text) as T
        
        // Log success
        await logApiCall({
          userId: opts.userId,
          flow: opts.flow,
          cacheHit: false,
          model: modelName,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
          latencyMs,
        })
        
        return parsed
      } catch (parseErr) {
        if (!isJsonValidationError) {
          isJsonValidationError = true
          continue // Retry once with stricter prompt
        }
        
        const errStr = parseErr instanceof Error ? parseErr.message : String(parseErr)
        await logApiCall({
          userId: opts.userId,
          flow: opts.flow,
          cacheHit: false,
          model: modelName,
          inputTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
          latencyMs,
          error: `JSON Parse Error: ${errStr}`
        })
        throw new InvalidResponseError('Failed to parse Gemini response as JSON')
      }

    } catch (err: any) {
      const latencyMs = Date.now() - startMs
      const status = err.status || err.response?.status
      const errMsg = err.message || String(err)

      await logApiCall({
        userId: opts.userId,
        flow: opts.flow,
        cacheHit: false,
        model: modelName,
        latencyMs,
        error: errMsg,
      })

      if (status === 429 && attempts < rateLimitDelays.length) {
        await delay(rateLimitDelays[attempts])
        attempts++
        continue
      }
      
      if ((status === 500 || status === 503) && attempts < serverErrorDelays.length) {
        await delay(serverErrorDelays[attempts])
        attempts++
        continue
      }
      
      if (status === 400) {
        throw new Error(`Bad Request: ${errMsg}`)
      }
      
      if (status === 429) {
        throw new RateLimitError()
      }

      throw new NetworkError(errMsg)
    }
  }
}
