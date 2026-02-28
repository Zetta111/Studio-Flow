'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/AuthContext'
import MemberModal from './MemberModal'

export type Member = {
  id: string
  studio_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive'
  monthly_rate: number | null
  join_date: string | null
  notes: string | null
  created_at: string
}

export default function MembersPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [studioId, setStudioId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [deletingMember, setDeletingMember] = useState<Member | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Get studioId once
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
  }, [user, supabase])

  const fetchMembers = useCallback(async () => {
    if (!studioId) return
    setLoading(true)
    try {
      let query = supabase
        .from('members')
        .select('*')
        .eq('studio_id', studioId)
        .order('first_name', { ascending: true })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }, [studioId, statusFilter, supabase])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleDelete = async () => {
    if (!deletingMember) return
    setDeleteLoading(true)
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', deletingMember.id)
      if (error) throw error
      setDeletingMember(null)
      fetchMembers()
    } catch (error) {
      console.error('Error deleting member:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredMembers = members.filter((m) => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase()
    const term = search.toLowerCase()
    return (
      fullName.includes(term) ||
      m.email.toLowerCase().includes(term) ||
      (m.phone || '').includes(term)
    )
  })

  const openAdd = () => {
    setEditingMember(null)
    setModalOpen(true)
  }

  const openEdit = (member: Member) => {
    setEditingMember(member)
    setModalOpen(true)
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Members</h2>
          <p className="mt-1 text-sm text-slate-400">
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' ? ` (${statusFilter})` : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition"
        >
          + Add Member
        </button>
      </div>

      {/* Search & Filter */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-600 text-white placeholder:text-slate-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="bg-slate-800 border border-slate-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search || statusFilter !== 'all'
              ? 'No members match your search.'
              : 'No members yet. Add your first member!'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Monthly Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-700/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {member.first_name} {member.last_name}
                    </div>
                    <div className="text-xs text-slate-400 sm:hidden">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden sm:table-cell">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden md:table-cell">
                    {member.phone || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        member.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden md:table-cell">
                    {member.monthly_rate != null ? `$${member.monthly_rate}/mo` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => openEdit(member)}
                      className="text-purple-400 hover:text-purple-300 font-medium mr-4 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingMember(member)}
                      className="text-red-400 hover:text-red-300 font-medium transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <MemberModal
          studioId={studioId!}
          member={editingMember}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            fetchMembers()
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Member</h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-medium text-white">
                {deletingMember.first_name} {deletingMember.last_name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingMember(null)}
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
