/**
 * ai-design Edge Function
 * ─────────────────────────────────────────────────────────────
 * Secure proxy for Replicate AI interior design API.
 * The Replicate API token never leaves the server.
 *
 * POST /functions/v1/ai-design
 * Authorization: Bearer <resident_jwt>
 *
 * Body: { action: 'create', imageUrl, prompt, ... }
 *    or { action: 'poll',   predictionId }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REPLICATE_API_TOKEN   = Deno.env.get('REPLICATE_API_TOKEN') ?? ''
const REPLICATE_MODEL_VERSION = '76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── Auth check ──────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!REPLICATE_API_TOKEN) {
    return new Response(JSON.stringify({ error: 'Replicate API not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Parse body ───────────────────────────────────────────────
  const body = await req.json()
  const { action } = body

  // ── Create prediction ────────────────────────────────────────
  if (action === 'create') {
    const {
      imageUrl,
      prompt,
      negativePrompt = 'ugly, blurry, low quality, deformed, text, watermark',
      guidanceScale  = 15,
      numInferenceSteps = 50,
      strength       = 0.8,
      seed           = Math.floor(Math.random() * 1_000_000),
    } = body

    if (!imageUrl || !prompt) {
      return new Response(JSON.stringify({ error: 'imageUrl and prompt are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res  = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization:  `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: {
          image:               imageUrl,
          prompt,
          negative_prompt:     negativePrompt,
          guidance_scale:      guidanceScale,
          num_inference_steps: numInferenceSteps,
          strength,
          seed,
        },
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Poll prediction ───────────────────────────────────────────
  if (action === 'poll') {
    const { predictionId } = body
    if (!predictionId) {
      return new Response(JSON.stringify({ error: 'predictionId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res  = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
    })
    const data = await res.json()
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Invalid action. Use "create" or "poll".' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
