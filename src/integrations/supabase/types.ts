export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          owner_id: string
          name: string
          slug: string
          category: string
          logo_url: string | null
          timezone: string
          country: string
          plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          slug: string
          category?: string
          logo_url?: string | null
          timezone?: string
          country?: string
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          slug?: string
          category?: string
          logo_url?: string | null
          timezone?: string
          country?: string
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      queue_entries: {
        Row: {
          id: string
          workspace_id: string
          token: string
          customer_name: string
          customer_phone: string | null
          service: string | null
          status: string
          joined_at: string
          served_at: string | null
          completed_at: string | null
          eta_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          token: string
          customer_name: string
          customer_phone?: string | null
          service?: string | null
          status?: string
          joined_at?: string
          served_at?: string | null
          completed_at?: string | null
          eta_minutes?: number
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          token?: string
          customer_name?: string
          customer_phone?: string | null
          service?: string | null
          status?: string
          joined_at?: string
          served_at?: string | null
          completed_at?: string | null
          eta_minutes?: number
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          workspace_id: string
          name: string
          date: string | null
          venue: string | null
          description: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          date?: string | null
          venue?: string | null
          description?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          date?: string | null
          venue?: string | null
          description?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          id: string
          event_id: string
          workspace_id: string
          name: string
          email: string | null
          phone: string | null
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          workspace_id: string
          name: string
          email?: string | null
          phone?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          workspace_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      feedback_entries: {
        Row: {
          id: string
          workspace_id: string
          customer_name: string
          customer_phone: string | null
          channel: string
          rating: number | null
          sentiment: string
          category: string | null
          text: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          customer_name: string
          customer_phone?: string | null
          channel?: string
          rating?: number | null
          sentiment?: string
          category?: string | null
          text?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          customer_name?: string
          customer_phone?: string | null
          channel?: string
          rating?: number | null
          sentiment?: string
          category?: string | null
          text?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          actor: string
          created_at: string
          id: string
          text: string
          workspace_id: string | null
        }
        Insert: {
          actor: string
          created_at?: string
          id?: string
          text: string
          workspace_id?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          id?: string
          text?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          severity: string
          title: string
          workspace_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          severity?: string
          title: string
          workspace_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          severity?: string
          title?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          id: string
          workspace_id: string
          trigger_event: string
          condition_config: Json
          action_type: string
          action_config: Json
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          trigger_event: string
          condition_config?: Json
          action_type: string
          action_config?: Json
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          trigger_event?: string
          condition_config?: Json
          action_type?: string
          action_config?: Json
          enabled?: boolean
          created_at?: string
        }
        Relationships: []
      }
      automation_executions: {
        Row: {
          id: string
          rule_id: string
          workspace_id: string
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rule_id: string
          workspace_id: string
          status: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rule_id?: string
          workspace_id?: string
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      whatsapp_configs: {
        Row: {
          workspace_id: string
          access_token: string | null
          phone_number_id: string | null
          business_account_id: string | null
          verify_token: string | null
          phone_number: string | null
          created_at: string
        }
        Insert: {
          workspace_id: string
          access_token?: string | null
          phone_number_id?: string | null
          business_account_id?: string | null
          verify_token?: string | null
          phone_number?: string | null
          created_at?: string
        }
        Update: {
          workspace_id?: string
          access_token?: string | null
          phone_number_id?: string | null
          business_account_id?: string | null
          verify_token?: string | null
          phone_number?: string | null
          created_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          id: string
          workspace_id: string
          phone: string
          direction: string
          message_type: string
          message: Json
          status: string
          meta_message_id: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          phone: string
          direction: string
          message_type: string
          message?: Json
          status?: string
          meta_message_id?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          phone?: string
          direction?: string
          message_type?: string
          message?: Json
          status?: string
          meta_message_id?: string | null
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
