// Hand-written to match supabase/migrations/0001-0003. Field shapes verified
// empirically against the live schema (see Phase 1 signup-trigger test).
// If Supabase CLI ever becomes available, `supabase gen types typescript`
// against this schema should produce an equivalent shape.
//
// Every table needs `Relationships: []` and the schema needs sibling
// `Views`/`Functions` keys — @supabase/postgrest-js's GenericTable/
// GenericSchema constraints require them (see
// node_modules/@supabase/postgrest-js/src/types/common/common.ts). Omitting
// them doesn't error at this file — it silently breaks generic resolution
// everywhere `.from(...)` is called, surfacing as `never` deep in unrelated
// components. Learned this the hard way; don't drop these fields.

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled_refunded"
  | "cancelled_no_refund"
  | "expired"
  | "disputed";

export type UserRole = "client" | "practitioner";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          email: string;
          full_name: string;
          phone: string | null;
          date_of_birth: string;
          country: string;
          is_admin: boolean;
          consent_accepted_at: string;
          consent_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          email: string;
          full_name: string;
          phone?: string | null;
          date_of_birth: string;
          country: string;
          is_admin?: boolean;
          consent_accepted_at?: string;
          consent_version?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["profiles"]["Insert"], "id" | "role">
        >;
        Relationships: [];
      };
      practitioner_profiles: {
        Row: {
          profile_id: string;
          display_name: string | null;
          bio: string | null;
          photo_url: string | null;
          city: string | null;
          country: string | null;
          languages: string[];
          years_experience: number | null;
          timezone: string | null;
          is_published: boolean;
          avg_rating: number | null;
          review_count: number;
          stripe_connect_account_id: string | null;
          stripe_connect_onboarded: boolean;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          display_name?: string | null;
          bio?: string | null;
          photo_url?: string | null;
          city?: string | null;
          country?: string | null;
          languages?: string[];
          years_experience?: number | null;
          timezone?: string | null;
          is_published?: boolean;
          stripe_connect_account_id?: string | null;
          stripe_connect_onboarded?: boolean;
          onboarding_completed_at?: string | null;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["practitioner_profiles"]["Insert"], "profile_id">
        >;
        Relationships: [];
      };
      specialties: {
        Row: { id: number; name: string };
        Insert: { id?: number; name: string };
        Update: Partial<Database["public"]["Tables"]["specialties"]["Insert"]>;
        Relationships: [];
      };
      practitioner_specialties: {
        Row: { practitioner_id: string; specialty_id: number };
        Insert: { practitioner_id: string; specialty_id: number };
        Update: never;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          practitioner_id: string;
          title: string;
          description: string | null;
          duration_minutes: 15 | 30 | 45 | 60 | 90;
          price_usd: number;
          specialty_id: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          title: string;
          description?: string | null;
          duration_minutes: 15 | 30 | 45 | 60 | 90;
          price_usd: number;
          specialty_id?: number | null;
          is_active?: boolean;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["services"]["Insert"], "id" | "practitioner_id">
        >;
        Relationships: [];
      };
      availability_templates: {
        Row: {
          id: string;
          practitioner_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["availability_templates"]["Insert"], "id" | "practitioner_id">
        >;
        Relationships: [];
      };
      availability_blocks: {
        Row: {
          id: string;
          practitioner_id: string;
          blocked_date: string;
          start_time: string | null;
          end_time: string | null;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          blocked_date: string;
          start_time?: string | null;
          end_time?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          client_id: string;
          practitioner_id: string;
          service_id: string;
          status: BookingStatus;
          scheduled_start: string;
          scheduled_end: string;
          price_usd: number;
          platform_fee_usd: number;
          practitioner_payout_usd: number;
          pending_expires_at: string | null;
          stripe_payment_intent_id: string | null;
          stripe_charge_id: string | null;
          stripe_transfer_id: string | null;
          payout_eligible_at: string | null;
          payout_released_at: string | null;
          daily_room_name: string | null;
          daily_room_url: string | null;
          cancelled_by: "client" | "practitioner" | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        // Bookings are only ever written via API routes using the service-role
        // client (see 0001_init.sql — no client-side INSERT/UPDATE RLS policy).
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          client_id: string;
          practitioner_id: string;
          rating: 1 | 2 | 3 | 4 | 5;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          client_id: string;
          practitioner_id: string;
          rating: 1 | 2 | 3 | 4 | 5;
          comment: string;
        };
        Update: never;
        Relationships: [];
      };
      processed_webhook_events: {
        Row: { event_id: string; processed_at: string };
        Insert: { event_id: string };
        Update: never;
        Relationships: [];
      };
      gdpr_requests: {
        Row: {
          id: string;
          profile_id: string;
          request_type: "export" | "deletion";
          status: "pending" | "completed" | "failed";
          requested_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          request_type: "export" | "deletion";
          status?: "pending" | "completed" | "failed";
        };
        Update: Partial<
          Pick<Database["public"]["Tables"]["gdpr_requests"]["Row"], "status" | "completed_at">
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_practitioners_fuzzy: {
        Args: { search_term: string };
        Returns: { profile_id: string }[];
      };
      search_specialties_fuzzy: {
        Args: { search_term: string };
        Returns: { id: number }[];
      };
      search_services_fuzzy: {
        Args: { search_term: string };
        Returns: { service_id: string }[];
      };
    };
  };
}
