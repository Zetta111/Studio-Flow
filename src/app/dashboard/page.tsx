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
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{stats.studioName}</h2>
        <p className="mt-1 text-sm text-gray-500">Welcome back! Here's your studio overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Members</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalMembers}</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Active Members</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.activeMembers}</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Active Classes</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalClasses}</dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href="/dashboard/members"
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 hover:bg-indigo-50 transition"
          >
            <h4 className="text-sm font-medium text-gray-900">Add New Member</h4>
            <p className="mt-1 text-sm text-gray-500">Register a new student</p>
          </a>
          <a
            href="/dashboard/attendance"
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 hover:bg-indigo-50 transition"
          >
            <h4 className="text-sm font-medium text-gray-900">Mark Attendance</h4>
            <p className="mt-1 text-sm text-gray-500">Check in students for today's classes</p>
          </a>
        </div>
      </div>
    </div>
  )
}