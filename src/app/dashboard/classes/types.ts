export type Class = {
  id: string
  studio_id: string
  name: string
  description: string | null
  instructor_name: string | null
  day_of_week: number // 0 = Sunday, 1 = Monday ... 6 = Saturday
  start_time: string  // e.g. "09:00:00"
  duration_minutes: number | null
  is_active: boolean
  created_at: string
}
