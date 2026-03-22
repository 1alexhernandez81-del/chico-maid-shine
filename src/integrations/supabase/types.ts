export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          admin_notes: string | null
          assigned_cleaners: string[] | null
          bathrooms: string | null
          bedrooms: string | null
          cancellation_fee: number | null
          cancelled_at: string | null
          city: string
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string | null
          email: string
          estimate_date: string | null
          estimate_time: string | null
          frequency: string
          google_calendar_event_id: string | null
          id: string
          invoice_number: number | null
          invoice_url: string | null
          line_items: Json | null
          name: string
          notes: string | null
          phone: string
          photos: string[] | null
          preferred_date: string
          preferred_time: string | null
          reminder_sent: boolean | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_type: string
          sqft: string | null
          status: string
          street: string
          total_price: number | null
          updated_at: string
          zip: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_cleaners?: string[] | null
          bathrooms?: string | null
          bedrooms?: string | null
          cancellation_fee?: number | null
          cancelled_at?: string | null
          city: string
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          email: string
          estimate_date?: string | null
          estimate_time?: string | null
          frequency: string
          google_calendar_event_id?: string | null
          id?: string
          invoice_number?: number | null
          invoice_url?: string | null
          line_items?: Json | null
          name: string
          notes?: string | null
          phone: string
          photos?: string[] | null
          preferred_date: string
          preferred_time?: string | null
          reminder_sent?: boolean | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_type: string
          sqft?: string | null
          status?: string
          street: string
          total_price?: number | null
          updated_at?: string
          zip: string
        }
        Update: {
          admin_notes?: string | null
          assigned_cleaners?: string[] | null
          bathrooms?: string | null
          bedrooms?: string | null
          cancellation_fee?: number | null
          cancelled_at?: string | null
          city?: string
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string
          estimate_date?: string | null
          estimate_time?: string | null
          frequency?: string
          google_calendar_event_id?: string | null
          id?: string
          invoice_number?: number | null
          invoice_url?: string | null
          line_items?: Json | null
          name?: string
          notes?: string | null
          phone?: string
          photos?: string[] | null
          preferred_date?: string
          preferred_time?: string | null
          reminder_sent?: boolean | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_type?: string
          sqft?: string | null
          status?: string
          street?: string
          total_price?: number | null
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaners: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_logs: {
        Row: {
          channel: string
          created_at: string
          id: string
          source_page: string | null
          user_agent: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          source_page?: string | null
          user_agent?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          source_page?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      customer_communications: {
        Row: {
          body: string | null
          booking_id: string | null
          created_at: string
          customer_id: string | null
          direction: string
          email_message_id: string | null
          id: string
          in_reply_to: string | null
          subject: string | null
          thread_id: string | null
          type: string
        }
        Insert: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          email_message_id?: string | null
          id?: string
          in_reply_to?: string | null
          subject?: string | null
          thread_id?: string | null
          type?: string
        }
        Update: {
          body?: string | null
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          email_message_id?: string | null
          id?: string
          in_reply_to?: string | null
          subject?: string | null
          thread_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string
          street: string
          updated_at: string
          zip: string
        }
        Insert: {
          city?: string
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          street?: string
          updated_at?: string
          zip?: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          street?: string
          updated_at?: string
          zip?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          id: string
          key: string
          request_count: number
          window_start: string
        }
        Insert: {
          id?: string
          key: string
          request_count?: number
          window_start?: string
        }
        Update: {
          id?: string
          key?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          active: boolean
          bathrooms: string | null
          bedrooms: string | null
          city: string
          created_at: string
          customer_id: string
          frequency: string
          id: string
          next_service_date: string | null
          notes: string | null
          preferred_day: string | null
          preferred_time: string | null
          price: number | null
          service_type: string
          sqft: string | null
          street: string
          updated_at: string
          zip: string
        }
        Insert: {
          active?: boolean
          bathrooms?: string | null
          bedrooms?: string | null
          city?: string
          created_at?: string
          customer_id: string
          frequency: string
          id?: string
          next_service_date?: string | null
          notes?: string | null
          preferred_day?: string | null
          preferred_time?: string | null
          price?: number | null
          service_type: string
          sqft?: string | null
          street?: string
          updated_at?: string
          zip?: string
        }
        Update: {
          active?: boolean
          bathrooms?: string | null
          bedrooms?: string | null
          city?: string
          created_at?: string
          customer_id?: string
          frequency?: string
          id?: string
          next_service_date?: string | null
          notes?: string | null
          preferred_day?: string | null
          preferred_time?: string | null
          price?: number | null
          service_type?: string
          sqft?: string | null
          street?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_quote_by_token: { Args: { _token: string }; Returns: Json }
      cancel_booking_by_token: { Args: { _token: string }; Returns: Json }
      confirm_booking_by_token: { Args: { _token: string }; Returns: boolean }
      get_booked_estimate_times: { Args: { _date: string }; Returns: string[] }
      get_booking_by_token: {
        Args: { _token: string }
        Returns: {
          bathrooms: string
          bedrooms: string
          city: string
          confirmed_at: string
          email: string
          frequency: string
          id: string
          name: string
          phone: string
          preferred_date: string
          preferred_time: string
          scheduled_date: string
          scheduled_time: string
          service_type: string
          sqft: string
          status: string
          street: string
          total_price: number
          zip: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
