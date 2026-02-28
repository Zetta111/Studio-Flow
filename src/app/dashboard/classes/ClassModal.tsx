'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { Class } from './page'

type Props = {
  studioId: string
  cls: Class | null  // null = adding new
  onClose: () => void
  onSaved: () => void
}

type FormData = {
  name: string
  description: string
  instructor_name: string
  day_of_week: string
  start_time: string
  duration_minutes: string
  is_active: boolean
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const empty: FormData = {
  name: '',
  description: '',
  instructor_name: '',
  day_of_week: '1', // Monday default
  start_time: '09:00',
  duration_minutes: '60',
  is_active: true,
}

export default function ClassModal({ studioId, cls, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [form, setForm] = useState<FormData>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!cls

  useEffect(() => {
    if (cls) {
      setForm({
        name: cls.name,
        description: cls.description || '',
        instructor_name: cls.instructor_name || '',
        day_of_week: String(cls.day_of_week),
        start_time: cls.start_time.slice(0, 5), // trim seconds
        duration_minutes: cls.duration_minutes != null ? String(cls.duration_minutes) : '',
        is_active: cls.is_active,
      })
    } else {
      setForm(empty)
    }
  }, [cls])

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Class name is required.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        instructor_name: form.instructor_name.trim() || null,
        day_of_week: parseInt(form.day_of_week),
        start_time: form.start_time,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        is_active: form.is_active,
      }

      if (isEditing) {
        const { error } = await supabase
          .from('classes')
          .update(payload)
          .eq('id', cls.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('classes')
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit Class' : 'Add New Class'}
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

          {/* Name */}
          <div>
            <label className={labelClass}>
              Class Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputClass}
              placeholder="e.g. Morning Pilates"
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Optional class description..."
            />
          </div>

          {/* Instructor */}
          <div>
            <label className={labelClass}>Instructor Name</label>
            <input
              type="text"
              value={form.instructor_name}
              onChange={(e) => set('instructor_name', e.target.value)}
              className={inputClass}
              placeholder="e.g. Sarah Johnson"
            />
          </div>

          {/* Day + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Day of Week</label>
              <select
                value={form.day_of_week}
                onChange={(e) => set('day_of_week', e.target.value)}
                className={inputClass}
              >
                {DAYS.map((day, idx) => (
                  <option key={day} value={idx}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => set('start_time', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Duration + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={form.duration_minutes}
                onChange={(e) => set('duration_minutes', e.target.value)}
                className={inputClass}
                placeholder="60"
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.is_active ? 'active' : 'inactive'}
                onChange={(e) => set('is_active', e.target.value === 'active')}
                className={inputClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Footer */}
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
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
