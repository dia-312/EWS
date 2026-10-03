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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string
          store_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: string
          store_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          category_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          product_id: string | null
          search_query: string | null
          session_id: string | null
          store_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          product_id?: string | null
          search_query?: string | null
          session_id?: string | null
          store_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          product_id?: string | null
          search_query?: string | null
          session_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          active: boolean
          color: string | null
          display_order: number
          id: string
          key: string
          label_ar: string
          label_en: string | null
          store_id: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          display_order?: number
          id?: string
          key: string
          label_ar: string
          label_en?: string | null
          store_id: string
        }
        Update: {
          active?: boolean
          color?: string | null
          display_order?: number
          id?: string
          key?: string
          label_ar?: string
          label_en?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          active: boolean
          id: string
          logo_url: string | null
          name: string
          slug: string
          store_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          store_id: string
        }
        Update: {
          active?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description_ar: string | null
          description_en: string | null
          display_order: number
          icon: string | null
          id: string
          image_url: string | null
          name_ar: string
          name_en: string | null
          slug: string
          store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          name_ar: string
          name_en?: string | null
          slug: string
          store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          name_ar?: string
          name_en?: string | null
          slug?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_section_items: {
        Row: {
          category_id: string | null
          display_order: number
          id: string
          product_id: string | null
          section_id: string
        }
        Insert: {
          category_id?: string | null
          display_order?: number
          id?: string
          product_id?: string | null
          section_id: string
        }
        Update: {
          category_id?: string | null
          display_order?: number
          id?: string
          product_id?: string | null
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_section_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_section_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "homepage_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          active: boolean
          config: Json
          created_at: string
          display_order: number
          id: string
          store_id: string
          subtitle_ar: string | null
          subtitle_en: string | null
          title_ar: string | null
          title_en: string | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          config?: Json
          created_at?: string
          display_order?: number
          id?: string
          store_id: string
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string | null
          title_en?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          config?: Json
          created_at?: string
          display_order?: number
          id?: string
          store_id?: string
          subtitle_ar?: string | null
          subtitle_en?: string | null
          title_ar?: string | null
          title_en?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_sections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_subscriptions: {
        Row: {
          channel: string
          created_at: string
          destination: string
          id: string
          product_id: string
          status: string
          store_id: string
          type: string
        }
        Insert: {
          channel: string
          created_at?: string
          destination: string
          id?: string
          product_id: string
          status?: string
          store_id: string
          type: string
        }
        Update: {
          channel?: string
          created_at?: string
          destination?: string
          id?: string
          product_id?: string
          status?: string
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          active: boolean
          banner_image_url: string | null
          created_at: string
          end_at: string | null
          id: string
          new_price: number
          old_price: number | null
          product_id: string
          start_at: string | null
          store_id: string
          title_ar: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          banner_image_url?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          new_price: number
          old_price?: number | null
          product_id: string
          start_at?: string | null
          store_id: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          banner_image_url?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          new_price?: number
          old_price?: number | null
          product_id?: string
          start_at?: string | null
          store_id?: string
          title_ar?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_badges: {
        Row: {
          badge_id: string
          product_id: string
        }
        Insert: {
          badge_id: string
          product_id: string
        }
        Update: {
          badge_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_badges_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text_ar: string | null
          alt_text_en: string | null
          created_at: string
          display_order: number
          id: string
          is_primary: boolean
          product_id: string
          public_url: string | null
          storage_path: string
        }
        Insert: {
          alt_text_ar?: string | null
          alt_text_en?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          product_id: string
          public_url?: string | null
          storage_path: string
        }
        Update: {
          alt_text_ar?: string | null
          alt_text_en?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          product_id?: string
          public_url?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_specs: {
        Row: {
          display_order: number
          id: string
          product_id: string
          spec_key: string
          value_ar: string | null
          value_en: string | null
        }
        Insert: {
          display_order?: number
          id?: string
          product_id: string
          spec_key: string
          value_ar?: string | null
          value_en?: string | null
        }
        Update: {
          display_order?: number
          id?: string
          product_id?: string
          spec_key?: string
          value_ar?: string | null
          value_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          availability: string
          bestseller_manual: boolean
          brand_id: string | null
          category_id: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          featured: boolean
          id: string
          is_new_override: boolean | null
          name_ar: string
          name_en: string | null
          price: number
          search_aliases: string[]
          search_text: string
          short_description_ar: string | null
          short_description_en: string | null
          slug: string
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          availability?: string
          bestseller_manual?: boolean
          brand_id?: string | null
          category_id: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          featured?: boolean
          id?: string
          is_new_override?: boolean | null
          name_ar: string
          name_en?: string | null
          price: number
          search_aliases?: string[]
          search_text?: string
          short_description_ar?: string | null
          short_description_en?: string | null
          slug: string
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          availability?: string
          bestseller_manual?: boolean
          brand_id?: string | null
          category_id?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          featured?: boolean
          id?: string
          is_new_override?: boolean | null
          name_ar?: string
          name_en?: string | null
          price?: number
          search_aliases?: string[]
          search_text?: string
          short_description_ar?: string | null
          short_description_en?: string | null
          slug?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          about_text_ar: string | null
          about_text_en: string | null
          address_ar: string | null
          address_en: string | null
          facebook_url: string | null
          instagram_url: string | null
          map_url: string | null
          phone: string | null
          seo_description: string | null
          seo_title: string | null
          store_id: string
          updated_at: string
          whatsapp: string | null
          working_hours: Json
        }
        Insert: {
          about_text_ar?: string | null
          about_text_en?: string | null
          address_ar?: string | null
          address_en?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          map_url?: string | null
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
          store_id: string
          updated_at?: string
          whatsapp?: string | null
          working_hours?: Json
        }
        Update: {
          about_text_ar?: string | null
          about_text_en?: string | null
          address_ar?: string | null
          address_en?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          map_url?: string | null
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
          store_id?: string
          updated_at?: string
          whatsapp?: string | null
          working_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_theme: {
        Row: {
          accent_color: string | null
          font_key: string | null
          logo_variant: string | null
          preset: string
          primary_color: string | null
          radius: string | null
          secondary_color: string | null
          store_id: string
          surface_color: string | null
          text_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          font_key?: string | null
          logo_variant?: string | null
          preset?: string
          primary_color?: string | null
          radius?: string | null
          secondary_color?: string | null
          store_id: string
          surface_color?: string | null
          text_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          font_key?: string | null
          logo_variant?: string | null
          preset?: string
          primary_color?: string | null
          radius?: string | null
          secondary_color?: string | null
          store_id?: string
          surface_color?: string | null
          text_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_theme_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          is_active: boolean
          locale_default: string
          logo_url: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          locale_default?: string
          logo_url?: string | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          locale_default?: string
          logo_url?: string | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_store: { Args: { p_store: string }; Returns: boolean }
      is_store_member: { Args: { p_store: string }; Returns: boolean }
      normalize_search: { Args: { input: string }; Returns: string }
      search_products: {
        Args: {
          p_availability?: string[]
          p_brands?: string[]
          p_category?: string
          p_collection?: string
          p_ids?: string[]
          p_limit?: number
          p_locale?: string
          p_max?: number
          p_min?: number
          p_offset?: number
          p_on_sale?: boolean
          p_query?: string
          p_sort?: string
          p_store: string
        }
        Returns: {
          availability: string
          badge_keys: string[]
          bestseller: boolean
          brand_name: string
          category_name_ar: string
          category_name_en: string
          category_slug: string
          created_at: string
          featured: boolean
          id: string
          image_alt_ar: string
          image_alt_en: string
          image_url: string
          is_new: boolean
          name_ar: string
          name_en: string
          offer_ends_at: string
          offer_old_price: number
          offer_price: number
          price: number
          short_description_ar: string
          short_description_en: string
          slug: string
          total_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
