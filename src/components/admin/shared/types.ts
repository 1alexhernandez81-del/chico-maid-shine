export type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  service_type: string;
  sqft: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  frequency: string;
  preferred_date: string;
  preferred_time: string | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  estimate_date: string | null;
  estimate_time: string | null;
  google_calendar_event_id: string | null;
  confirmation_token: string | null;
  customer_id: string | null;
  total_price: number | null;
  line_items: any[] | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  invoice_url?: string | null;
  invoice_number?: number | null;
  photos?: string[] | null;
  confirmed_at?: string | null;
  assigned_cleaners?: string[] | null;
  assigned_cleaner_id?: string | null;
  accepted_by?: string | null;
};

export type LineItem = { description: string; amount: number };
export type Cleaner = { id: string; name: string; active: boolean };

export type JobTimeEntry = {
  id: string;
  booking_id: string;
  started_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  stopped_at: string | null;
  total_paused_minutes: number;
  total_worked_minutes: number;
  cleaners: string[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

