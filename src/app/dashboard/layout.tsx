'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Navigation */}
      <nav className="bg-slate-900 border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-purple-400">StudioFlow</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-transparent text-slate-400 hover:border-slate-500 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/members"
                  className="border-transparent text-slate-400 hover:border-slate-500 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
                >
                  Members
                </Link>
                <Link
                  href="/dashboard/classes"
                  className="border-transparent text-slate-400 hover:border-slate-500 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
                >
                  Classes
                </Link>
                <Link
                  href="/dashboard/attendance"
                  className="border-transparent text-slate-400 hover:border-slate-500 hover:text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition"
                >
                  Attendance
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-slate-400 mr-4">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-slate-800 py-2 px-4 border border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-purple-500 transition"
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
