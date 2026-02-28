'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

type ProfileData = {
  studioName: string
  plan: 'starter' | 'growth' | null
  memberCount: number
  trialEndsAt: string | null
  createdAt: string | null
}

const PLAN_DETAILS = {
  starter: {
    name: 'Starter',
    price: 79,
    limit: 50,
    color: 'indigo',
  },
  growth: {
    name: 'Growth',
    price: 99,
    limit: 100,
    color: 'violet',
  },
}

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const supabase = createClient()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return
      try {
        // Get studio info
        const { data: studioUser } = await supabase
          .from('studio_users')
          .select('studio_id, studios(name, plan, trial_ends_at, created_at)')
          .eq('auth_user_id', user.id)
          .single()

        if (!studioUser) return

        const studioId = studioUser.studio_id
        const studio = studioUser.studios as any

        // Get member count
        const { count: memberCount } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('studio_id', studioId)

        setProfile({
          studioName: studio?.name || 'Your Studio',
          plan: studio?.plan || null,
          memberCount: memberCount || 0,
          trialEndsAt: studio?.trial_ends_at || null,
          createdAt: studio?.created_at || null,
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user, supabase])

  const isInTrial = profile?.trialEndsAt
    ? new Date(profile.trialEndsAt) > new Date()
    : false

  const trialDaysLeft = profile?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(profile.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const planDetails = profile?.plan ? PLAN_DETAILS[profile.plan] : null
  const memberLimit = planDetails?.limit ?? 50
  const usagePercent = Math.min(100, Math.round(((profile?.memberCount ?? 0) / memberLimit) * 100))

  if (loading) {
    return (
      <div className="px-4 sm:px-0">
        <p className="text-gray-500 text-sm">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0 max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your account and subscription</p>
      </div>

      {/* Account Info */}
      <div className="bg-white shadow rounded-xl p-6 mb-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Account
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Studio</span>
            <span className="text-sm font-medium text-gray-900">{profile?.studioName}</span>
          </div>
          {profile?.createdAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Member since</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-white shadow rounded-xl p-6 mb-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Current Plan
        </h3>

        {/* Trial banner */}
        {isInTrial && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Free trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Upgrade before your trial ends to keep access
              </p>
            </div>
            <span className="text-amber-400 text-xl">⏳</span>
          </div>
        )}

        {planDetails ? (
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-gray-900">{planDetails.name}</span>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                ${planDetails.price}/month · up to {planDetails.limit} members
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-xl font-extrabold text-gray-900">Trial</span>
              <p className="text-sm text-gray-500 mt-0.5">No plan selected yet</p>
            </div>
          </div>
        )}

        {/* Member usage bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500">Member usage</span>
            <span className="text-xs font-semibold text-gray-700">
              {profile?.memberCount} / {memberLimit}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usagePercent >= 90
                  ? 'bg-red-500'
                  : usagePercent >= 70
                  ? 'bg-amber-400'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent >= 90 && (
            <p className="text-xs text-red-500 mt-1.5 font-medium">
              You're almost at your limit — consider upgrading
            </p>
          )}
        </div>

        {/* Upgrade / manage */}
        {profile?.plan === 'starter' ? (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Upgrade to Growth</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Up to 100 members · $99/month
              </p>
            </div>
            <Link
              href="/dashboard/subscribe"
              className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Upgrade →
            </Link>
          </div>
        ) : profile?.plan === 'growth' ? (
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
            <p className="text-sm text-gray-500">
              You're on our highest plan. Need more?{' '}
              <a href="mailto:support@studioflow.com" className="text-indigo-600 hover:underline">
                Contact us
              </a>
            </p>
          </div>
        ) : (
          <Link
            href="/dashboard/subscribe"
            className="block text-center bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition"
          >
            Choose a plan
          </Link>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white shadow rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Account Actions
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Sign out</p>
            <p className="text-xs text-gray-500 mt-0.5">Sign out of your account on this device</p>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}