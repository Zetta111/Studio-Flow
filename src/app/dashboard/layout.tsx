'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import TrialBanner from '@/components/TrialBanner'

type StudioStatus = {
  plan: string | null
  trialEndsAt: string | null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [studioStatus, setStudioStatus] = useState<StudioStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Fetch studio plan + trial status
  useEffect(() => {
    async function fetchStatus() {
      if (!user) return
      try {
        const { data: studioUser } = await supabase
          .from('studio_users')
          .select('studio_id, studios(plan, trial_ends_at)')
          .eq('auth_user_id', user.id)
          .single()

        const studio = (studioUser?.studios as any)
        setStudioStatus({
          plan: studio?.plan || null,
          trialEndsAt: studio?.trial_ends_at || null,
        })
      } catch (err) {
        console.error('Error fetching studio status:', err)
      } finally {
        setStatusLoading(false)
      }
    }
    fetchStatus()
  }, [user, supabase])

  if (loading || statusLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const trialExpired = studioStatus?.trialEndsAt
    ? new Date(studioStatus.trialEndsAt) < new Date()
    : false
  const hasPlan = !!studioStatus?.plan
  const isSubscribePage = pathname?.startsWith('/dashboard/subscribe')
  const isInTrial =
    studioStatus?.trialEndsAt &&
    new Date(studioStatus.trialEndsAt) > new Date() &&
    !hasPlan

  // Hard block — expired trial, no plan, not already on subscribe page
  if (trialExpired && !hasPlan && !isSubscribePage) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-5">⏰</div>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            Your free trial has ended
          </h2>
          <p className="text-slate-400 text-sm mb-2">
            Thanks for trying StudioFlow! Choose a plan to keep access to your
            members, classes, and attendance data.
          </p>
          <p className="text-xs text-slate-500 mb-8">
            Your data is safe — it's waiting for you on the other side.
          </p>
          <Link
            href="/dashboard/subscribe"
            className="inline-block w-full bg-purple-600 text-white font-semibold text-sm px-8 py-3 rounded-xl hover:bg-purple-700 transition"
          >
            View plans →
          </Link>
          <div className="mt-5">
            <button
              onClick={handleSignOut}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/members', label: 'Members' },
    { href: '/dashboard/classes', label: 'Classes' },
    { href: '/dashboard/attendance', label: 'Attendance' },
  ]

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Trial Banner */}
      {isInTrial && studioStatus?.trialEndsAt && (
        <TrialBanner trialEndsAt={studioStatus.trialEndsAt} />
      )}

      {/* Top Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-purple-400">StudioFlow</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition ${
                      pathname === link.href
                        ? 'border-purple-500 text-white'
                        : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/profile"
                className="text-sm text-slate-400 hover:text-slate-200 transition"
              >
                {user.email}
              </Link>
              <button
                onClick={handleSignOut}
                className="bg-slate-700 py-2 px-4 border border-slate-600 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-600 transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
