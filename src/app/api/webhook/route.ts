import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { userId, plan } = session.metadata || {}

    if (userId && plan) {
      // Get studio_id for this user
      const { data: studioUser } = await supabase
        .from('studio_users')
        .select('studio_id')
        .eq('auth_user_id', userId)
        .single()

      if (studioUser) {
        await supabase
          .from('studios')
          .update({
            plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            trial_ends_at: null, // clear trial once paid
          })
          .eq('id', studioUser.studio_id)
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const { userId } = subscription.metadata || {}

    if (userId) {
      const { data: studioUser } = await supabase
        .from('studio_users')
        .select('studio_id')
        .eq('auth_user_id', userId)
        .single()

      if (studioUser) {
        await supabase
          .from('studios')
          .update({ plan: null })
          .eq('id', studioUser.studio_id)
      }
    }
  }

  return NextResponse.json({ received: true })
}