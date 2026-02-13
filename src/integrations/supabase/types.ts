export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role_id: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          role_id?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          role_id?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          }
        ];
      };
      companies: {
        Row: {
          id: string;
          nome: string;
          razao_social: string;
          cnpj: string;
          regime: string;
          periodo_tipo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          razao_social: string;
          cnpj: string;
          regime: string;
          periodo_tipo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          razao_social?: string;
          cnpj?: string;
          regime?: string;
          periodo_tipo?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      regime_period_config: {
        Row: {
          id: string;
          regime: string;
          periodo_tipo: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          regime: string;
          periodo_tipo?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          regime?: string;
          periodo_tipo?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reinf_entries: {
        Row: {
          id: string;
          company_id: string;
          ano: number;
          trimestre: number;
          lucro_mes1: number;
          lucro_mes2: number;
          lucro_mes3: number;
          status: string;
          contabil_usuario_id: string | null;
          contabil_preenchido_em: string | null;
          dp_usuario_id: string | null;
          dp_aprovado_em: string | null;
          fiscal_usuario_id: string | null;
          fiscal_enviado_em: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          ano: number;
          trimestre: number;
          lucro_mes1?: number;
          lucro_mes2?: number;
          lucro_mes3?: number;
          status?: string;
          contabil_usuario_id?: string | null;
          contabil_preenchido_em?: string | null;
          dp_usuario_id?: string | null;
          dp_aprovado_em?: string | null;
          fiscal_usuario_id?: string | null;
          fiscal_enviado_em?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          ano?: number;
          trimestre?: number;
          lucro_mes1?: number;
          lucro_mes2?: number;
          lucro_mes3?: number;
          status?: string;
          contabil_usuario_id?: string | null;
          contabil_preenchido_em?: string | null;
          dp_usuario_id?: string | null;
          dp_aprovado_em?: string | null;
          fiscal_usuario_id?: string | null;
          fiscal_enviado_em?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reinf_entries_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
