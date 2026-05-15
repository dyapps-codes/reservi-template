export type Settings = {
  business_name: string
  tagline: string
  contact_email: string
  contact_phone?: string | null
  timezone: string
  locale: string
  currency: string
  brand_color: string
  hero_image_url?: string | null
  booking_window_days: number
  min_lead_minutes: number
  cancellation_lead_minutes?: number
  slot_step_minutes: number
  auto_confirm?: boolean
  notifications_enabled?: boolean
}

export type Resource = {
  id: string
  slug: string
  name: string
  kind: 'staff' | 'room' | 'equipment'
  description?: string | null
  avatar_url?: string | null
  color: string
  capacity: number
  timezone?: string | null
  sort_order: number
  is_active: boolean
  rules?: AvailabilityRule[]
  services?: { id: string; name: string; slug: string; color?: string }[]
}

export type AvailabilityRule = {
  id?: string
  weekday: number
  start_time: string
  end_time: string
}

export type Service = {
  id: string
  slug: string
  name: string
  description?: string | null
  duration_minutes: number
  buffer_minutes: number
  price_cents: number
  currency: string
  color: string
  capacity: number
  requires_resource: boolean
  is_public: boolean
  is_active: boolean
  sort_order: number
  resources?: { id: string; name: string; slug: string; color?: string }[]
}

export type Slot = {
  starts_at: string
  ends_at: string
  resource_id: string | null
  resource_name: string | null
  resource_color?: string
}

export type Customer = {
  id: string
  email: string
  full_name: string
  phone?: string | null
  notes?: string | null
  marketing_opt_in: boolean
  bookings_count: number
  last_booking_at?: string | null
  created_at: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export type Booking = {
  id: string
  booking_code: string
  service_name: string
  resource_name?: string | null
  starts_at: string
  ends_at: string
  status: BookingStatus
  price_cents: number
  currency: string
  party_size: number
  notes?: string | null
  cancellation_reason?: string | null
  source?: 'public' | 'admin' | 'import'
  customer: { id: string; full_name: string; email: string; phone?: string | null }
  created_at?: string
}

export type TimeBlock = {
  id: string
  resource_id: string | null
  resource_name?: string | null
  starts_at: string
  ends_at: string
  reason?: string | null
  created_at: string
}
