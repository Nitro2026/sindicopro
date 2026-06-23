export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          avatar_url: string | null
          role: 'owner' | 'collaborator'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          avatar_url?: string | null
          role?: 'owner' | 'collaborator'
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          email?: string
          avatar_url?: string | null
          role?: 'owner' | 'collaborator'
          updated_at?: string
        }
        Relationships: []
      }
      condominiums: {
        Row: {
          id: string
          owner_id: string
          name: string
          cnpj: string | null
          address: string | null
          city: string | null
          state: string | null
          units_count: number
          logo_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          cnpj?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          units_count?: number
          logo_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          cnpj?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          units_count?: number
          logo_url?: string | null
          active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_condominiums: {
        Row: {
          id: string
          user_id: string
          condo_id: string
          profile_type: 'financial' | 'councilor' | 'janitor' | 'concierge' | 'custom'
          invited_by: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          condo_id: string
          profile_type?: 'financial' | 'councilor' | 'janitor' | 'concierge' | 'custom'
          invited_by: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          profile_type?: 'financial' | 'councilor' | 'janitor' | 'concierge' | 'custom'
          accepted_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          id: string
          user_id: string
          condo_id: string
          module: 'financial' | 'providers' | 'collaborators' | 'audit' | 'reports' | 'condominiums'
          can_view: boolean
          can_create: boolean
          can_edit: boolean
          can_delete: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          condo_id: string
          module: 'financial' | 'providers' | 'collaborators' | 'audit' | 'reports' | 'condominiums'
          can_view?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_delete?: boolean
          created_at?: string
        }
        Update: {
          can_view?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_delete?: boolean
        }
        Relationships: []
      }
      account_categories: {
        Row: {
          id: string
          condo_id: string
          name: string
          type: 'expense' | 'revenue'
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          condo_id: string
          name: string
          type: 'expense' | 'revenue'
          color?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          type?: 'expense' | 'revenue'
          color?: string | null
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          id: string
          owner_id: string
          name: string
          cnpj: string | null
          type_of_service: string
          phone: string | null
          email: string | null
          status: 'active' | 'inactive' | 'blocked'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          cnpj?: string | null
          type_of_service: string
          phone?: string | null
          email?: string | null
          status?: 'active' | 'inactive' | 'blocked'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          cnpj?: string | null
          type_of_service?: string
          phone?: string | null
          email?: string | null
          status?: 'active' | 'inactive' | 'blocked'
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_contracts: {
        Row: {
          id: string
          provider_id: string
          condo_id: string
          description: string
          start_date: string
          end_date: string | null
          value: number
          readjustment_index: string | null
          readjustment_month: number | null
          status: 'active' | 'expired' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          condo_id: string
          description: string
          start_date: string
          end_date?: string | null
          value: number
          readjustment_index?: string | null
          readjustment_month?: number | null
          status?: 'active' | 'expired' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          description?: string
          start_date?: string
          end_date?: string | null
          value?: number
          readjustment_index?: string | null
          readjustment_month?: number | null
          status?: 'active' | 'expired' | 'cancelled'
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "provider_contracts_provider_id_fkey"; columns: ["provider_id"]; isOneToOne: false; referencedRelation: "service_providers"; referencedColumns: ["id"] },
          { foreignKeyName: "provider_contracts_condo_id_fkey"; columns: ["condo_id"]; isOneToOne: false; referencedRelation: "condominiums"; referencedColumns: ["id"] }
        ]
      }
      accounts: {
        Row: {
          id: string
          condo_id: string
          provider_id: string | null
          category_id: string | null
          description: string
          amount: number
          due_date: string
          paid_date: string | null
          status: 'pending' | 'paid' | 'overdue' | 'cancelled'
          is_recurring: boolean
          recurrence_rule: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual' | null
          recurrence_parent_id: string | null
          receipt_url: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          condo_id: string
          provider_id?: string | null
          category_id?: string | null
          description: string
          amount: number
          due_date: string
          paid_date?: string | null
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          is_recurring?: boolean
          recurrence_rule?: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual' | null
          recurrence_parent_id?: string | null
          receipt_url?: string | null
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider_id?: string | null
          category_id?: string | null
          description?: string
          amount?: number
          due_date?: string
          paid_date?: string | null
          status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
          is_recurring?: boolean
          recurrence_rule?: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual' | null
          receipt_url?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "accounts_condo_id_fkey"; columns: ["condo_id"]; isOneToOne: false; referencedRelation: "condominiums"; referencedColumns: ["id"] },
          { foreignKeyName: "accounts_provider_id_fkey"; columns: ["provider_id"]; isOneToOne: false; referencedRelation: "service_providers"; referencedColumns: ["id"] },
          { foreignKeyName: "accounts_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "account_categories"; referencedColumns: ["id"] },
          { foreignKeyName: "accounts_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          condo_id: string
          user_id: string
          module: string
          action: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout'
          record_id: string | null
          record_description: string | null
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          condo_id: string
          user_id: string
          module: string
          action: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout'
          record_id?: string | null
          record_description?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          { foreignKeyName: "audit_logs_condo_id_fkey"; columns: ["condo_id"]; isOneToOne: false; referencedRelation: "condominiums"; referencedColumns: ["id"] },
          { foreignKeyName: "audit_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      invitations: {
        Row: {
          id: string
          condo_id: string
          email: string
          profile_type: 'financial' | 'councilor' | 'janitor' | 'concierge' | 'custom'
          permissions: Json
          token: string
          invited_by: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          condo_id: string
          email: string
          profile_type: 'financial' | 'councilor' | 'janitor' | 'concierge' | 'custom'
          permissions: Json
          token: string
          invited_by: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          accepted_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_categories: {
        Args: { p_condo_id: string }
        Returns: void
      }
      update_overdue_accounts: {
        Args: Record<string, never>
        Returns: void
      }
      user_has_condo_access: {
        Args: { p_condo_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { p_condo_id: string; p_module: string; p_action: string }
        Returns: boolean
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

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Condominium = Database['public']['Tables']['condominiums']['Row']
export type UserCondominium = Database['public']['Tables']['user_condominiums']['Row']
export type Permission = Database['public']['Tables']['permissions']['Row']
export type AccountCategory = Database['public']['Tables']['account_categories']['Row']
export type ServiceProvider = Database['public']['Tables']['service_providers']['Row']
export type ProviderContract = Database['public']['Tables']['provider_contracts']['Row']
export type Account = Database['public']['Tables']['accounts']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']
