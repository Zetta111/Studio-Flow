import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client bypasses RLS — safe for server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, password, studioName, phone } = await req.json()

    if (!email || !password || !studioName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm so they can log in immediately
    })

    if (authError) throw authError
    const userId = authData.user.id

    // 2. Create studio with trial
    const { data: studio, error: studioError } = await supabaseAdmin
      .from('studios')
      .insert({
        name: studioName,
        email,
        phone: phone || null,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (studioError) throw studioError

    // 3. Link user to studio
    const { error: userError } = await supabaseAdmin
      .from('studio_users')
      .insert({
        studio_id: studio.id,
        email,
        role: 'owner',
        auth_user_id: userId,
      })

    if (userError) throw userError

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 })
  }
}