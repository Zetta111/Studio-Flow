'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/AuthContext'
import ClassModal from './ClassModal'
import RosterPanel from './RosterPanel'
import type { Class } from './types'

export type { Class }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function ClassesPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [studioId, setStudioId] = useState<string | null>(null)

  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [deletingClass, setDeletingClass] = useState<Class | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [rosterClass, setRosterClass] = useState<Class | null>(null)

  useEffect(() => {
    async function getStudio() {
      if (!user) return
      const { data } = await supabase
        .from('studio_users')
        .select('studio_id')
        .eq('auth_user_id', user.id)
        .single()
      if (data) setStudioId(data.studio_id)
    }
    getStudio()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchClasses = useCallback(async () => {
    if (!studioId) return
    setLoading(true)
    try {
      let query = supabase
        .from('classes')
        .select('*')
        .eq('studio_id', studioId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (filter !== 'all') {
        query = query.eq('is_active', filter === 'active')
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioId, filter])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const handleDelete = async () => {
    if (!deletingClass) return
    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', deletingClass.id)
      if (error) throw error
      setDeletingClass(null)
      fetchClasses()
    } catch (error) {
      console.error('Error deleting class:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const toggleActive = async (cls: Class) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_active: !cls.is_active })
        .eq('id', cls.id)
      if (error) throw error
      fetchClasses()
    } catch (error) {
      console.error('Error toggling class:', error)
    }
  }

  // Group classes by day of week
  const grouped = DAYS.reduce((acc, day, idx) => {
    const dayClasses = classes.filter((c) => c.day_of_week === idx)
    if (dayClasses.length > 0) acc[day] = dayClasses
    return acc
  }, {} as Record<string, Class[]>)

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Classes</h2>
          <p className="mt-1 text-sm text-slate-400">
            {classes.length} class{classes.length !== 1 ? 'es' : ''}
            {filter !== 'all' ? ` (${filter})` : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditingClass(null); setModalOpen(true) }}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition"
        >
          + Add Class
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        {(['active', 'all', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition capitalize ${
              filter === f
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">Loading classes...</div>
      ) : classes.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center text-slate-400 text-sm">
          {filter !== 'all'
            ? `No ${filter} classes found.`
            : 'No classes yet. Add your first class!'}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, dayClasses]) => (
            <div key={day}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {day}
              </h3>
              <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden divide-y divide-slate-700">
                {dayClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-700/50 transition"
                  >
                    {/* Time */}
                    <div className="w-20 shrink-0 text-sm font-medium text-slate-300">
                      {formatTime(cls.start_time)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{cls.name}</span>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            cls.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {cls.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 flex gap-3 flex-wrap">
                        {cls.instructor_name && <span>👤 {cls.instructor_name}</span>}
                        {cls.duration_minutes && <span>⏱ {cls.duration_minutes} min</span>}
                        {cls.description && (
                          <span className="truncate max-w-xs">{cls.description}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                      <button
                        onClick={() => setRosterClass(cls)}
                        className="text-xs font-medium text-purple-400 hover:text-purple-300 transition"
                      >
                        Roster
                      </button>
                      <button
                        onClick={() => toggleActive(cls)}
                        className="text-xs text-slate-400 hover:text-purple-400 font-medium transition"
                      >
                        {cls.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => { setEditingClass(cls); setModalOpen(true) }}
                        className="text-sm text-purple-400 hover:text-purple-300 font-medium transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingClass(cls)}
                        className="text-sm text-red-400 hover:text-red-300 font-medium transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <ClassModal
          studioId={studioId!}
          cls={editingClass}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchClasses() }}
        />
      )}

      {/* Roster Panel */}
      {rosterClass && studioId && (
        <RosterPanel
          cls={rosterClass}
          studioId={studioId}
          onClose={() => setRosterClass(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deletingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Class</h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-medium text-white">{deletingClass.name}</span>? This cannot
              be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingClass(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
