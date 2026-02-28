'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalClasses: 0,
    studioName: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!user) return

      try {
        // Get studio info
        const { data: studioUser } = await supabase
          .from('studio_users')
          .select('studio_id, studios(name)')
          .eq('auth_user_id', user.id)
          .single()

        if (!studioUser) return

        const studioId = studioUser.studio_id

        // Get member counts
        const { count: totalMembers } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('studio_id', studioId)

        const { count: activeMembers } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('studio_id', studioId)
          .eq('status', 'active')

        // Get class count
        const { count: totalClasses } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .eq('studio_id', studioId)
          .eq('is_active', true)

        setStats({
          totalMembers: totalMembers || 0,
          activeMembers: activeMembers || 0,
          totalClasses: totalClasses || 0,
          studioName: (studioUser.studios as any)?.name || 'Your Studio',
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="px-4 sm:px-0">
        <p className="text-slate-400">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">{stats.studioName}</h2>
        <p className="mt-1 text-sm text-slate-400">Welcome back! Here's your studio overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-slate-800 overflow-hidden rounded-lg border border-slate-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-slate-400 truncate">Total Members</dt>
                <dd className="mt-1 text-3xl font-semibold text-white">{stats.totalMembers}</dd>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-lg">
                👥
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 overflow-hidden rounded-lg border border-slate-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-slate-400 truncate">Active Members</dt>
                <dd className="mt-1 text-3xl font-semibold text-white">{stats.activeMembers}</dd>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-lg">
                ✓
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 overflow-hidden rounded-lg border border-slate-700">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-slate-400 truncate">Active Classes</dt>
                <dd className="mt-1 text-3xl font-semibold text-white">{stats.totalClasses}</dd>
              </div>
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-lg">
                🎯
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="/dashboard/members"
            className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-purple-500 hover:bg-purple-500/10 transition"
          >
            <h4 className="text-sm font-medium text-white">Add New Member</h4>
            <p className="mt-1 text-sm text-slate-400">Register a new student</p>
          </a>
          <a
            href="/dashboard/attendance"
            className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-purple-500 hover:bg-purple-500/10 transition"
          >
            <h4 className="text-sm font-medium text-white">Mark Attendance</h4>
            <p className="mt-1 text-sm text-slate-400">Check in students for today's classes</p>
          </a>
        </div>
      </div>
    </div>
  )
}
