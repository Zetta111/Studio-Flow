'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/contexts/AuthContext'

type ClassSession = {
  id: string
  class_id: string
  studio_id: string
  session_date: string
  start_time: string
  notes: string | null
  created_at: string
  classes: {
    name: string
    instructor_name: string | null
    duration_minutes: number | null
  }
}

type Member = {
  id: string
  first_name: string
  last_name: string
  status: 'active' | 'inactive'
}

type AttendanceRecord = {
  id: string
  class_session_id: string
  member_id: string
  status: 'present' | 'absent'
  marked_at: string
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function toISODate(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function AttendancePage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [studioId, setStudioId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({}) // keyed by member_id
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingAttendance, setLoadingAttendance] = useState(false)
  const [savingMember, setSavingMember] = useState<string | null>(null)

  // Get studioId
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

  // Fetch or auto-create sessions for selected date
  const fetchSessions = useCallback(async () => {
    if (!studioId) return
    setLoadingSessions(true)
    setSelectedSession(null)

    try {
      const dateStr = toISODate(selectedDate)
      const dayOfWeek = selectedDate.getDay() // 0=Sun, 6=Sat

      // 1. Find classes scheduled for this day of week
      const { data: scheduledClasses } = await supabase
        .from('classes')
        .select('id, name, instructor_name, duration_minutes, start_time')
        .eq('studio_id', studioId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)

      if (!scheduledClasses || scheduledClasses.length === 0) {
        setSessions([])
        setLoadingSessions(false)
        return
      }

      // 2. Check which sessions already exist for this date
      const { data: existingSessions } = await supabase
        .from('class_sessions')
        .select('*, classes(name, instructor_name, duration_minutes)')
        .eq('studio_id', studioId)
        .eq('session_date', dateStr)

      const existingClassIds = new Set((existingSessions || []).map((s: any) => s.class_id))

      // 3. Auto-create missing sessions
      const toCreate = scheduledClasses.filter((c) => !existingClassIds.has(c.id))
      if (toCreate.length > 0) {
        await supabase.from('class_sessions').insert(
          toCreate.map((c) => ({
            class_id: c.id,
            studio_id: studioId,
            session_date: dateStr,
            start_time: c.start_time,
            notes: null,
          }))
        )
      }

      // 4. Re-fetch all sessions for this date
      const { data: allSessions, error } = await supabase
        .from('class_sessions')
        .select('*, classes(name, instructor_name, duration_minutes)')
        .eq('studio_id', studioId)
        .eq('session_date', dateStr)
        .order('start_time', { ascending: true })

      if (error) throw error
      setSessions(allSessions || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }, [studioId, selectedDate, supabase])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Fetch members + attendance when a session is selected
  const fetchAttendance = useCallback(async () => {
    if (!studioId || !selectedSession) return
    setLoadingAttendance(true)

    try {
      // Get active members
      const { data: memberData } = await supabase
        .from('members')
        .select('id, first_name, last_name, status')
        .eq('studio_id', studioId)
        .eq('status', 'active')
        .order('first_name', { ascending: true })

      setMembers(memberData || [])

      // Get existing attendance for this session
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_session_id', selectedSession.id)

      const map: Record<string, AttendanceRecord> = {}
      for (const record of attendanceData || []) {
        map[record.member_id] = record
      }
      setAttendance(map)
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setLoadingAttendance(false)
    }
  }, [studioId, selectedSession, supabase])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  const toggleAttendance = async (member: Member) => {
    if (!selectedSession) return
    setSavingMember(member.id)

    try {
      const existing = attendance[member.id]

      if (existing) {
        // Toggle between present/absent
        const newStatus = existing.status === 'present' ? 'absent' : 'present'
        const { error } = await supabase
          .from('attendance')
          .update({ status: newStatus, marked_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error
        setAttendance((prev) => ({
          ...prev,
          [member.id]: { ...existing, status: newStatus },
        }))
      } else {
        // Create new present record
        const { data, error } = await supabase
          .from('attendance')
          .insert({
            class_session_id: selectedSession.id,
            member_id: member.id,
            studio_id: studioId,
            status: 'present',
            marked_at: new Date().toISOString(),
          })
          .select()
          .single()
        if (error) throw error
        setAttendance((prev) => ({ ...prev, [member.id]: data }))
      }
    } catch (error) {
      console.error('Error toggling attendance:', error)
    } finally {
      setSavingMember(null)
    }
  }

  const presentCount = Object.values(attendance).filter((a) => a.status === 'present').length

  // Date navigation helpers
  const goToPrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
  }
  const goToNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
  }
  const goToToday = () => setSelectedDate(new Date())

  const isToday = toISODate(selectedDate) === toISODate(new Date())

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>
        <p className="mt-1 text-sm text-gray-500">Mark attendance for scheduled classes</p>
      </div>

      {/* Date Picker */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevDay}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition"
          >
            ‹
          </button>
          <div className="text-center min-w-[180px]">
            <p className="text-sm font-semibold text-gray-900">{formatDate(selectedDate)}</p>
          </div>
          <button
            onClick={goToNextDay}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition"
          >
            ›
          </button>
        </div>
        {!isToday && (
          <button
            onClick={goToToday}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition"
          >
            Back to today
          </button>
        )}
        <div className="sm:ml-auto">
          <input
            type="date"
            value={toISODate(selectedDate)}
            onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Classes
          </h3>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {loadingSessions ? (
              <div className="p-6 text-center text-sm text-gray-500">Loading classes...</div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No classes scheduled for this day.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`w-full text-left px-4 py-3 hover:bg-indigo-50 transition ${
                      selectedSession?.id === session.id
                        ? 'bg-indigo-50 border-l-4 border-indigo-500'
                        : ''
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {session.classes.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTime(session.start_time)}
                      {session.classes.duration_minutes && ` · ${session.classes.duration_minutes} min`}
                      {session.classes.instructor_name && ` · ${session.classes.instructor_name}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Attendance Panel */}
        <div className="lg:col-span-2">
          {!selectedSession ? (
            <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500 text-sm h-full flex items-center justify-center">
              ← Select a class to take attendance
            </div>
          ) : (
            <>
              {/* Session Header */}
              <div className="bg-white shadow rounded-lg px-5 py-4 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {selectedSession.classes.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(selectedDate)} · {formatTime(selectedSession.start_time)}
                  </p>
                </div>
                {!loadingAttendance && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">{presentCount}</p>
                    <p className="text-xs text-gray-500">
                      of {members.length} present
                    </p>
                  </div>
                )}
              </div>

              {/* Member List */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                {loadingAttendance ? (
                  <div className="p-6 text-center text-sm text-gray-500">Loading members...</div>
                ) : members.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No active members found. Add members first.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {members.map((member) => {
                      const record = attendance[member.id]
                      const isPresent = record?.status === 'present'
                      const isLoading = savingMember === member.id

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                isPresent
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {member.first_name[0]}{member.last_name[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </span>
                          </div>
                          <button
                            onClick={() => toggleAttendance(member)}
                            disabled={isLoading}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition disabled:opacity-50 ${
                              isPresent
                                ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                            }`}
                          >
                            {isLoading ? '...' : isPresent ? 'Present ✓' : 'Absent'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}