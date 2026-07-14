export type Customer = {
  id: string
  customer_name: string
  phone: string
  email?: string | null
  street?: string | null
  house_number?: string | null
  postal_code?: string | null
  city: string
  source?: string | null
  general_note?: string | null
}

export type Project = {
  id: string
  customer_id: string
  project_name: string
  project_address?: string | null
  postal_code?: string | null
  city: string
  request_date?: string | null
  measurement_date?: string | null
  status: string
  internal_note?: string | null
  customer_note?: string | null
  quote_status: string
}

export type ProductLine = {
  id: string
  project_id: string
  sort_order: number
  room: string
  product_type: string
  quantity: number
  width_mm?: number | null
  height_mm?: number | null
  color_category?: string | null
  standard_color?: string | null
  ral_code?: string | null
  mesh_type?: string | null
  bottom_profile?: string | null
  execution_description?: string | null
  attention_points?: string | null
  customer_note?: string | null
  suggested_price?: number | null
  manual_price: number
  subtotal?: number
}

export type Quote = {
  id: string
  project_id: string
  quote_number: string
  quote_date: string
  total_amount: number
  full_quote_text: string
  status: string
  pdf_url?: string | null
}


export type Appointment = {
  id: string
  project_id?: string | null
  customer_id?: string | null
  title: string
  appointment_type: string
  starts_at: string
  ends_at: string
  location?: string | null
  notes?: string | null
  status: string
}
