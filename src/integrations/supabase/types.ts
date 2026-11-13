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
      admin_setup_attempts: {
        Row: {
          attempts: number
          key: string
          started_at: string
        }
        Insert: {
          attempts?: number
          key: string
          started_at?: string
        }
        Update: {
          attempts?: number
          key?: string
          started_at?: string
        }
        Relationships: []
      }
      admin_setup_state: {
        Row: {
          admin_user_id: string | null
          completed_at: string | null
          id: boolean
        }
        Insert: {
          admin_user_id?: string | null
          completed_at?: string | null
          id?: boolean
        }
        Update: {
          admin_user_id?: string | null
          completed_at?: string | null
          id?: boolean
        }
        Relationships: []
      }
      ai_gateway_feature_state: {
        Row: {
          access_blocked: boolean
          denial_message: string | null
          denied_at: string | null
          feature_key: string
        }
        Insert: {
          access_blocked?: boolean
          denial_message?: string | null
          denied_at?: string | null
          feature_key: string
        }
        Update: {
          access_blocked?: boolean
          denial_message?: string | null
          denied_at?: string | null
          feature_key?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: never
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: never
          user_id?: string | null
        }
        Relationships: []
      }
      bom_lines: {
        Row: {
          component_id: string
          created_at: string
          id: string
          note: string | null
          parent_id: string
          quantity: number
          revision: number
          unverified: boolean
        }
        Insert: {
          component_id: string
          created_at?: string
          id?: string
          note?: string | null
          parent_id: string
          quantity: number
          revision?: number
          unverified?: boolean
        }
        Update: {
          component_id?: string
          created_at?: string
          id?: string
          note?: string | null
          parent_id?: string
          quantity?: number
          revision?: number
          unverified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          name_hi: string | null
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_hi?: string | null
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_hi?: string | null
          sort?: number
        }
        Relationships: []
      }
      items: {
        Row: {
          approved: boolean
          available_stock: number
          bin_location: string | null
          category_id: string | null
          created_at: string
          damaged_stock: number
          description: string | null
          id: string
          image_url: string | null
          is_demo: boolean
          kind: Database["public"]["Enums"]["item_kind"]
          min_stock: number
          model: string | null
          name: string
          opening_stock: number
          reserved_stock: number
          sku: string
          sourcing: Database["public"]["Enums"]["sourcing_method"]
          specifications: string | null
          unit: string
          updated_at: string
          variant: string | null
          warehouse: string | null
        }
        Insert: {
          approved?: boolean
          available_stock?: number
          bin_location?: string | null
          category_id?: string | null
          created_at?: string
          damaged_stock?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["item_kind"]
          min_stock?: number
          model?: string | null
          name: string
          opening_stock?: number
          reserved_stock?: number
          sku: string
          sourcing?: Database["public"]["Enums"]["sourcing_method"]
          specifications?: string | null
          unit?: string
          updated_at?: string
          variant?: string | null
          warehouse?: string | null
        }
        Update: {
          approved?: boolean
          available_stock?: number
          bin_location?: string | null
          category_id?: string | null
          created_at?: string
          damaged_stock?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["item_kind"]
          min_stock?: number
          model?: string | null
          name?: string
          opening_stock?: number
          reserved_stock?: number
          sku?: string
          sourcing?: Database["public"]["Enums"]["sourcing_method"]
          specifications?: string | null
          unit?: string
          updated_at?: string
          variant?: string | null
          warehouse?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          item_id: string
          note: string | null
          quantity: number
          requested_by: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id: string
          note?: string | null
          quantity: number
          requested_by: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id?: string
          note?: string | null
          quantity?: number
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      stock_counts: {
        Row: {
          counted_by: string
          created_at: string
          difference: number
          id: string
          item_id: string
          note: string | null
          physical_qty: number
          reviewed_at: string | null
          reviewed_by: string | null
          system_qty: number
        }
        Insert: {
          counted_by: string
          created_at?: string
          difference: number
          id?: string
          item_id: string
          note?: string | null
          physical_qty: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          system_qty: number
        }
        Update: {
          counted_by?: string
          created_at?: string
          difference?: number
          id?: string
          item_id?: string
          note?: string | null
          physical_qty?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          system_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_counted_by_fkey"
            columns: ["counted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          balance_after: number
          created_at: string
          destination: string | null
          id: number
          item_id: string
          quantity: number
          reason: string | null
          reference: string | null
          source: string | null
          txn_type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          destination?: string | null
          id?: never
          item_id: string
          quantity: number
          reason?: string | null
          reference?: string | null
          source?: string | null
          txn_type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          destination?: string | null
          id?: never
          item_id?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          source?: string | null
          txn_type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
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
      website_leads: {
        Row: {
          created_at: string
          email: string | null
          external_id: string
          id: string
          message: string
          name: string
          phone: string | null
          product: string
          source: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          external_id: string
          id?: string
          message?: string
          name: string
          phone?: string | null
          product?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          external_id?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          product?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_admin_setup_attempt: { Args: { _key: string }; Returns: boolean }
      finish_admin_setup: {
        Args: { _name: string; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active: { Args: { _user_id: string }; Returns: boolean }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      onboard_product: { Args: { _payload: Json }; Returns: Json }
      post_stock_transaction: {
        Args: {
          _destination?: string
          _item_id: string
          _quantity: number
          _reason?: string
          _reference?: string
          _source?: string
          _type: Database["public"]["Enums"]["txn_type"]
        }
        Returns: number
      }
      record_production: {
        Args: { _product_id: string; _reference?: string; _units: number }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "warehouse_employee"
        | "production_employee"
        | "auditor"
      item_kind: "raw_material" | "component" | "assembly" | "finished"
      sourcing_method: "MAKE" | "BUY" | "SUBCONTRACT"
      txn_type:
        | "opening"
        | "receive"
        | "issue"
        | "transfer"
        | "production_consumption"
        | "production_return"
        | "damage"
        | "scrap"
        | "adjustment"
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
    Enums: {
      app_role: [
        "super_admin",
        "admin",
        "warehouse_employee",
        "production_employee",
        "auditor",
      ],
      item_kind: ["raw_material", "component", "assembly", "finished"],
      sourcing_method: ["MAKE", "BUY", "SUBCONTRACT"],
      txn_type: [
        "opening",
        "receive",
        "issue",
        "transfer",
        "production_consumption",
        "production_return",
        "damage",
        "scrap",
        "adjustment",
      ],
    },
  },
} as const
