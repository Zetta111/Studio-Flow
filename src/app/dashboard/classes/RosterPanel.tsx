'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Class } from './types'

type Member = {
  id: string
  first_name: string
  last_name: string
  status: 'active' | 'inactive'
}

type RosterMember = {
  id: string       // class_members row id
  member_id: string
  enrolled_at: string
  members: Member
}

type Props = {
  cls: Class
  studioId: string
  onClose: () => void
}

export default function RosterPanel({ cls, studioId, onClose }: Props) {
  const supabase = createClient()

  const [roster, setRoster] = useState<RosterMember[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [loadingRoster, setLoadingRoster] = useState(true)
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchRoster = useCallback(async () => {
    setLoadingRoster(true)
    try {
      const { data, error } = await supabase
        .from('class_members')
        .select('id, member_id, enrolled_at, members(id, first_name, last_name, status)')
        .eq('class_id', cls.id)
        .order('enrolled_at', { ascending: true })
      if (error) throw error
      setRoster((data as any) || [])
    } catch (err) {
      console.error('Error fetching roster:', err)
    } finally {
      setLoadingRoster(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.id])

  useEffect(() => {
    fetchRoster()
  }, [fetchRoster])

  // Search members by name, excluding already enrolled
  useEffect(() => {
    const term = search.trim()
    if (!term) {
      setSearchResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const enrolledIds = roster.map((r) => r.member_id)

        const { data, error } = await supabase
          .from('members')
          .select('id, first_name, last_name, status')
          .eq('studio_id', studioId)
          .eq('status', 'active')
          .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
          .limit(8)

        console.log('[RosterPanel] search error:', error, '| data:', data, '| studioId:', studioId, '| term:', term)
        if (error) throw error

        // Filter out already enrolled members client-side
        const filtered = (data || []).filter((m) => !enrolledIds.includes(m.id))
        setSearchResults(filtered)
      } catch (err) {
        console.error('Error searching members:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roster, studioId])

  const addMember = async (member: Member) => {
    setAddingId(member.id)
    try {
      const { error } = await supabase.from('class_members').insert({
        class_id: cls.id,
        member_id: member.id,
        studio_id: studioId,
      })
      if (error) throw error
      setSearch('')
      setSearchResults([])
      await fetchRoster()
    } catch (err) {
      console.error('Error adding member:', err)
    } finally {
      setAddingId(null)
    }
  }

  const removeMember = async (rosterEntry: RosterMember) => {
    setRemovingId(rosterEntry.id)
    try {
      const { error } = await supabase
        .from('class_members')
        .delete()
        .eq('id', rosterEntry.id)
      if (error) throw error
      await fetchRoster()
    } catch (err) {
      console.error('Error removing member:', err)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-800 border-l border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">{cls.name} — Roster</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {roster.length} member{roster.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-light leading-none transition"
          >
            ×
          </button>
        </div>

        {/* Search to add */}
        <div className="px-6 py-4 border-b border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Add Member
          </label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searching && (
              <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                Searching...
              </span>
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-1 border border-slate-600 rounded-md shadow-sm bg-slate-700 divide-y divide-slate-600 max-h-48 overflow-y-auto">
              {searchResults.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-600 transition"
                >
                  <span className="text-sm text-white">
                    {member.first_name} {member.last_name}
                  </span>
                  <button
                    onClick={() => addMember(member)}
                    disabled={addingId === member.id}
                    className="text-xs font-medium text-purple-400 hover:text-purple-300 disabled:opacity-50 transition"
                  >
                    {addingId === member.id ? 'Adding...' : '+ Add'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {search.trim() && !searching && searchResults.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">
              No active members found matching &quot;{search}&quot;.
            </p>
          )}
        </div>

        {/* Roster list */}
        <div className="flex-1 overflow-y-auto">
          {loadingRoster ? (
            <div className="p-6 text-center text-sm text-slate-400">Loading roster...</div>
          ) : roster.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              No members enrolled yet. Search above to add members.
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {roster.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-slate-700/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-semibold">
                      {entry.members.first_name[0]}{entry.members.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {entry.members.first_name} {entry.members.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Enrolled {new Date(entry.enrolled_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(entry)}
                    disabled={removingId === entry.id}
                    className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50 transition"
                  >
                    {removingId === entry.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
