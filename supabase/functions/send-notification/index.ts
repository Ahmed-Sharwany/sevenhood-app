/**
 * send-notification Edge Function
 * ─────────────────────────────────────────────────────────────
 * Sends push notifications to one or more residents via Expo.
 *
 * POST /functions/v1/send-notification
 * Authorization: Bearer <service_role_key>
 *
 * Body:
 * {
 *   residentIds?: string[]   // send to specific residents
 *   buildingId?:  string     // broadcast to all residents in a building
 *   projectId?:   string     // broadcast to all residents in a project
 *   title:        string
 *   body:         string
 *   data?:        object     // extra payload passed to the app
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── Auth: service role only ──────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  // Accept both service role JWT and direct key comparison
  if (!authHeader.includes(serviceKey) && !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { residentIds, buildingId, projectId, title, body, data } = await req.json()

  if (!title || !body) {
    return new Response(JSON.stringify({ error: 'title and body are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Collect push tokens ──────────────────────────────────────
  let query = db
    .from('residents')
    .select('id, full_name, push_token')
    .not('push_token', 'is', null)

  if (residentIds?.length) {
    query = query.in('id', residentIds)
  } else if (buildingId) {
    query = query.eq('units.buildings.id', buildingId)
  } else if (projectId) {
    query = query.eq('units.buildings.projects.id', projectId)
  }

  const { data: residents, error: fetchError } = await query
  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const tokens = (residents ?? [])
    .map((r: any) => r.push_token)
    .filter(Boolean) as string[]

  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No registered devices' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Send via Expo Push API ───────────────────────────────────
  const messages = tokens.map((token) => ({
    to:    token,
    sound: 'default',
    title,
    body,
    data:  data ?? {},
  }))

  // Expo push API accepts up to 100 messages per request
  const chunks: typeof messages[] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  let sent  = 0
  const errors: string[] = []

  for (const chunk of chunks) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify(chunk),
    })

    const result = await res.json()
    const data_arr = result?.data ?? []
    for (const item of data_arr) {
      if (item.status === 'ok') sent++
      else if (item.message) errors.push(item.message)
    }
  }

  return new Response(JSON.stringify({ sent, errors }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
