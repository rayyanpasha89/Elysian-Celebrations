// Generated from the linked Supabase Postgres schema. Do not edit manually.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      "admin_audit_log": {
        Row:
        {
          "id": string
          "actor_user_id": string | null
          "action": string
          "entity_type": string | null
          "entity_id": string | null
          "summary": string | null
          "meta": Json | null
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "actor_user_id"?: string | null
          "action": string
          "entity_type"?: string | null
          "entity_id"?: string | null
          "summary"?: string | null
          "meta"?: Json | null
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "actor_user_id"?: string | null
          "action"?: string
          "entity_type"?: string | null
          "entity_id"?: string | null
          "summary"?: string | null
          "meta"?: Json | null
          "created_at"?: string
        }
        Relationships: [
        ]
      }
      "api_rate_limits": {
        Row:
        {
          "key_hash": string
          "bucket_started_at": string
          "request_count": number
          "updated_at": string
        }
        Insert:
        {
          "key_hash": string
          "bucket_started_at": string
          "request_count"?: number
          "updated_at"?: string
        }
        Update:
        {
          "key_hash"?: string
          "bucket_started_at"?: string
          "request_count"?: number
          "updated_at"?: string
        }
        Relationships: [
        ]
      }
      "blog_posts": {
        Row:
        {
          "id": string
          "title": string
          "slug": string
          "excerpt": string | null
          "content": string
          "cover_image": string | null
          "author": string
          "tags": string[] | null
          "is_published": boolean
          "published_at": string | null
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "title": string
          "slug": string
          "excerpt"?: string | null
          "content": string
          "cover_image"?: string | null
          "author": string
          "tags"?: string[] | null
          "is_published"?: boolean
          "published_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "title"?: string
          "slug"?: string
          "excerpt"?: string | null
          "content"?: string
          "cover_image"?: string | null
          "author"?: string
          "tags"?: string[] | null
          "is_published"?: boolean
          "published_at"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
        ]
      }
      "bookings": {
        Row:
        {
          "id": string
          "client_profile_id": string
          "vendor_profile_id": string
          "vendor_service_id": string | null
          "wedding_event_id": string | null
          "status": Database["public"]["Enums"]["booking_status"]
          "event_date": string | null
          "total_amount": number | null
          "paid_amount": number
          "notes": string | null
          "created_at": string
          "updated_at": string
          "vendor_cost": number | null
          "final_price": number | null
          "price_published": boolean
          "vendor_amount": number | null
          "service_fee": number | null
        }
        Insert:
        {
          "id"?: string
          "client_profile_id": string
          "vendor_profile_id": string
          "vendor_service_id"?: string | null
          "wedding_event_id"?: string | null
          "status"?: Database["public"]["Enums"]["booking_status"]
          "event_date"?: string | null
          "total_amount"?: number | null
          "paid_amount"?: number
          "notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "vendor_cost"?: number | null
          "final_price"?: number | null
          "price_published"?: boolean
          "vendor_amount"?: number | null
          "service_fee"?: never
        }
        Update:
        {
          "id"?: string
          "client_profile_id"?: string
          "vendor_profile_id"?: string
          "vendor_service_id"?: string | null
          "wedding_event_id"?: string | null
          "status"?: Database["public"]["Enums"]["booking_status"]
          "event_date"?: string | null
          "total_amount"?: number | null
          "paid_amount"?: number
          "notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
          "vendor_cost"?: number | null
          "final_price"?: number | null
          "price_published"?: boolean
          "vendor_amount"?: number | null
          "service_fee"?: never
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_service_id_fkey"
            columns: ["vendor_service_id"]
            isOneToOne: false
            referencedRelation: "vendor_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_wedding_event_id_fkey"
            columns: ["wedding_event_id"]
            isOneToOne: false
            referencedRelation: "wedding_events"
            referencedColumns: ["id"]
          },
        ]
      }
      "budget_categories": {
        Row:
        {
          "id": string
          "budget_id": string
          "name": string
          "allocated": number
          "sort_order": number
        }
        Insert:
        {
          "id"?: string
          "budget_id": string
          "name": string
          "allocated"?: number
          "sort_order"?: number
        }
        Update:
        {
          "id"?: string
          "budget_id"?: string
          "name"?: string
          "allocated"?: number
          "sort_order"?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      "budget_items": {
        Row:
        {
          "id": string
          "budget_category_id": string
          "name": string
          "estimated_cost": number
          "actual_cost": number | null
          "quantity": number
          "is_paid": boolean
          "notes": string | null
          "sort_order": number
          "wedding_event_id": string | null
        }
        Insert:
        {
          "id"?: string
          "budget_category_id": string
          "name": string
          "estimated_cost"?: number
          "actual_cost"?: number | null
          "quantity"?: number
          "is_paid"?: boolean
          "notes"?: string | null
          "sort_order"?: number
          "wedding_event_id"?: string | null
        }
        Update:
        {
          "id"?: string
          "budget_category_id"?: string
          "name"?: string
          "estimated_cost"?: number
          "actual_cost"?: number | null
          "quantity"?: number
          "is_paid"?: boolean
          "notes"?: string | null
          "sort_order"?: number
          "wedding_event_id"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_wedding_event_id_fkey"
            columns: ["wedding_event_id"]
            isOneToOne: false
            referencedRelation: "wedding_events"
            referencedColumns: ["id"]
          },
        ]
      }
      "budgets": {
        Row:
        {
          "id": string
          "client_profile_id": string
          "name": string
          "total_budget": number
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "client_profile_id": string
          "name"?: string
          "total_budget": number
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "client_profile_id"?: string
          "name"?: string
          "total_budget"?: number
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "client_profiles": {
        Row:
        {
          "id": string
          "user_id": string
          "partner_name": string | null
          "wedding_date": string | null
          "estimated_budget": number | null
          "guest_count": number | null
          "notes": string | null
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "user_id": string
          "partner_name"?: string | null
          "wedding_date"?: string | null
          "estimated_budget"?: number | null
          "guest_count"?: number | null
          "notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "user_id"?: string
          "partner_name"?: string | null
          "wedding_date"?: string | null
          "estimated_budget"?: number | null
          "guest_count"?: number | null
          "notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      "contact_inquiries": {
        Row:
        {
          "id": string
          "client_profile_id": string | null
          "name": string
          "email": string
          "phone": string | null
          "destination": string | null
          "wedding_date": string | null
          "guest_count": string | null
          "message": string
          "status": Database["public"]["Enums"]["inquiry_status"]
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "client_profile_id"?: string | null
          "name": string
          "email": string
          "phone"?: string | null
          "destination"?: string | null
          "wedding_date"?: string | null
          "guest_count"?: string | null
          "message": string
          "status"?: Database["public"]["Enums"]["inquiry_status"]
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "client_profile_id"?: string | null
          "name"?: string
          "email"?: string
          "phone"?: string | null
          "destination"?: string | null
          "wedding_date"?: string | null
          "guest_count"?: string | null
          "message"?: string
          "status"?: Database["public"]["Enums"]["inquiry_status"]
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_inquiries_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "destinations": {
        Row:
        {
          "id": string
          "name": string
          "slug": string
          "country": string
          "tagline": string | null
          "description": string | null
          "hero_image": string | null
          "gallery": string[] | null
          "starting_price": number | null
          "venue_count": number
          "is_active": boolean
          "sort_order": number
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "name": string
          "slug": string
          "country": string
          "tagline"?: string | null
          "description"?: string | null
          "hero_image"?: string | null
          "gallery"?: string[] | null
          "starting_price"?: number | null
          "venue_count"?: number
          "is_active"?: boolean
          "sort_order"?: number
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "name"?: string
          "slug"?: string
          "country"?: string
          "tagline"?: string | null
          "description"?: string | null
          "hero_image"?: string | null
          "gallery"?: string[] | null
          "starting_price"?: number | null
          "venue_count"?: number
          "is_active"?: boolean
          "sort_order"?: number
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
        ]
      }
      "guest_lists": {
        Row:
        {
          "id": string
          "client_profile_id": string
          "name": string
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "client_profile_id": string
          "name"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "client_profile_id"?: string
          "name"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_lists_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "guests": {
        Row:
        {
          "id": string
          "guest_list_id": string
          "name": string
          "email": string | null
          "phone": string | null
          "side": Database["public"]["Enums"]["guest_side"]
          "rsvp_status": Database["public"]["Enums"]["rsvp_status"]
          "meal_pref": string | null
          "plus_one": boolean
          "table_number": number | null
          "notes": string | null
        }
        Insert:
        {
          "id"?: string
          "guest_list_id": string
          "name": string
          "email"?: string | null
          "phone"?: string | null
          "side"?: Database["public"]["Enums"]["guest_side"]
          "rsvp_status"?: Database["public"]["Enums"]["rsvp_status"]
          "meal_pref"?: string | null
          "plus_one"?: boolean
          "table_number"?: number | null
          "notes"?: string | null
        }
        Update:
        {
          "id"?: string
          "guest_list_id"?: string
          "name"?: string
          "email"?: string | null
          "phone"?: string | null
          "side"?: Database["public"]["Enums"]["guest_side"]
          "rsvp_status"?: Database["public"]["Enums"]["rsvp_status"]
          "meal_pref"?: string | null
          "plus_one"?: boolean
          "table_number"?: number | null
          "notes"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_guest_list_id_fkey"
            columns: ["guest_list_id"]
            isOneToOne: false
            referencedRelation: "guest_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      "message_thread_reads": {
        Row:
        {
          "id": string
          "booking_id": string
          "user_id": string
          "read_at": string
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "booking_id": string
          "user_id": string
          "read_at"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "booking_id"?: string
          "user_id"?: string
          "read_at"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_thread_reads_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_thread_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      "messages": {
        Row:
        {
          "id": string
          "sender_id": string
          "booking_id": string
          "content": string
          "is_read": boolean
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "sender_id": string
          "booking_id": string
          "content": string
          "is_read"?: boolean
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "sender_id"?: string
          "booking_id"?: string
          "content"?: string
          "is_read"?: boolean
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      "mood_board_items": {
        Row:
        {
          "id": string
          "mood_board_id": string
          "image_url": string
          "caption": string | null
          "source_url": string | null
          "sort_order": number
          "category": string
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "mood_board_id": string
          "image_url": string
          "caption"?: string | null
          "source_url"?: string | null
          "sort_order"?: number
          "category"?: string
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "mood_board_id"?: string
          "image_url"?: string
          "caption"?: string | null
          "source_url"?: string | null
          "sort_order"?: number
          "category"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_board_items_mood_board_id_fkey"
            columns: ["mood_board_id"]
            isOneToOne: false
            referencedRelation: "mood_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      "mood_boards": {
        Row:
        {
          "id": string
          "client_profile_id": string
          "name": string
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "client_profile_id": string
          "name"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "client_profile_id"?: string
          "name"?: string
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_boards_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "negotiation_entries": {
        Row:
        {
          "id": string
          "booking_id": string
          "stage": string
          "amount": number | null
          "note": string | null
          "created_by": string | null
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "booking_id": string
          "stage"?: string
          "amount"?: number | null
          "note"?: string | null
          "created_by"?: string | null
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "booking_id"?: string
          "stage"?: string
          "amount"?: number | null
          "note"?: string | null
          "created_by"?: string | null
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      "notifications": {
        Row:
        {
          "id": string
          "user_id": string
          "type": Database["public"]["Enums"]["notification_type"]
          "title": string
          "message": string
          "link": string | null
          "is_read": boolean
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "user_id": string
          "type": Database["public"]["Enums"]["notification_type"]
          "title": string
          "message": string
          "link"?: string | null
          "is_read"?: boolean
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "user_id"?: string
          "type"?: Database["public"]["Enums"]["notification_type"]
          "title"?: string
          "message"?: string
          "link"?: string | null
          "is_read"?: boolean
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      "package_tiers": {
        Row:
        {
          "id": string
          "name": string
          "slug": string
          "tagline": string | null
          "description": string | null
          "starting_price": number
          "inclusions": string[] | null
          "sort_order": number
          "is_active": boolean
        }
        Insert:
        {
          "id"?: string
          "name": string
          "slug": string
          "tagline"?: string | null
          "description"?: string | null
          "starting_price": number
          "inclusions"?: string[] | null
          "sort_order"?: number
          "is_active"?: boolean
        }
        Update:
        {
          "id"?: string
          "name"?: string
          "slug"?: string
          "tagline"?: string | null
          "description"?: string | null
          "starting_price"?: number
          "inclusions"?: string[] | null
          "sort_order"?: number
          "is_active"?: boolean
        }
        Relationships: [
        ]
      }
      "payments": {
        Row:
        {
          "id": string
          "kind": string
          "client_profile_id": string | null
          "vendor_profile_id": string | null
          "wedding_id": string | null
          "booking_id": string | null
          "label": string | null
          "amount": number
          "due_date": string | null
          "is_paid": boolean
          "paid_at": string | null
          "method": string | null
          "sort_order": number
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "kind": string
          "client_profile_id"?: string | null
          "vendor_profile_id"?: string | null
          "wedding_id"?: string | null
          "booking_id"?: string | null
          "label"?: string | null
          "amount"?: number
          "due_date"?: string | null
          "is_paid"?: boolean
          "paid_at"?: string | null
          "method"?: string | null
          "sort_order"?: number
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "kind"?: string
          "client_profile_id"?: string | null
          "vendor_profile_id"?: string | null
          "wedding_id"?: string | null
          "booking_id"?: string | null
          "label"?: string | null
          "amount"?: number
          "due_date"?: string | null
          "is_paid"?: boolean
          "paid_at"?: string | null
          "method"?: string | null
          "sort_order"?: number
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      "reviews": {
        Row:
        {
          "id": string
          "client_profile_id": string
          "vendor_profile_id": string
          "rating": number
          "title": string | null
          "content": string | null
          "is_published": boolean
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "client_profile_id": string
          "vendor_profile_id": string
          "rating": number
          "title"?: string | null
          "content"?: string | null
          "is_published"?: boolean
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "client_profile_id"?: string
          "vendor_profile_id"?: string
          "rating"?: number
          "title"?: string | null
          "content"?: string | null
          "is_published"?: boolean
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "saved_vendors": {
        Row:
        {
          "id": string
          "client_profile_id": string
          "vendor_profile_id": string
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "client_profile_id": string
          "vendor_profile_id": string
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "client_profile_id"?: string
          "vendor_profile_id"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_vendors_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_vendors_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "testimonials": {
        Row:
        {
          "id": string
          "couple_name": string
          "destination": string
          "quote": string
          "image": string | null
          "is_published": boolean
          "sort_order": number
        }
        Insert:
        {
          "id"?: string
          "couple_name": string
          "destination": string
          "quote": string
          "image"?: string | null
          "is_published"?: boolean
          "sort_order"?: number
        }
        Update:
        {
          "id"?: string
          "couple_name"?: string
          "destination"?: string
          "quote"?: string
          "image"?: string | null
          "is_published"?: boolean
          "sort_order"?: number
        }
        Relationships: [
        ]
      }
      "timeline_items": {
        Row:
        {
          "id": string
          "wedding_id": string
          "title": string
          "description": string | null
          "due_date": string | null
          "is_completed": boolean
          "sort_order": number
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "wedding_id": string
          "title": string
          "description"?: string | null
          "due_date"?: string | null
          "is_completed"?: boolean
          "sort_order"?: number
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "wedding_id"?: string
          "title"?: string
          "description"?: string | null
          "due_date"?: string | null
          "is_completed"?: boolean
          "sort_order"?: number
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      "users": {
        Row:
        {
          "id": string
          "email": string
          "name": string
          "phone": string | null
          "avatar": string | null
          "role": Database["public"]["Enums"]["user_role"]
          "is_active": boolean
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id": string
          "email": string
          "name": string
          "phone"?: string | null
          "avatar"?: string | null
          "role"?: Database["public"]["Enums"]["user_role"]
          "is_active"?: boolean
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "email"?: string
          "name"?: string
          "phone"?: string | null
          "avatar"?: string | null
          "role"?: Database["public"]["Enums"]["user_role"]
          "is_active"?: boolean
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
        ]
      }
      "vendor_categories": {
        Row:
        {
          "id": string
          "name": string
          "slug": string
          "description": string | null
          "sort_order": number
        }
        Insert:
        {
          "id"?: string
          "name": string
          "slug": string
          "description"?: string | null
          "sort_order"?: number
        }
        Update:
        {
          "id"?: string
          "name"?: string
          "slug"?: string
          "description"?: string | null
          "sort_order"?: number
        }
        Relationships: [
        ]
      }
      "vendor_destinations": {
        Row:
        {
          "vendor_profile_id": string
          "destination_id": string
        }
        Insert:
        {
          "vendor_profile_id": string
          "destination_id": string
        }
        Update:
        {
          "vendor_profile_id"?: string
          "destination_id"?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_destinations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_destinations_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "vendor_media_quota_reservations": {
        Row:
        {
          "reservation_id": string
          "vendor_profile_id": string
          "reserved_bytes": number
          "expires_at": string
          "created_at": string
        }
        Insert:
        {
          "reservation_id": string
          "vendor_profile_id": string
          "reserved_bytes": number
          "expires_at": string
          "created_at"?: string
        }
        Update:
        {
          "reservation_id"?: string
          "vendor_profile_id"?: string
          "reserved_bytes"?: number
          "expires_at"?: string
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_media_quota_reservations_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "vendor_profile_views": {
        Row:
        {
          "id": string
          "vendor_profile_id": string
          "viewer_user_id": string | null
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "vendor_profile_id": string
          "viewer_user_id"?: string | null
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "vendor_profile_id"?: string
          "viewer_user_id"?: string | null
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_profile_views_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_profile_views_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      "vendor_profiles": {
        Row:
        {
          "id": string
          "user_id": string | null
          "business_name": string
          "slug": string
          "category_id": string | null
          "description": string | null
          "short_bio": string | null
          "cover_image": string | null
          "portfolio": string[] | null
          "city": string | null
          "state": string | null
          "country": string
          "experience": number | null
          "is_verified": boolean
          "is_featured": boolean
          "rating": number
          "review_count": number
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "user_id"?: string | null
          "business_name": string
          "slug": string
          "category_id"?: string | null
          "description"?: string | null
          "short_bio"?: string | null
          "cover_image"?: string | null
          "portfolio"?: string[] | null
          "city"?: string | null
          "state"?: string | null
          "country"?: string
          "experience"?: number | null
          "is_verified"?: boolean
          "is_featured"?: boolean
          "rating"?: number
          "review_count"?: number
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "user_id"?: string | null
          "business_name"?: string
          "slug"?: string
          "category_id"?: string | null
          "description"?: string | null
          "short_bio"?: string | null
          "cover_image"?: string | null
          "portfolio"?: string[] | null
          "city"?: string | null
          "state"?: string | null
          "country"?: string
          "experience"?: number | null
          "is_verified"?: boolean
          "is_featured"?: boolean
          "rating"?: number
          "review_count"?: number
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      "vendor_service_items": {
        Row:
        {
          "id": string
          "vendor_service_id": string
          "item_type": string
          "name": string
          "description": string | null
          "dietary_tags": string[]
          "sort_order": number
          "created_at": string
          "image_urls": string[]
          "reference_url": string | null
        }
        Insert:
        {
          "id"?: string
          "vendor_service_id": string
          "item_type"?: string
          "name": string
          "description"?: string | null
          "dietary_tags"?: string[]
          "sort_order"?: number
          "created_at"?: string
          "image_urls"?: string[]
          "reference_url"?: string | null
        }
        Update:
        {
          "id"?: string
          "vendor_service_id"?: string
          "item_type"?: string
          "name"?: string
          "description"?: string | null
          "dietary_tags"?: string[]
          "sort_order"?: number
          "created_at"?: string
          "image_urls"?: string[]
          "reference_url"?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_service_items_vendor_service_id_fkey"
            columns: ["vendor_service_id"]
            isOneToOne: false
            referencedRelation: "vendor_services"
            referencedColumns: ["id"]
          },
        ]
      }
      "vendor_services": {
        Row:
        {
          "id": string
          "vendor_profile_id": string
          "name": string
          "description": string | null
          "base_price": number
          "max_price": number | null
          "unit": string | null
          "is_active": boolean
          "service_scope": string | null
          "event_type_fit": string[]
          "inclusions": string[]
          "deliverables": string[]
          "add_ons": string[]
        }
        Insert:
        {
          "id"?: string
          "vendor_profile_id": string
          "name": string
          "description"?: string | null
          "base_price": number
          "max_price"?: number | null
          "unit"?: string | null
          "is_active"?: boolean
          "service_scope"?: string | null
          "event_type_fit"?: string[]
          "inclusions"?: string[]
          "deliverables"?: string[]
          "add_ons"?: string[]
        }
        Update:
        {
          "id"?: string
          "vendor_profile_id"?: string
          "name"?: string
          "description"?: string | null
          "base_price"?: number
          "max_price"?: number | null
          "unit"?: string | null
          "is_active"?: boolean
          "service_scope"?: string | null
          "event_type_fit"?: string[]
          "inclusions"?: string[]
          "deliverables"?: string[]
          "add_ons"?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "vendor_services_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      "venues": {
        Row:
        {
          "id": string
          "destination_id": string
          "name": string
          "slug": string
          "description": string | null
          "address": string | null
          "capacity": number | null
          "price_range": string | null
          "hero_image": string | null
          "gallery": string[] | null
          "amenities": string[] | null
          "is_active": boolean
        }
        Insert:
        {
          "id"?: string
          "destination_id": string
          "name": string
          "slug": string
          "description"?: string | null
          "address"?: string | null
          "capacity"?: number | null
          "price_range"?: string | null
          "hero_image"?: string | null
          "gallery"?: string[] | null
          "amenities"?: string[] | null
          "is_active"?: boolean
        }
        Update:
        {
          "id"?: string
          "destination_id"?: string
          "name"?: string
          "slug"?: string
          "description"?: string | null
          "address"?: string | null
          "capacity"?: number | null
          "price_range"?: string | null
          "hero_image"?: string | null
          "gallery"?: string[] | null
          "amenities"?: string[] | null
          "is_active"?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "venues_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      "wedding_days": {
        Row:
        {
          "id": string
          "wedding_id": string
          "name": string
          "date": string | null
          "notes": string | null
          "sort_order": number
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "wedding_id": string
          "name": string
          "date"?: string | null
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "wedding_id"?: string
          "name"?: string
          "date"?: string | null
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_days_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      "wedding_event_logistics": {
        Row:
        {
          "id": string
          "wedding_event_id": string
          "guest_arrival_time": string | null
          "vendor_load_in_time": string | null
          "family_call_time": string | null
          "transport_notes": string | null
          "rooming_notes": string | null
          "weather_plan": string | null
          "ceremony_notes": string | null
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "wedding_event_id": string
          "guest_arrival_time"?: string | null
          "vendor_load_in_time"?: string | null
          "family_call_time"?: string | null
          "transport_notes"?: string | null
          "rooming_notes"?: string | null
          "weather_plan"?: string | null
          "ceremony_notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "wedding_event_id"?: string
          "guest_arrival_time"?: string | null
          "vendor_load_in_time"?: string | null
          "family_call_time"?: string | null
          "transport_notes"?: string | null
          "rooming_notes"?: string | null
          "weather_plan"?: string | null
          "ceremony_notes"?: string | null
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_event_logistics_wedding_event_id_fkey"
            columns: ["wedding_event_id"]
            isOneToOne: true
            referencedRelation: "wedding_events"
            referencedColumns: ["id"]
          },
        ]
      }
      "wedding_event_menu_items": {
        Row:
        {
          "id": string
          "menu_id": string
          "name": string
          "course": string | null
          "dietary_tags": string[]
          "notes": string | null
          "sort_order": number
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "menu_id": string
          "name": string
          "course"?: string | null
          "dietary_tags"?: string[]
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "menu_id"?: string
          "name"?: string
          "course"?: string | null
          "dietary_tags"?: string[]
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_event_menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "wedding_event_menus"
            referencedColumns: ["id"]
          },
        ]
      }
      "wedding_event_menus": {
        Row:
        {
          "id": string
          "wedding_event_id": string
          "name": string
          "meal_period": string | null
          "service_style": string | null
          "notes": string | null
          "sort_order": number
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "wedding_event_id": string
          "name"?: string
          "meal_period"?: string | null
          "service_style"?: string | null
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "wedding_event_id"?: string
          "name"?: string
          "meal_period"?: string | null
          "service_style"?: string | null
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_event_menus_wedding_event_id_fkey"
            columns: ["wedding_event_id"]
            isOneToOne: false
            referencedRelation: "wedding_events"
            referencedColumns: ["id"]
          },
        ]
      }
      "wedding_event_requirements": {
        Row:
        {
          "id": string
          "wedding_event_id": string
          "category": string
          "title": string
          "status": string
          "priority": string
          "vendor_profile_id": string | null
          "vendor_service_id": string | null
          "payload": Json
          "notes": string | null
          "sort_order": number
          "created_at": string
          "updated_at": string
        }
        Insert:
        {
          "id"?: string
          "wedding_event_id": string
          "category": string
          "title"?: string
          "status"?: string
          "priority"?: string
          "vendor_profile_id"?: string | null
          "vendor_service_id"?: string | null
          "payload"?: Json
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
          "updated_at"?: string
        }
        Update:
        {
          "id"?: string
          "wedding_event_id"?: string
          "category"?: string
          "title"?: string
          "status"?: string
          "priority"?: string
          "vendor_profile_id"?: string | null
          "vendor_service_id"?: string | null
          "payload"?: Json
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
          "updated_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_event_requirements_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_event_requirements_vendor_service_id_fkey"
            columns: ["vendor_service_id"]
            isOneToOne: false
            referencedRelation: "vendor_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_event_requirements_wedding_event_id_fkey"
            columns: ["wedding_event_id"]
            isOneToOne: false
            referencedRelation: "wedding_events"
            referencedColumns: ["id"]
          },
        ]
      }
      "wedding_event_tasks": {
        Row:
        {
          "id": string
          "wedding_event_id": string
          "title": string
          "owner": string | null
          "status": string
          "due_date": string | null
          "sort_order": number
          "created_at": string
        }
        Insert:
        {
          "id"?: string
          "wedding_event_id": string
          "title": string
          "owner"?: string | null
          "status"?: string
          "due_date"?: string | null
          "sort_order"?: number
          "created_at"?: string
        }
        Update:
        {
          "id"?: string
          "wedding_event_id"?: string
          "title"?: string
          "owner"?: string | null
          "status"?: string
          "due_date"?: string | null
          "sort_order"?: number
          "created_at"?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_event_tasks_wedding_event_id_fkey"
            columns: ["wedding_event_id"]
            isOneToOne: false
            referencedRelation: "wedding_events"
            referencedColumns: ["id"]
          },
        ]
      }
      "wedding_events": {
        Row:
        {
          "id": string
          "wedding_id": string
          "name": string
          "date": string | null
          "venue": string | null
          "notes": string | null
          "sort_order": number
          "created_at": string
          "wedding_day_id": string | null
          "event_type": string | null
          "start_time": string | null
          "end_time": string | null
          "guest_count": number | null
          "estimated_budget": number | null
          "food_style": string | null
          "food_preferences": string[]
          "menu_notes": string | null
          "decor_style": string | null
          "decor_notes": string | null
          "attire_notes": string | null
          "time_block": string | null
          "requirement_payload": Json
        }
        Insert:
        {
          "id"?: string
          "wedding_id": string
          "name": string
          "date"?: string | null
          "venue"?: string | null
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
          "wedding_day_id"?: string | null
          "event_type"?: string | null
          "start_time"?: string | null
          "end_time"?: string | null
          "guest_count"?: number | null
          "estimated_budget"?: number | null
          "food_style"?: string | null
          "food_preferences"?: string[]
          "menu_notes"?: string | null
          "decor_style"?: string | null
          "decor_notes"?: string | null
          "attire_notes"?: string | null
          "time_block"?: string | null
          "requirement_payload"?: Json
        }
        Update:
        {
          "id"?: string
          "wedding_id"?: string
          "name"?: string
          "date"?: string | null
          "venue"?: string | null
          "notes"?: string | null
          "sort_order"?: number
          "created_at"?: string
          "wedding_day_id"?: string | null
          "event_type"?: string | null
          "start_time"?: string | null
          "end_time"?: string | null
          "guest_count"?: number | null
          "estimated_budget"?: number | null
          "food_style"?: string | null
          "food_preferences"?: string[]
          "menu_notes"?: string | null
          "decor_style"?: string | null
          "decor_notes"?: string | null
          "attire_notes"?: string | null
          "time_block"?: string | null
          "requirement_payload"?: Json
        }
        Relationships: [
          {
            foreignKeyName: "wedding_events_wedding_day_id_fkey"
            columns: ["wedding_day_id"]
            isOneToOne: false
            referencedRelation: "wedding_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedding_events_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      "weddings": {
        Row:
        {
          "id": string
          "client_profile_id": string
          "name": string
          "date": string | null
          "destination_id": string | null
          "package_tier_id": string | null
          "status": Database["public"]["Enums"]["wedding_status"]
          "created_at": string
          "updated_at": string
          "event_type": string
          "custom_event_type": string | null
          "event_platform_version": number
          "definition_payload": Json
        }
        Insert:
        {
          "id"?: string
          "client_profile_id": string
          "name": string
          "date"?: string | null
          "destination_id"?: string | null
          "package_tier_id"?: string | null
          "status"?: Database["public"]["Enums"]["wedding_status"]
          "created_at"?: string
          "updated_at"?: string
          "event_type"?: string
          "custom_event_type"?: string | null
          "event_platform_version"?: number
          "definition_payload"?: Json
        }
        Update:
        {
          "id"?: string
          "client_profile_id"?: string
          "name"?: string
          "date"?: string | null
          "destination_id"?: string | null
          "package_tier_id"?: string | null
          "status"?: Database["public"]["Enums"]["wedding_status"]
          "created_at"?: string
          "updated_at"?: string
          "event_type"?: string
          "custom_event_type"?: string | null
          "event_platform_version"?: number
          "definition_payload"?: Json
        }
        Relationships: [
          {
            foreignKeyName: "weddings_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weddings_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weddings_package_tier_id_fkey"
            columns: ["package_tier_id"]
            isOneToOne: false
            referencedRelation: "package_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      "consume_api_rate_limit": {
        Args: {
          "p_key_hash": string
          "p_limit": number
          "p_window_seconds": number
        }
        Returns: {
          "allowed": boolean
          "remaining": number
          "reset_at": string
        }[]
      }
      "release_vendor_media_bytes": {
        Args: {
          "p_vendor_profile_id": string
          "p_reservation_id": string
        }
        Returns: undefined
      }
      "reserve_vendor_media_bytes": {
        Args: {
          "p_vendor_profile_id": string
          "p_reservation_id": string
          "p_bytes": number
          "p_quota_bytes": number
        }
        Returns: {
          "allowed": boolean
          "used_bytes": number
          "reserved_bytes": number
          "remaining_bytes": number
        }[]
      }
    }
    Enums: {
      "booking_status": "INQUIRY" | "QUOTE_SENT" | "CONFIRMED" | "DEPOSIT_PAID" | "COMPLETED" | "CANCELLED"
      "guest_side": "BRIDE" | "GROOM" | "COUPLE" | "MUTUAL"
      "inquiry_status": "NEW" | "CONTACTED" | "IN_PROGRESS" | "CONVERTED" | "CLOSED"
      "notification_type": "BOOKING_UPDATE" | "MESSAGE" | "REVIEW" | "PAYMENT" | "SYSTEM"
      "rsvp_status": "PENDING" | "CONFIRMED" | "DECLINED" | "MAYBE"
      "user_role": "CLIENT" | "VENDOR" | "ADMIN" | "MANAGER"
      "wedding_status": "PLANNING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
    }
    CompositeTypes: { [_ in never]: never }
  }
}
