// Hand-maintained to match supabase/migrations. Regenerate with
// `npx supabase gen types typescript --project-id <id>` once the Supabase CLI is linked.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "admin" | "customer";
export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
export type PortfolioCategory =
  | "weddings"
  | "pre_wedding"
  | "events"
  | "commercial"
  | "social_reels"
  | "video_editing"
  | "photography";
export type MediaType = "image" | "video";
export type ServiceBookingMode = "timed" | "full_day";

export type DayHours = { open: string; close: string } | null;
/** ISO weekday ("1" = Monday ... "7" = Sunday) → hours, or null when closed. */
export type BusinessHours = Partial<Record<"1" | "2" | "3" | "4" | "5" | "6" | "7", DayHours>>;
export type SocialLinks = Partial<Record<"instagram" | "youtube" | "facebook" | "x" | "linkedin" | "vimeo", string>>;

export type Profile = { id: string; role: AppRole; created_at: string; updated_at: string };

export type BusinessSettings = {
  id: number;
  business_name: string;
  tagline: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  social_links: SocialLinks;
  business_hours: BusinessHours;
  timezone: string;
  currency: string;
  buffer_minutes: number;
  min_notice_hours: number;
  max_advance_days: number;
  allow_multiple_per_day: boolean;
  max_bookings_per_day: number | null;
  updated_at: string;
};

export type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number | null;
  price_is_starting: boolean;
  currency: string;
  duration_minutes: number;
  booking_mode: ServiceBookingMode;
  blocks_calendar: boolean;
  cover_image_url: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  category: PortfolioCategory;
  media_type: MediaType;
  media_url: string;
  thumbnail_url: string | null;
  alt_text: string;
  event_date: string | null;
  featured: boolean;
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

/** A portfolio entry as rendered: database rows, plus the extras local-library videos may carry. */
export type PortfolioDisplayItem = PortfolioItem & {
  /** Public post of this video (e.g. an Instagram reel). */
  social_url?: string | null;
  /** Owner-supplied view count label, e.g. "1M". */
  views_label?: string | null;
};

export type Booking = {
  id: string;
  booking_reference: string;
  customer_name: string;
  phone: string;
  email: string;
  service_id: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  budget: string | null;
  requirements: string | null;
  status: BookingStatus;
  admin_notes: string | null;
  starts_at: string;
  ends_at: string;
  occupied: string | null;
  consent_at: string;
  status_changed_at: string;
  confirmed_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingEvent = {
  id: number;
  booking_id: string;
  event_type: "created" | "status_changed" | "updated";
  from_status: BookingStatus | null;
  to_status: BookingStatus | null;
  actor_id: string | null;
  created_at: string;
};

export type AvailabilityBlock = {
  id: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  blocked: string;
  created_by: string | null;
  created_at: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  handled: boolean;
  created_at: string;
};

type Table<Row, Required extends keyof Row, Generated extends keyof Row = never> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required | Generated>>;
  Update: Partial<Omit<Row, Generated>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id">;
      business_settings: Table<BusinessSettings, never, "id">;
      services: Table<Service, "name" | "slug", "id" | "created_at" | "updated_at">;
      portfolio_items: Table<
        PortfolioItem,
        "title" | "category" | "media_type" | "media_url",
        "id" | "created_at" | "updated_at"
      >;
      bookings: Table<Booking, never, "id" | "booking_reference" | "created_at" | "consent_at">;
      booking_events: Table<BookingEvent, "booking_id" | "event_type", "id">;
      availability_blocks: Table<AvailabilityBlock, "start_date" | "end_date", "id" | "blocked" | "created_at">;
      contact_messages: Table<ContactMessage, "name" | "email" | "message", "id" | "created_at">;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      get_availability: { Args: { p_from: string; p_to: string }; Returns: Json };
      create_booking_request: {
        Args: {
          p_customer_name: string;
          p_phone: string;
          p_email: string;
          p_service_id: string;
          p_event_date: string;
          p_start_time: string | null;
          p_end_time: string | null;
          p_location: string;
          p_budget: string | null;
          p_requirements: string | null;
          p_consent: boolean;
        };
        Returns: Json;
      };
      submit_contact_message: {
        Args: { p_name: string; p_email: string; p_phone: string | null; p_message: string };
        Returns: string;
      };
      confirmed_bookings_outside_hours: {
        Args: Record<string, never>;
        Returns: { booking_reference: string; event_date: string; start_time: string | null; end_time: string | null }[];
      };
    };
    Enums: {
      app_role: AppRole;
      booking_status: BookingStatus;
      portfolio_category: PortfolioCategory;
      media_type: MediaType;
      service_booking_mode: ServiceBookingMode;
    };
    CompositeTypes: Record<string, never>;
  };
};
