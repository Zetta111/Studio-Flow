'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Member } from './page'

type Props = {
  studioId: string
  member: Member | null  // null = adding new
  onClose: () => void
  onSaved: () => void
}

type FormData = {
  first_name: string
  last_name: string
  email: string
  phone: string
  status: 'active' | 'inactive'
  monthly_rate: string
  join_date: string
  notes: string
}

const empty: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  status: 'active',
  monthly_rate: '',
  join_date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function MemberModal({ studioId, member, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [form, setForm] = useState<FormData>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!member

  useEffect(() => {
    if (member) {
      setForm({
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        phone: member.phone || '',
        status: member.status,
        monthly_rate: member.monthly_rate != null ? String(member.monthly_rate) : '',
        join_date: member.join_date || new Date().toISOString().split('T')[0],
        notes: member.notes || '',
      })
    } else {
      setForm(empty)
    }
  }, [member])

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setError('First name, last name, and email are required.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        status: form.status,
        monthly_rate: form.monthly_rate ? parseFloat(form.monthly_rate) : null,
        join_date: form.join_date || null,
        notes: form.notes.trim() || null,
      }

      if (isEditing) {
        const { error } = await supabase
          .from('members')
          .update(payload)
          .eq('id', member.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('members')
          .insert({ ...payload, studio_id: studioId })
        if (error) throw error
      }

      onSaved()
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-slate-700 border border-slate-600 text-white placeholder:text-slate-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
  const labelClass = "block text-sm font-medium text-slate-300 mb-1"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Member' : 'Add New Member'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-xl font-light leading-none transition"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                className={inputClass}
                placeholder="Jane"
              />
            </div>
            <div>
              <label className={labelClass}>
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                className={inputClass}
                placeholder="Smith"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputClass}
              placeholder="jane@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={inputClass}
              placeholder="(555) 000-0000"
            />
          </div>

          {/* Status + Monthly Rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Monthly Rate ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_rate}
                onChange={(e) => set('monthly_rate', e.target.value)}
                className={inputClass}
                placeholder="150"
              />
            </div>
          </div>

          {/* Join Date */}
          <div>
            <label className={labelClass}>Join Date</label>
            <input
              type="date"
              value={form.join_date}
              onChange={(e) => set('join_date', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Any notes about this member..."
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
