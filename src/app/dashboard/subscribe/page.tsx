'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 79,
    limit: '50 members',
    features: [
      'Up to 50 members',
      'Unlimited classes',
      'Attendance tracking',
      'Member roster management',
      'Email support',
    ],
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 99,
    limit: '100 members',
    features: [
      'Up to 100 members',
      'Unlimited classes',
      'Attendance tracking',
      'Member roster management',
      'Priority email support',
    ],
    highlight: true,
  },
]

export default function SubscribePage() {
  const { user } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async (planId: string) => {
    if (!user) return
    setLoadingPlan(planId)
    setError(null)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, userId: user.id }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoadingPlan(null)
    }
  }

  return (
    <div className="px-4 sm:px-0 max-w-3xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Choose your plan
        </h2>
        <p className="mt-2 text-gray-500 text-sm">
          Your free trial has ended. Select a plan to continue using StudioFlow.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 text-center">
          {error}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl p-8 flex flex-col ${
              plan.highlight
                ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02]'
                : 'bg-white text-gray-900 shadow-lg border border-gray-100'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                  Most Popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <h3 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <div className="flex items-end gap-1 mt-3">
                <span className={`text-5xl font-extrabold tracking-tight ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  ${plan.price}
                </span>
                <span className={`text-sm mb-2 ${plan.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>
                  / month
                </span>
              </div>
              <p className={`text-xs mt-1 font-medium ${plan.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>
                {plan.limit}
              </p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm">
                  <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                    plan.highlight ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    ✓
                  </span>
                  <span className={plan.highlight ? 'text-indigo-100' : 'text-gray-600'}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={!!loadingPlan}
              className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition disabled:opacity-60 ${
                plan.highlight
                  ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {loadingPlan === plan.id ? 'Redirecting...' : `Get ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400">
        Secured by Stripe · Cancel anytime · No hidden fees
      </p>
    </div>
  )
}