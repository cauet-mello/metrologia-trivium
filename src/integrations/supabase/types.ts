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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      alteracoes: {
        Row: {
          anterior: string | null
          created_at: string
          id: number
          inspetor: string
          novo: string | null
          observacoes: string | null
          perfil: string
          registro_id: number | null
          status_anterior: string | null
          status_novo: string | null
          tipo: string
        }
        Insert: {
          anterior?: string | null
          created_at?: string
          id?: number
          inspetor: string
          novo?: string | null
          observacoes?: string | null
          perfil?: string
          registro_id?: number | null
          status_anterior?: string | null
          status_novo?: string | null
          tipo: string
        }
        Update: {
          anterior?: string | null
          created_at?: string
          id?: number
          inspetor?: string
          novo?: string | null
          observacoes?: string | null
          perfil?: string
          registro_id?: number | null
          status_anterior?: string | null
          status_novo?: string | null
          tipo?: string
        }
        Relationships: []
      }
      celulas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string | null
          numero: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string | null
          numero: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string | null
          numero?: number
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          valor: string | null
        }
        Insert: {
          chave: string
          valor?: string | null
        }
        Update: {
          chave?: string
          valor?: string | null
        }
        Relationships: []
      }
      escala_horarios: {
        Row: {
          celulas: number[]
          escala: string
          fim: string
          id: string
          inicio: string
          turno: string
        }
        Insert: {
          celulas?: number[]
          escala: string
          fim: string
          id?: string
          inicio: string
          turno: string
        }
        Update: {
          celulas?: number[]
          escala?: string
          fim?: string
          id?: string
          inicio?: string
          turno?: string
        }
        Relationships: []
      }
      inspetores: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          senha_hash: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          senha_hash: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          senha_hash?: string
        }
        Relationships: []
      }
      modelos: {
        Row: {
          ativo: boolean
          codigo: number
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          codigo: number
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          codigo?: number
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      operacoes: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      operadores: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      registros: {
        Row: {
          atraso: boolean
          atraso_confirmado: boolean
          atraso_confirmado_em: string | null
          celula: number
          created_at: string
          fila: string | null
          hora_entrada: string
          hora_saida: string | null
          id: number
          modelo: string
          modelo_codigo: number | null
          observacoes: string | null
          operacao: string
          operador: string
          status: string
          turno: string
        }
        Insert: {
          atraso?: boolean
          atraso_confirmado?: boolean
          atraso_confirmado_em?: string | null
          celula: number
          created_at?: string
          fila?: string | null
          hora_entrada?: string
          hora_saida?: string | null
          id?: number
          modelo: string
          modelo_codigo?: number | null
          observacoes?: string | null
          operacao: string
          operador: string
          status: string
          turno: string
        }
        Update: {
          atraso?: boolean
          atraso_confirmado?: boolean
          atraso_confirmado_em?: string | null
          celula?: number
          created_at?: string
          fila?: string | null
          hora_entrada?: string
          hora_saida?: string | null
          id?: number
          modelo?: string
          modelo_codigo?: number | null
          observacoes?: string | null
          operacao?: string
          operador?: string
          status?: string
          turno?: string
        }
        Relationships: []
      }
      status_opcoes: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      turnos: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fechar_ferrolho: {
        Args: {
          p_atraso?: boolean
          p_id: number
          p_inspetor: string
          p_observacoes?: string
        }
        Returns: undefined
      }
      lancamento_em_atraso: {
        Args: { p_celula: number; p_hora?: string }
        Returns: boolean
      }
      lancar_ferrolho: {
        Args: { p_confirmado?: boolean; p_dados: Json }
        Returns: Json
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
